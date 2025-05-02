const pool = require("./pool"); 
const promisePool = pool.promise();

async function getAllItems() {

  console.log("[getAllItems] Fetching all items with owner Firebase UID...");
  try {
    // includes items even if owner_id is NULL or doesn't match a user
    const query = `
            SELECT
                i.*,
                u.firebase_uid AS ownerFirebaseUid
            FROM items i
            LEFT JOIN users u ON i.owner_id = u.id
        `;
    const [rows] = await promisePool.query(query);
    console.log(`[getAllItems] Found ${rows.length} items.`);
    return rows;
  } catch (err) {
    console.error("Error in getAllItems:", err);
    throw err; 
  }
}

async function getItemsByOwner(userId) {

  console.log(`[getItemsByOwner] Fetching items for owner_id: ${userId} (Type: ${typeof userId})`);
  if (userId === null || userId === undefined) {
      console.error("[getItemsByOwner] Received null or undefined userId");
      return []; // Returns empty array if userId is invalid (this is for something in the frontend)
  }
  try {
    const numericUserId = Number(userId);
    if (isNaN(numericUserId)) {
        console.error(`[getItemsByOwner] Invalid userId after conversion: ${userId}`);
        return [];
    }

    const query = `
            SELECT
                i.*,
                u.firebase_uid AS ownerFirebaseUid
            FROM items i
            LEFT JOIN users u ON i.owner_id = u.id
            WHERE i.owner_id = ?
        `;
    const [rows] = await promisePool.query(query, [numericUserId]);
    console.log(`[getItemsByOwner] Found ${rows.length} items for owner_id: ${numericUserId}`);
    return rows;
  } catch (err) {
    console.error(`[getItemsByOwner] Error fetching items for owner_id ${userId}:`, err);
    throw err;
  }
}

async function getItemById(id) {
  console.log(`[getItemById] Fetching item with id: ${id}`);
  if (id === null || id === undefined) {
      console.error("[getItemById] Received null or undefined id");
      return null;
  }
  try {
    const numericId = Number(id);
     if (isNaN(numericId)) {
        console.error(`[getItemById] Invalid id after conversion: ${id}`);
        return null;
    }
    const query = `
            SELECT
                i.*,
                u.firebase_uid AS ownerFirebaseUid
            FROM items i
            LEFT JOIN users u ON i.owner_id = u.id
            WHERE i.id = ?
        `;
    const [rows] = await promisePool.query(query, [numericId]);
    console.log(`[getItemById] Found ${rows.length} item(s) for id: ${numericId}`);
    return rows[0] || null; 
  } catch (err) {
    console.error(`[getItemById] Error fetching item for id ${id}:`, err);
    throw err;
  }
}

async function getItemByName(name) {
  try {
     const query = `
            SELECT
                i.*,
                u.firebase_uid AS ownerFirebaseUid
            FROM items i
            LEFT JOIN users u ON i.owner_id = u.id
            WHERE i.name = ?
        `;
    const [rows] = await promisePool.query(query, [name]);
    return rows;
  } catch (err) {
     console.error(`[getItemByName] Error fetching item for name ${name}:`, err);
    throw err;
  }
}

async function createItem({ name, description, image_url, hidden_value, item_type, owner_id }) {
  try {
    const numericHiddenValue = Number(hidden_value);
    const numericOwnerId = Number(owner_id);

    if (isNaN(numericHiddenValue) || isNaN(numericOwnerId)) {
        console.error("[createItem] Invalid numeric value for hidden_value or owner_id");
        throw new Error("Invalid data for creating item.");
    }

    const [result] = await promisePool.query(
      "INSERT INTO items (name, description, image_url, hidden_value, item_type, owner_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description, image_url, numericHiddenValue, item_type, numericOwnerId]
    );
    return result.insertId;
  } catch (err) {
    console.error("[createItem] Error:", err);
    throw err;
  }
}

async function updateItemOwner(itemId, newOwnerId) {
    console.log(`[updateItemOwner] Updating item ${itemId} to owner ${newOwnerId}`);
   if (itemId === null || itemId === undefined || newOwnerId === null || newOwnerId === undefined) {
      console.error("[updateItemOwner] Received null or undefined itemId or newOwnerId");
      return 0; 
  }
  try {
    const numericItemId = Number(itemId);
    const numericNewOwnerId = Number(newOwnerId);
     if (isNaN(numericItemId) || isNaN(numericNewOwnerId)) {
        console.error(`[updateItemOwner] Invalid id after conversion: itemId=${itemId}, newOwnerId=${newOwnerId}`);
        return 0;
    }
    const [result] = await promisePool.query(
      "UPDATE items SET owner_id = ? WHERE id = ?",
      [numericNewOwnerId, numericItemId]
    );
    console.log(`[updateItemOwner] Affected rows: ${result.affectedRows}`);
    return result.affectedRows;
  } catch (err) {
     console.error(`[updateItemOwner] Error updating owner for item ${itemId}:`, err);
    throw err;
  }
}

module.exports = {
  getAllItems,
  getItemsByOwner,
  getItemById,
  getItemByName,
  createItem,
  updateItemOwner,
};
