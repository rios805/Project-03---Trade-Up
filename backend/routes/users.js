const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware"); // Verifies Firebase token
const { findOrCreateUser } = require("../services/userService");

// POST /api/users/me
router.post("/me", authenticate, async (req, res) => {
  try {
    const firebaseUser = req.user; // From Firebase Admin SDK
    const { username } = req.body; 

    const dbUser = await findOrCreateUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: username
    });

    res.json(dbUser);
  } catch (err) {
    console.error("Error in /me route:", err);
    res.status(500).json({ error: "Failed to fetch or create user" });
  }
});

module.exports = router;
