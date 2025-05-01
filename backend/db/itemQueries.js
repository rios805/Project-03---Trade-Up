const pool = require("./pool");

async function getAllItems() {
  const [rows] = await pool.query("SELECT * FROM items");
  return rows;
}

async function getItemsByOwner(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM items WHERE owner_id = ?",
    [userId]
  );
  return rows;
}

async function getItemById(id) {
  const [rows] = await pool.promise().query(
    "SELECT * FROM items WHERE id = ?",
    [id]
  );
  return rows[0]; 
}

async function getItemByName(name) {
  const [rows] = await pool.promise().query(
    "SELECT * FROM items WHERE name = ?",
    [name]
  );
  return rows;
}

async function createItem({ name, description, image_url, hidden_value, item_type, owner_id }) {
  const [result] = await pool.query(
    "INSERT INTO items (name, description, image_url, hidden_value, item_type, owner_id) VALUES (?, ?, ?, ?, ?, ?)",
    [name, description, image_url, hidden_value, item_type, owner_id]
  );
  return result.insertId;
}

async function updateItemOwner(itemId, newOwnerId) {
  const [result] = await pool.query(
    "UPDATE items SET owner_id = ? WHERE id = ?",
    [newOwnerId, itemId]
  );
  return result.affectedRows;
}

module.exports = {
  getAllItems,
  getItemsByOwner,
  getItemById,
  getItemByName,
  createItem,
  updateItemOwner
};
