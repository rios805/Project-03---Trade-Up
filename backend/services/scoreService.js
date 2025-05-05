const pool = require("../db/pool");
const { getItemsByOwner } = require("../db/itemQueries");
const { updateTradeCredit } = require("./userService");
const { getUserDailyChallenge } = require("../db/challengeQueries");

async function initializeDailyScore(userId) {
	const today = new Date().toISOString().split("T")[0];
	const items = await getItemsByOwner(userId);
	const baseScore = items.reduce((total, item) => total + item.hidden_value, 0);

	// Only insert once — don't overwrite if it already exists
	await pool.query(
		"INSERT INTO daily_scores (user_id, score_date, base_score) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE base_score = base_score",
		[userId, today, baseScore]
	);
}

async function finalizeDailyScore(userId) {
	const today = new Date().toISOString().split("T")[0];
	const items = await getItemsByOwner(userId);

	// Calculate starting item value — used only to derive bonus
	const [[row]] = await pool.query(
		"SELECT base_score FROM daily_scores WHERE user_id = ? AND score_date = ?",
		[userId, today]
	);

	if (!row) return null;

	const baseScore = row.base_score;

	// Include challenge bonus (calculated from base score)
	const challenge = await getUserDailyChallenge(userId);
	let bonusFromChallenge = 0;

	if (challenge?.is_completed && challenge?.bonus_percent) {
		bonusFromChallenge = Math.floor(baseScore * (challenge.bonus_percent / 100));
	}

	const finalScore = baseScore + bonusFromChallenge;

	// Earned credit = for every 25% increase from base
	// Earned currency = 25% of profit (final - base)
	const profit = finalScore - baseScore;
	const earnedCredit = Math.max(0, Math.floor(profit * 0.25));

	await pool.query(
		`UPDATE daily_scores 
		 SET final_score = ?, bonus_score = ?, earned_trade_credit = ? 
		 WHERE user_id = ? AND score_date = ?`,
		[finalScore, bonusFromChallenge, earnedCredit, userId, today]
	);

	await updateTradeCredit(userId, earnedCredit);

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
