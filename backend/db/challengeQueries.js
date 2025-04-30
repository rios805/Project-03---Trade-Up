const pool = require("./pool");

//This is to get all available challenges
async function getAllChallenges() {
	const [rows] = await pool.query("SELECT * FROM challenges");
	return rows;
}

//This as the name suggests is to get a random challenge
async function getRandomChallenge() {
	const [rows] = await pool.promise().query("SELECT * FROM challenges ORDER BY RAND() LIMIT 1");
	return rows[0];
}

//This is to assign a challenge to a user
async function assignChallengeToUser(userId, challengeId) {
	//This is in YYYY-MM-DD format (Maybe we should change this, idk)
	const today = new Date().toISOString().split("T")[0];

	try {
		await pool.promise().query("INSERT INTO user_challenges (user_id, challenge_id, date_assigned, is_completed) VALUES (?, ?, ?, ?)", [userId, challengeId, today, 0]);
		return true;
	} catch (error) {
		console.error("Error assigning challenge:", error);
		return false;
	}
}

//This is to mark a user's challenge as completed
async function completeChallenge(userChallengeId) {
	await pool.promise().query("UPDATE user_challenges SET is_completed = 1 WHERE id = ?", [userChallengeId]);
}



async function getUserDailyChallenge(userId) {
    // Same idea as earlier (YYYY-MM-DD) format
    const today = new Date().toISOString().split("T")[0]; 
    
    const [rows] = await pool.promise().query(
      `SELECT uc.id, uc.is_completed, c.description, c.type, c.bonus_percent 
       FROM user_challenges uc
       JOIN challenges c ON uc.challenge_id = c.id
       WHERE uc.user_id = ? AND uc.date_assigned = ?`,
      [userId, today]
    );
    
    return rows[0] || null;
  }
  
  module.exports = {
    getAllChallenges,
    getRandomChallenge,
    assignChallengeToUser,
    completeChallenge,
    getUserDailyChallenge
  };


