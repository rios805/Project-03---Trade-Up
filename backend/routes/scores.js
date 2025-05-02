const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { initializeDailyScore, finalizeDailyScore } = require("../services/scoreService");

// POST /api/scores/init – Record the user's starting item value
router.post("/init", authenticate, async (req, res) => {
	try {
		const userId = req.user.uid;
		await initializeDailyScore(userId);
		res.status(201).json({ message: "Daily base score initialized" });
	} catch (err) {
		console.error("Error initializing score:", err);
		res.status(500).json({ error: "Failed to initialize base score" });
	}
});

// POST /api/scores/finalize – Finalize score, calculate bonus, update credit
router.post("/finalize", authenticate, async (req, res) => {
	try {
		const userId = req.user.uid;
		const result = await finalizeDailyScore(userId);

		if (!result) {
			return res.status(404).json({ error: "No base score found for today" });
		}

		res.json({
			message: `Score finalized. +${result.earnedCredit} trade credit earned.`,
			score: result
		});
	} catch (err) {
		console.error("Error finalizing score:", err);
		res.status(500).json({ error: "Failed to finalize score" });
	}
});

module.exports = router;
