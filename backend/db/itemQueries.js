const pool = require("./pool");

async function getAllItems() {
  const [rows] = await pool.promise().query("SELECT * FROM items");
  return rows;
}

async function getItemsByOwner(userId) {
  const [rows] = await pool.promise().query(
    "SELECT * FROM items WHERE owner_id = ?",
    [userId]
  );
  return rows;
}

async function createItem({ name, description, image_url, hidden_value, item_type, owner_id }) {
  const [result] = await pool.promise().query(
    "INSERT INTO items (name, description, image_url, hidden_value, item_type, owner_id) VALUES (?, ?, ?, ?, ?, ?)",
    [name, description, image_url, hidden_value, item_type, owner_id]
  );
  return result.insertId;
}

module.exports = {
  getAllItems,
  getItemsByOwner,
  createItem
};
