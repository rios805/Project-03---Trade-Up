const pool = require("./pool");

//This is to get all available challenges
async function getAllChallenges() {
	const [rows] = await pool.query("SELECT * FROM challenges");
	return rows;
}

//This as the name suggests is to get a random challenge
async function getRandomChallenge() {
	console.log("[DB getRandomChallenge] Fetching random challenge...");
	const [rows] = await pool.promise().query("SELECT * FROM challenges ORDER BY RAND() LIMIT 1");
	if (rows.length === 0) {
		console.warn("[DB getRandomChallenge] No challenges found in the database.");
	} else {
		console.log(`[DB getRandomChallenge] Found challenge: ID ${rows[0].id}`);
	}
	return rows[0];
}

//This is to assign a challenge to a user
async function assignChallengeToUser(userId, challengeId) {
	//This is in YYYY-MM-DD format (Maybe we should change this, idk)
	const today = new Date().toISOString().split("T")[0];

	if (typeof userId !== "number" || isNaN(userId) || userId <= 0) {
		console.error(`[DB assignChallengeToUser] Invalid userId: ${userId} (Type: ${typeof userId})`);
		return false;
	}
	if (typeof challengeId !== "number" || isNaN(challengeId) || challengeId <= 0) {
		console.error(`[DB assignChallengeToUser] Invalid challengeId: ${challengeId} (Type: ${typeof challengeId})`);
		return false;
	}
	console.log(`[DB assignChallengeToUser] Attempting to assign challenge ${challengeId} to user ${userId} for date ${today}`);

	try {
		const [result] = await pool.promise().query("INSERT INTO user_challenges (user_id, challenge_id, date_assigned, is_completed) VALUES (?, ?, ?, ?)", [userId, challengeId, today, 0]);
		console.log(`[DB assignChallengeToUser] Assignment successful. Insert ID: ${result.insertId}`);
		return true;
	} catch (error) {
		console.error(`[DB assignChallengeToUser] Error assigning challenge ${challengeId} to user ${userId}:`, error.code, error.message);
		return false;
	}
}

//This is to mark a user's challenge as completed
async function completeChallenge(userChallengeId) {
	if (typeof userChallengeId !== "number" || isNaN(userChallengeId) || userChallengeId <= 0) {
		console.error(`[DB completeChallenge] Invalid userChallengeId: ${userChallengeId}`);
		throw new Error(`Invalid user challenge ID: ${userChallengeId}`);
	}
	console.log(`[DB completeChallenge] Marking user_challenge ID ${userChallengeId} as completed.`);
	const [result] = await pool.promise().query("UPDATE user_challenges SET is_completed = 1 WHERE id = ?", [userChallengeId]);
	console.log(`[DB completeChallenge] Update result for ID ${userChallengeId}: Affected rows: ${result.affectedRows}`);
}

// Fetches the specific user_challenge entry for today
async function getUserDailyChallenge(userId) {
	const today = new Date().toISOString().split("T")[0];

	if (typeof userId !== "number" || isNaN(userId) || userId <= 0) {
		console.error(`[DB getUserDailyChallenge] Invalid userId: ${userId} (Type: ${typeof userId})`);
		return null;
	}
	console.log(`[DB getUserDailyChallenge] Fetching challenge for user ${userId} on date ${today}`);

	const [rows] = await pool.promise().query(
		`SELECT
         uc.id,              
         uc.is_completed,
         c.description,      
         c.type,             
         c.bonus_percent     
       FROM user_challenges uc
       JOIN challenges c ON uc.challenge_id = c.id
       WHERE uc.user_id = ? AND uc.date_assigned = ?`,
		[userId, today]
	);

	if (rows.length > 0) {
		console.log(`[DB getUserDailyChallenge] Found challenge for user ${userId}: ID ${rows[0].id}`);
	} else {
		console.log(`[DB getUserDailyChallenge] No challenge found for user ${userId} today.`);
	}

	return rows[0] || null;
}

module.exports = {
	getAllChallenges,
	getRandomChallenge,
	assignChallengeToUser,
	completeChallenge,
	getUserDailyChallenge,
};
