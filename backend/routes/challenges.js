const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { getAllChallenges, getRandomChallenge, assignChallengeToUser, completeChallenge, getUserDailyChallenge } = require("../db/challengeQueries");
const { updateTradeCredit } = require("../services/userService");


// GET /api/challenges/all - Get all challenges (This should probably be only for admins or something)
router.get("/all", authenticate, async (req, res) => {
	try {
		const challenges = await getAllChallenges();
		res.json({ challenges });
	} catch (err) {
		console.error("Error fetching challenges:", err);
		res.status(500).json({ error: "Failed to fetch challenges" });
	}
});

// GET /api/challenges/daily - This is to get the user's current daily challenge
router.get("/daily", authenticate, async (req, res) => {
	try {
		const userId = req.user.uid;
		const userChallenge = await getUserDailyChallenge(userId);

		if (!userChallenge) {
			// If user doesn't have a challenge today, then they need to get assigned one.
			const challenge = await getRandomChallenge();
			const assigned = await assignChallengeToUser(userId, challenge.id);

			if (assigned) {
				const newUserChallenge = await getUserDailyChallenge(userId);
				res.json({ challenge: newUserChallenge });
			} else {
				throw new Error("Failed to assign challenge");
			}
		} else {
			res.json({ challenge: userChallenge });
		}
	} catch (err) {
		console.error("Error with daily challenge:", err);
		res.status(500).json({ error: "Failed to retrieve or assign daily challenge" });
	}
});

// POST /api/challenges/:challengeId/complete - Mark a challenge as complete
router.post("/:challengeId/complete", authenticate, async (req, res) => {
	try {
		const { challengeId } = req.params;
		await completeChallenge(challengeId);

		// After completing a challenge, we might want to award bonus credit
		// Leaving thhis here incase we want to implement it later
		// This would connect to userService to update trade credit

		res.json({
			message: "Challenge completed successfully",
			challengeId,
		});
	} catch (err) {
		console.error("Error completing challenge:", err);
		res.status(500).json({ error: "Failed to complete challenge" });
	}
});

module.exports = router;
