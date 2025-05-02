const pool = require("./pool");

async function getAllItems() {
  return new Promise((resolve, reject) => {
    pool.query("SELECT * FROM items", (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function getItemsByOwner(userId) {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT * FROM items WHERE owner_id = ?",
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
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
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO items (name, description, image_url, hidden_value, item_type, owner_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description, image_url, hidden_value, item_type, owner_id],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      }
    );
  });
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