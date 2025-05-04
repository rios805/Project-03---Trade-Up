const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const pool = require("../db/pool").promise();
const { getAllChallenges, getRandomChallenge, assignChallengeToUser, completeChallenge, getUserDailyChallenge } = require("../db/challengeQueries");
const { updateTradeCredit } = require("../services/userService");

// --- Helper Function --- (you can mmove this to a separate file if needed, just don't forget to import it otherwise it might break the code)
// Fetches the internal integer user ID from the database using the Firebase UID.
async function getUserIdFromFirebaseUid(firebaseUid) {
	if (!firebaseUid || typeof firebaseUid !== "string" || firebaseUid.trim() === "" || firebaseUid === "undefined") {
		console.error(`[Helper challenges.js] Invalid or missing Firebase UID received: ${firebaseUid}`);
		return null;
	}
	console.log(`[Helper challenges.js] Looking up user ID for Firebase UID: ${firebaseUid}`);
	try {
		const [userRows] = await pool.query("SELECT id FROM users WHERE firebase_uid = ?", [firebaseUid]);
		if (userRows.length > 0) {
			const userId = userRows[0].id;
			console.log(`[Helper challenges.js] Returning user ID: ${userId} (Type: ${typeof userId})`);
			return typeof userId === "number" ? userId : null;
		} else {
			console.warn(`[Helper challenges.js] No user found for UID: ${firebaseUid}`);
			return null;
		}
	} catch (dbError) {
		console.error(`[Helper challenges.js] Database error looking up UID ${firebaseUid}:`, dbError);
		return null;
	}
}

// GET /api/challenges/all - Get all challenges (Admin/Debug)
router.get("/all", authenticate, async (req, res) => {
	try {
		const challenges = await getAllChallenges();
		res.json({ challenges });
	} catch (err) {
		console.error("Error fetching all challenges:", err);
		res.status(500).json({ error: "Failed to fetch challenges" });
	}
});

// GET /api/challenges/daily - this iis to get the user's current daily challenge
router.get("/daily", authenticate, async (req, res) => {
	try {
		const firebaseUid = req.user.uid; // Get Firebase UID from authenticated request
		console.log(`[GET /daily] Request for user UID: ${firebaseUid}`);

		const internalUserId = await getUserIdFromFirebaseUid(firebaseUid);

		if (!internalUserId) {
			console.error(`[GET /daily] Could not find internal user ID for Firebase UID: ${firebaseUid}`);
			return res.status(404).json({ error: "User not found in application database." });
		}
		console.log(`[GET /daily] Found internal user ID: ${internalUserId}`);

		let userChallenge = await getUserDailyChallenge(internalUserId);

		if (!userChallenge) {
			console.log(`[GET /daily] No challenge found for user ${internalUserId} today. Assigning a new one.`);
			const challengeToAssign = await getRandomChallenge();

			if (!challengeToAssign || typeof challengeToAssign.id === "undefined") {
				console.error("[GET /daily] Failed to get a random challenge from the database. Is the 'challenges' table populated?");
				throw new Error("Could not retrieve a challenge to assign.");
			}
			console.log(`[GET /daily] Found random challenge to assign: ID ${challengeToAssign.id}`);

			const assigned = await assignChallengeToUser(internalUserId, challengeToAssign.id);

			if (assigned) {
				console.log(`[GET /daily] Successfully assigned challenge ${challengeToAssign.id} to user ${internalUserId}. Fetching again.`);
				userChallenge = await getUserDailyChallenge(internalUserId);
				if (!userChallenge) {
					console.error(`[GET /daily] Assigned challenge but could not retrieve it immediately for user ${internalUserId}.`);
					throw new Error("Failed to retrieve the newly assigned challenge.");
				}
				res.json({ challenge: userChallenge });
			} else {
				console.error(`[GET /daily] Failed to assign challenge ${challengeToAssign.id} to user ${internalUserId}.`);
				throw new Error("Failed to assign challenge in the database.");
			}
		} else {
			console.log(`[GET /daily] Found existing challenge for user ${internalUserId}:`, userChallenge);
			res.json({ challenge: userChallenge });
		}
	} catch (err) {
		console.error("[GET /daily] Error processing daily challenge request:", err);
		res.status(500).json({ error: "Failed to retrieve or assign daily challenge due to a server error." });
	}
});

// POST /api/challenges/:userChallengeId/complete - Mark a challenge as complete
// NOTE: The ID here is the user_challenge ID, not the challenge template ID (I'm leaving this note here because I might forget it later)
router.post("/:userChallengeId/complete", authenticate, async (req, res) => {
	try {
		const { userChallengeId } = req.params;
		const numericUserChallengeId = Number(userChallengeId);

		if (isNaN(numericUserChallengeId)) {
			return res.status(400).json({ error: "Invalid challenge ID format." });
		}

		await completeChallenge(numericUserChallengeId);

		res.json({
			message: "Challenge completed successfully",
			userChallengeId: numericUserChallengeId,
		});
	} catch (err) {
		console.error(`Error completing user challenge ${req.params.userChallengeId}:`, err);
		res.status(500).json({ error: "Failed to complete challenge due to a server error." });
	}
});

module.exports = router;
