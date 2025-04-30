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


module.exports = {
  getUserById,
  getUserByEmail,
  createUser,
  getUserByFirebaseUid,
  updateUsernameByFirebaseUid
};

