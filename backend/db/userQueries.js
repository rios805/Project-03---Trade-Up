const pool = require("./pool");

async function getUserById(userId) {
  const [rows] = await pool.promise().query(
    "SELECT * FROM users WHERE id = ?",
    [userId]
  );
  return rows[0] || null;
}

async function getUserByEmail(email) {
  const [rows] = await pool.promise().query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  return rows[0] || null;
}

async function createUser(username, email, trade_credit = 0, firebase_uid) {
  await pool.promise().query(
    "INSERT INTO users (username, email, trade_credit, firebase_uid) VALUES (?, ?, ?, ?)",
    [username, email, trade_credit, firebase_uid]
  );
}

async function getUserByFirebaseUid(firebaseUid) {
  const [rows] = await pool.promise().query(
    "SELECT * FROM users WHERE firebase_uid = ?",
    [firebaseUid]
  );
  return rows[0] || null;
}

async function updateUsernameByFirebaseUid(firebaseUid, newUsername) {
  const [result] = await pool.promise().query(
    "UPDATE users SET username = ? WHERE firebase_uid = ?",
    [newUsername, firebaseUid]
  );
  return result.affectedRows;
}

async function getUserScoreById(firebaseUid) {
  const [rows] = await pool.promise().query(
    "			SELECT u.id AS user_id, u.username, COALESCE(SUM(i.hidden_value), 0) AS total_item_value, u.trade_credit, COALESCE(SUM(i.hidden_value), 0) + u.trade_credit AS total_asset_value FROM users u LEFT JOIN items i ON i.owner_id = u.id WHERE u.firebase_uid = ? GROUP BY u.id, u.username, u.trade_credit",
    [userId]
  );
  return rows[0] || null;
}


module.exports = {
  getUserById,
  getUserByEmail,
  createUser,
  getUserByFirebaseUid,
  updateUsernameByFirebaseUid
};

