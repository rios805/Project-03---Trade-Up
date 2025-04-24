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

async function createUser(id, username, email, trade_credit = 0) {
  await pool.promise().query(
    "INSERT INTO users (id, username, email, trade_credit) VALUES (?, ?, ?, ?)",
    [id, username, email, trade_credit]
  );
}

module.exports = {
  getUserById,
  getUserByEmail,
  createUser
};

