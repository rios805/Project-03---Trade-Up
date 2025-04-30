const pool = require("../db/pool");

/**
 * Finds a user by Firebase UID or creates them if not found.
 * @param {Object} firebaseUser - Contains uid, email, and name
 * @returns {Object} User record from DB
 */
async function findOrCreateUser(firebaseUser) {
  const { uid, email, name } = firebaseUser;

  // Check if user exists using the firebase_uid instead of id
  const [rows] = await pool.promise().query(
    "SELECT * FROM users WHERE firebase_uid = ?",
    [uid]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  // Create new user
  await pool.promise().query(
    "INSERT INTO users (username, email, trade_credit, firebase_uid) VALUES (?, ?, ?, ?)",
    [name, email, 0, uid]
  );

  return {
    firebase_uid: uid,
    username: name,
    email,
    trade_credit: 0
  };
}

/**
 * Updates a user's trade credit by amount (+/-)
 * @param {string} userId - Firebase UID
 * @param {number} delta - Amount to add/subtract
 * @returns {number} New credit balance
 */
async function updateTradeCredit(userId, delta) {
  await pool.promise().query(
    "UPDATE users SET trade_credit = trade_credit + ? WHERE id = ?",
    [delta, userId]
  );

  const [rows] = await pool.promise().query(
    "SELECT trade_credit FROM users WHERE id = ?",
    [userId]
  );

  return rows[0]?.trade_credit ?? null;
}

/**
 * Sets a user's trade credit to an exact value for testing purposes
 */
async function setTradeCredit(userId, newAmount) {
  await pool.promise().query(
    "UPDATE users SET trade_credit = ? WHERE id = ?",
    [newAmount, userId]
  );

  return newAmount;
}

module.exports = {
  findOrCreateUser,
  updateTradeCredit,
  setTradeCredit
};
