const pool = require("./pool");

async function createTrade({ item_offered_id, item_requested_id, requester_id, responder_id }) {
  const [result] = await pool.promise().query(
    "INSERT INTO trades (item_offered_id, item_requested_id, requester_id, responder_id, status) VALUES (?, ?, ?, ?, 'pending')",
    [item_offered_id, item_requested_id, requester_id, responder_id]
  );
  return result.insertId;
}

async function getTradesByUser(userId) {
  const [rows] = await pool.promise().query(
    "SELECT * FROM trades WHERE requester_id = ? OR responder_id = ?",
    [userId, userId]
  );
  return rows;
}

async function updateTradeStatus(tradeId, status) {
  await pool.promise().query(
    "UPDATE trades SET status = ? WHERE id = ?",
    [status, tradeId]
  );
}

module.exports = {
  createTrade,
  getTradesByUser,
  updateTradeStatus
};
