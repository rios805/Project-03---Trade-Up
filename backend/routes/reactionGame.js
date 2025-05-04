const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const pool = require("../db/pool").promise();
const { updateTradeCredit } = require("../services/userService");

async function getUserIdFromFirebaseUid(firebaseUid) {
    if (!firebaseUid || typeof firebaseUid !== 'string' || firebaseUid.trim() === '' || firebaseUid === 'undefined') {
		console.error(`[Helper reactionGame.js] Invalid or missing Firebase UID received: ${firebaseUid}`);
		return null;
	}
	console.log(`[Helper reactionGame.js] Looking up user ID for Firebase UID: ${firebaseUid}`);
	try {
		const [userRows] = await pool.query("SELECT id FROM users WHERE firebase_uid = ?", [firebaseUid]);
		if (userRows.length > 0) {
			const userId = userRows[0].id;
			console.log(`[Helper reactionGame.js] Returning user ID: ${userId} (Type: ${typeof userId})`);
			return typeof userId === 'number' ? userId : null;
		} else {
			console.warn(`[Helper reactionGame.js] No user found for UID: ${firebaseUid}`);
			return null;
		}
	} catch (dbError) {
		console.error(`[Helper reactionGame.js] Database error looking up UID ${firebaseUid}:`, dbError);
		return null;
	}
}

// These are constants for the game (i.e. how many points per hit, and the maximum reward. Can be changed without breaking the code)
const BASE_REWARD_PER_HIT = 5;
const MAX_REWARD = 100;


// GET /api/reaction-game/status - Check if the user can play today
router.get("/status", authenticate, async (req, res) => {
    try {
        const firebaseUid = req.user.uid;
		const userId = await getUserIdFromFirebaseUid(firebaseUid);

		if (!userId) {
			return res.status(404).json({ error: `User not found.` });
		}

        const today = new Date().toISOString().split("T")[0];

        const checkPlaySql = `
            SELECT id, score, reward_claimed FROM user_reaction_game_plays
            WHERE user_id = ? AND play_date = CURDATE()
            LIMIT 1
        `;
        console.log(`[reaction-game/status] Checking play status for user ${userId} on ${today}`);
        const [plays] = await pool.query(checkPlaySql, [userId]);

        if (plays.length > 0) {
            const playData = plays[0];
            console.log(`[reaction-game/status] User ${userId} has already played today. Score: ${playData.score}, Reward: ${playData.reward_claimed}`);
            return res.status(200).json({
                canPlay: false,
                message: "Already played today.",
                score: playData.score,
                reward: playData.reward_claimed
             });
        } else {
            console.log(`[reaction-game/status] User ${userId} can play today.`);
            return res.status(200).json({ canPlay: true, message: "Ready to play!" });
        }

    } catch (err) {
        console.error("[reaction-game/status] Error checking status:", err);
		res.status(500).json({ error: "Failed to check game status." });
    }
});

// POST /api/reaction-game/claim - Record score and grant reward 
router.post("/claim", authenticate, async (req, res) => {
    const { score } = req.body;
    let connection;

    if (typeof score !== 'number' || isNaN(score) || score < 0 || !Number.isInteger(score)) {
        return res.status(400).json({ error: "Invalid score provided." });
    }

	try {
        connection = await pool.getConnection(); 
        await connection.beginTransaction();
		const firebaseUid = req.user.uid;
		const userId = await getUserIdFromFirebaseUid(firebaseUid);

		if (!userId) {
            await connection.rollback();
			await connection.release();
			return res.status(404).json({ error: `User not found.` });
		}

         const checkPlaySql = `
            SELECT id FROM user_reaction_game_plays
            WHERE user_id = ? AND play_date = CURDATE()
            FOR UPDATE
        `;
        console.log(`[reaction-game/claim] Checking play status for user ${userId}`);
        const [plays] = await connection.query(checkPlaySql, [userId]);

        if (plays.length > 0) {
            console.warn(`[reaction-game/claim] User ${userId} tried to claim reward after already playing today.`);
            await connection.commit(); 
            await connection.release();
            const [existingPlay] = await pool.query("SELECT score, reward_claimed FROM user_reaction_game_plays WHERE id = ?", [plays[0].id]);
            const [currentUser] = await pool.query("SELECT trade_credit FROM users WHERE id = ?", [userId]);
            return res.status(409).json({
                error: "Reward already claimed for today.",
                score: existingPlay[0]?.score || 0,
                reward: existingPlay[0]?.reward_claimed || 0,
                newBalance: currentUser[0]?.trade_credit
            });
        }

        let calculatedReward = score * BASE_REWARD_PER_HIT;
        calculatedReward = Math.min(calculatedReward, MAX_REWARD);
        console.log(`[reaction-game/claim] User ${userId} scored ${score}. Calculated reward: ${calculatedReward}`);

        console.log(`[reaction-game/claim] Recording play for user ${userId} with score ${score} and reward ${calculatedReward}`);
        const recordPlaySql = `
            INSERT INTO user_reaction_game_plays (user_id, play_date, score, reward_claimed)
            VALUES (?, CURDATE(), ?, ?)
        `;
        await connection.query(recordPlaySql, [userId, score, calculatedReward]);

        let finalBalance = null;
        let creditUpdateError = null; 
        if (calculatedReward > 0) {
            console.log(`[reaction-game/claim] Calling updateTradeCredit for user ${userId} with amount ${calculatedReward}`);
            try {
                finalBalance = await updateTradeCredit(userId, calculatedReward, connection);
                console.log(`[reaction-game/claim] updateTradeCredit returned: ${finalBalance}`);

                if (finalBalance === null || typeof finalBalance === 'undefined') {
                    console.error(`[reaction-game/claim] updateTradeCredit returned null/undefined for user ${userId}.`);
                    creditUpdateError = `Failed to update trade credit for user ${userId}.`;
                }
            } catch (updateErr) {
                 console.error(`[reaction-game/claim] Error during updateTradeCredit for user ${userId}:`, updateErr);
                 creditUpdateError = `Failed to update trade credit: ${updateErr.message || 'Unknown error'}`;
            }

        } else {
            console.log(`[reaction-game/claim] Score was 0, no credits awarded.`);
             const [balanceResult] = await connection.query("SELECT trade_credit FROM users WHERE id = ?", [userId]);
             finalBalance = balanceResult[0]?.trade_credit;
        }

        await connection.commit(); 

        const responsePayload = {
			message: creditUpdateError 
                ? `Score saved, but reward grant failed: ${creditUpdateError}`
                : (score > 0 ? `Good job! You scored ${score} and earned ${calculatedReward} Trade Credits!` : `You scored ${score}. Better luck next time!`),
            score: score,
            reward: creditUpdateError ? 0 : calculatedReward,
            newBalance: finalBalance, 
            error: creditUpdateError 
		};
        console.log(`[reaction-game/claim] Sending response payload:`, responsePayload);
		res.status(200).json(responsePayload);

	} catch (err) {
		console.error("[reaction-game/claim] Error processing claim transaction:", err);
        if (connection) await connection.rollback();
		res.status(500).json({ error: "Failed to claim reward due to a server error." });
	} finally {
         if (connection) await connection.release();
    }
});


module.exports = router;
