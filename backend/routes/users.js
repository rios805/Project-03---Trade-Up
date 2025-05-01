const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { getUserByFirebaseUid, updateUsernameByFirebaseUid, createUser } = require("../db/userQueries");
const { findOrCreateUser } = require("../services/userService");

// POST /api/users/me
router.post("/me", authenticate, async (req, res) => {
	try {
		const firebaseUser = req.user; // From Firebase Admin SDK
		const { username } = req.body;

		const dbUser = await findOrCreateUser({
			uid: firebaseUser.uid,
			email: firebaseUser.email,
			name: username,
		});

		res.json(dbUser);
	} catch (err) {
		console.error("Error in /me route:", err);
		res.status(500).json({ error: "Failed to fetch or create user" });
	}
});

// GET /api/users/info
router.get("/info", authenticate, async (req, res) => {
	try {
		const firebaseUser = req.user;
		const user = await getUserByFirebaseUid(firebaseUser.uid);
		res.json(user);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to get user info" });
	}
});

// PUT /api/users/update
router.put("/update", authenticate, async (req, res) => {
	const { username } = req.body;
	const firebaseUid = req.user.uid;

	if (!username) {
		return res.status(400).json({ error: "Username is required" });
	}

	try {
		const updated = await updateUsernameByFirebaseUid(firebaseUid, username);

		if (updated === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json({ message: "Username updated successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to update user" });
	}
});

module.exports = router;
