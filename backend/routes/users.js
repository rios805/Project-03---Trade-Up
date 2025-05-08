const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { getUserByFirebaseUid, updateUsernameByFirebaseUid, createUser } = require("../db/userQueries");
const { findOrCreateUser } = require("../services/userService");
const pool = require("../db/pool").promise();

// GET /api/users/all - Retrieve all users from the database
router.get("/all",  async (req, res) => {
	console.log("Received request for GET /api/users/all");
	try {
		const sql = `SELECT id, username, email, trade_credit, firebase_uid FROM users`;

		const [rows] = await pool.query(sql);

		console.log(`Found ${rows.length} users.`);
		res.json(rows);
	} catch (err) {
		console.error("Error fetching all users:", err);
		res.status(500).json({ error: "Failed to fetch users" });
	}
});


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

// GET /api/users/leaderboard - Get total item value + trade credit for current user
router.get("/leaderboard", async (req, res) => {
	try {
		const [rows] = await pool.query(`
			SELECT 
				u.id AS user_id,
				u.username,
				COALESCE(SUM(i.hidden_value), 0) AS total_item_value,
				u.trade_credit,
				COALESCE(SUM(i.hidden_value), 0) + u.trade_credit AS total_score
			FROM users u
			LEFT JOIN items i ON u.id = i.owner_id
			GROUP BY u.id
			ORDER BY total_score DESC
			LIMIT 10;
		`);

		res.json(rows);
	} catch (err) {
		console.error("Error fetching leaderboard:", err);
		res.status(500).json({ error: "Failed to fetch leaderboard" });
	}
});


module.exports = router;
