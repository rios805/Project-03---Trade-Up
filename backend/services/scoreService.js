const pool = require("../db/pool").promise();
const { getItemsByOwner } = require("../db/itemQueries");
const { updateTradeCredit } = require("./userService");
const { getUserDailyChallenge } = require("../db/challengeQueries");

async function initializeDailyScore(userId) {
	const today = new Date().toISOString().split("T")[0];
	const items = await getItemsByOwner(userId);
	const [[user]] = await pool.query("SELECT trade_credit FROM users WHERE id = ?", [userId]);

	const itemValue = items.reduce((total, item) => total + item.hidden_value, 0);
	const tradeCredit = user?.trade_credit || 0;
	const baseScore = itemValue + tradeCredit;

	await pool.query(
		"INSERT INTO daily_scores (user_id, score_date, base_score) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE base_score = base_score",
		[userId, today, baseScore]
	);
}

async function finalizeDailyScore(userId) {
	const today = new Date().toISOString().split("T")[0];
	const items = await getItemsByOwner(userId);

	const [[scoreRow]] = await pool.query(
		"SELECT base_score FROM daily_scores WHERE user_id = ? AND DATE(score_date) = ?",
		[userId, today]
	);

	if (!scoreRow) return null;

	const baseScore = scoreRow.base_score;
	const [[user]] = await pool.query("SELECT trade_credit FROM users WHERE id = ?", [userId]);
	const tradeCredit = user?.trade_credit || 0;

	const itemValueNow = items.reduce((total, item) => total + item.hidden_value, 0);

	const challenge = await getUserDailyChallenge(userId);
	let bonusFromChallenge = 0;

	if (challenge?.is_completed && challenge?.bonus_percent) {
		bonusFromChallenge = Math.floor(baseScore * (challenge.bonus_percent / 100));
	}

	const finalScore = itemValueNow + tradeCredit + bonusFromChallenge;
	const profit = finalScore - baseScore;
	const earnedCredit = Math.max(0, Math.floor(profit * 0.25));

	// Write to users table
	const [userUpdate] = await pool.query(
	"UPDATE users SET trade_credit = ? WHERE id = ?",
	[earnedCredit, userId]
	);

	if (userUpdate.affectedRows === 0) {
	console.warn(`[Finalize] No user row updated for user ${userId}`);
	}

	await pool.query(
	`UPDATE daily_scores 
	SET final_score = ?, bonus_score = ?, earned_trade_credit = ? 
	WHERE user_id = ? AND DATE(score_date) = ?`,
	[finalScore, bonusFromChallenge, earnedCredit, userId, today]
	);

	return {
		base_score: baseScore,
		final_score: finalScore,
		challenge_bonus: bonusFromChallenge,
		earned_credit: earnedCredit
	};
}

module.exports = {
	initializeDailyScore,
	finalizeDailyScore
};
