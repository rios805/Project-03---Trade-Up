const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { getAllItems, getItemsByOwner, createItem, getItemById, updateItemOwner } = require("../db/itemQueries"); // Ensure updateItemOwner is exported from itemQueries
const pool = require("../db/pool").promise();

// This is a helper function (don't delete)
async function getUserIdFromFirebaseUid(firebaseUid) {
	if (!firebaseUid || typeof firebaseUid !== "string" || firebaseUid.trim() === "" || firebaseUid === "undefined") {
		console.error(`[Helper items.js] Invalid or missing Firebase UID received: ${firebaseUid}`);
		return null;
	}
	console.log(`[Helper items.js] Looking up user ID for Firebase UID: ${firebaseUid}`);
	try {
		const [userRows] = await pool.query("SELECT id FROM users WHERE firebase_uid = ?", [firebaseUid]);
		if (userRows.length > 0) {
			const userId = userRows[0].id;
			console.log(`[Helper items.js] Returning user ID: ${userId} (Type: ${typeof userId})`);
			return typeof userId === "number" ? userId : null;
		} else {
			console.warn(`[Helper items.js] No user found for UID: ${firebaseUid}`);
			return null;
		}
	} catch (dbError) {
		console.error(`[Helper items.js] Database error looking up UID ${firebaseUid}:`, dbError);
		return null;
	}
}

// GET /api/items/user/me - Get items owned by the current user
router.get("/user/me", authenticate, async (req, res) => {
	console.log("[Route /user/me] Request received.");
	try {
		const firebaseUid = req.user?.uid;
		if (!firebaseUid) {
			console.error("[Route /user/me] Firebase UID missing from request.");
			return res.status(401).json({ error: "Authentication error: UID missing." });
		}
		console.log(`[Route /user/me] Authenticated Firebase UID: ${firebaseUid}`);

		const userId = await getUserIdFromFirebaseUid(firebaseUid);
		console.log(`[Route /user/me] Looked up userId: ${userId} (Type: ${typeof userId})`);

		if (userId === null || typeof userId !== "number") {
			console.error(`[Route /user/me] Failed to get valid numeric user ID for Firebase UID: ${firebaseUid}. Got: ${userId}`);
			return res.status(404).json({ error: "User not found in application database." });
		}
		console.log(`[Route /user/me] Numeric userId ${userId} obtained. Proceeding to fetch items...`);

		console.log(`[Route /user/me] Calling getItemsByOwner with userId: ${userId} (Type: ${typeof userId})`);

		const items = await getItemsByOwner(userId);

		console.log(`[Route /user/me] Found ${items.length} items for user ID ${userId}.`);
		res.json({ items });
	} catch (err) {
		console.error("[Route /user/me] Unexpected error in route handler:", err);
		res.status(500).json({ error: "Failed to fetch your items due to server error." });
	}
});

// GET /api/items/marketplace - Get all available items for trade
router.get("/marketplace", authenticate, async (req, res) => {
	try {
		const items = await getAllItems();
		const currentUserFirebaseUid = req.user?.uid;
		let filteredItems = items;
		if (currentUserFirebaseUid) {
			filteredItems = items.filter((item) => item.ownerFirebaseUid !== currentUserFirebaseUid);
			console.log(`[Marketplace] Filtered out items owned by ${currentUserFirebaseUid}. Showing ${filteredItems.length} items.`);
		} else {
			console.warn("[Marketplace] Could not filter user's own items, UID not found on request.");
		}
		res.json(filteredItems);
	} catch (error) {
		console.error("Error fetching marketplace items:", error);
		res.status(500).json({ error: "Failed to fetch marketplace items" });
	}
});

// POST /api/items/create - Create a new item (manual add)
router.post("/create", authenticate, async (req, res) => {
	try {
		const { name, description, image_url, hidden_value, item_type } = req.body;
		const firebaseUid = req.user.uid;
		const owner_id = await getUserIdFromFirebaseUid(firebaseUid);
		if (!owner_id) {
			return res.status(404).json({ error: "Authenticated user not found in database." });
		}

		const newItemId = await createItem({
			name,
			description,
			image_url,
			hidden_value,
			item_type,
			owner_id,
		});

		res.status(201).json({
			message: "Item created successfully",
			itemId: newItemId,
		});
	} catch (err) {
		console.error("Error creating item:", err);
		res.status(500).json({ error: "Failed to create item" });
	}
});

router.get("/daily-reward-status", authenticate, async (req, res) => {
	const connection = await pool.getConnection();
	try {
		const firebaseUid = req.user.uid;
		const userId = await getUserIdFromFirebaseUid(firebaseUid);

		if (!userId) {
			await connection.release();
			return res.status(404).json({ error: `User not found.` });
		}

		const today = new Date().toISOString().split("T")[0];

		const checkClaimSql = `
            SELECT item_id FROM user_daily_claims
            WHERE user_id = ? AND claim_date = CURDATE()
            LIMIT 1
        `;
		console.log(`[daily-reward-status] Checking claim for user ${userId} on ${today}`);
		const [claims] = await connection.query(checkClaimSql, [userId]);

		if (claims.length > 0) {
			const claimedItemId = claims[0].item_id;
			console.log(`[daily-reward-status] Claim found for today. Item ID: ${claimedItemId}`);
			const [itemResult] = await connection.query("SELECT * FROM items WHERE id = ?", [claimedItemId]);
			await connection.release();
			return res.status(200).json({
				claimed: true,
				item: itemResult[0] || null,
			});
		} else {
			console.log(`[daily-reward-status] No claim found for user ${userId} today.`);
			await connection.release();
			return res.status(200).json({ claimed: false, item: null });
		}
	} catch (err) {
		console.error("[daily-reward-status] Error checking status:", err);
		if (connection) await connection.release();
		res.status(500).json({ error: "Failed to check daily reward status." });
	}
});

// POST /api/items/claim-daily-reward - Checks and potentially assigns an existing item
router.post("/claim-daily-reward", authenticate, async (req, res) => {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		const firebaseUid = req.user.uid;
		const userId = await getUserIdFromFirebaseUid(firebaseUid);

		if (!userId) {
			await connection.rollback();
			await connection.release();
			return res.status(404).json({ error: `User not found.` });
		}

		const today = new Date().toISOString().split("T")[0];

		const checkClaimSql = `
            SELECT item_id FROM user_daily_claims
            WHERE user_id = ? AND claim_date = CURDATE()
            FOR UPDATE
        `;
		console.log(`[claim-daily-reward] Checking claim for user ${userId} on ${today}`);
		const [claims] = await connection.query(checkClaimSql, [userId]);

		if (claims.length > 0) {
			const claimedItemId = claims[0].item_id;
			console.log(`[claim-daily-reward] Already claimed today. Item ID: ${claimedItemId}`);
			const [itemResult] = await connection.query("SELECT * FROM items WHERE id = ?", [claimedItemId]);
			await connection.commit();
			await connection.release();
			return res.status(200).json({
				message: "Daily reward already claimed today.",
				alreadyClaimed: true,
				item: itemResult[0] || null,
			});
		}

		console.log(`[claim-daily-reward] No claim found. Selecting random unowned item...`);
		const findItemSql = `
            SELECT id FROM items
            WHERE owner_id IS NULL
            ORDER BY RAND()
            LIMIT 1
        `;
		const [availableItems] = await connection.query(findItemSql);

		if (availableItems.length === 0) {
			console.warn(`[claim-daily-reward] No unowned items available in the database.`);
			await connection.rollback();
			await connection.release();
			return res.status(404).json({ error: "No daily reward items available at this time." });
		}

		const itemIdToAssign = availableItems[0].id;
		console.log(`[claim-daily-reward] Selected item ID ${itemIdToAssign} to assign to user ${userId}.`);

		const updateItemSql = "UPDATE items SET owner_id = ? WHERE id = ? AND owner_id IS NULL"; // Ensure it's still unowned
		const [updateResult] = await connection.query(updateItemSql, [userId, itemIdToAssign]);

		if (updateResult.affectedRows === 0) {
			console.warn(`[claim-daily-reward] Item ${itemIdToAssign} was possibly claimed by another process. Rolling back.`);
			await connection.rollback();
			await connection.release();
			return res.status(409).json({ error: "Could not claim item, it might have been taken. Please try again." });
		}
		console.log(`[claim-daily-reward] Updated owner for item ID ${itemIdToAssign}.`);

		const recordClaimSql = `
            INSERT INTO user_daily_claims (user_id, item_id, claim_date)
            VALUES (?, ?, CURDATE())
        `;
		await connection.query(recordClaimSql, [userId, itemIdToAssign]);
		console.log(`[claim-daily-reward] Recorded claim for user ${userId}, item ${itemIdToAssign}.`);

		const [assignedItemResult] = await connection.query("SELECT * FROM items WHERE id = ?", [itemIdToAssign]);
		const assignedItem = assignedItemResult[0];

		await connection.commit();
		await connection.release();

		res.status(201).json({
			message: "Daily reward claimed successfully!",
			alreadyClaimed: false,
			item: assignedItem,
		});
	} catch (err) {
		console.error("[claim-daily-reward] Error claiming daily reward:", err);
		await connection.rollback();
		if (connection) await connection.release();
		res.status(500).json({ error: "Failed to process daily reward claim due to a server error." });
	}
});

// POST /api/items/purchase - Handle item purchase logic
router.post("/purchase", authenticate, async (req, res) => {
	const connection = await pool.getConnection();
	try {
		const { itemId, offeredPrice } = req.body;
		const firebaseBuyerUid = req.user.uid;

		console.log(`Purchase attempt: Buyer UID: ${firebaseBuyerUid}, Item ID: ${itemId}, Offered Price: ${offeredPrice}`);

		if (itemId === undefined || itemId === null || offeredPrice === undefined || offeredPrice === null) {
			console.error("Bad Request: Missing itemId or offeredPrice.");
			return res.status(400).json({ error: "Item ID and offered price are required" });
		}

		const numericItemId = Number(itemId);
		const numericOfferedPrice = Number(offeredPrice);

		if (isNaN(numericItemId) || isNaN(numericOfferedPrice) || numericOfferedPrice < 0) {
			console.error(`Bad Request: Invalid numeric input. ItemID: ${itemId}, Price: ${offeredPrice}`);
			return res.status(400).json({ error: "Invalid item ID or price format." });
		}

		await connection.beginTransaction();
		console.log("Transaction started.");

		const [itemResults] = await connection.query("SELECT * FROM items WHERE id = ? FOR UPDATE", [numericItemId]);
		if (itemResults.length === 0) {
			console.error(`Item not found: ID ${numericItemId}`);
			await connection.rollback();
			return res.status(404).json({ error: "Item not found" });
		}
		const item = itemResults[0];
		console.log(`Item found: ${item.name}, Value: ${item.hidden_value}, Owner ID: ${item.owner_id}`);

		const buyerId = await getUserIdFromFirebaseUid(firebaseBuyerUid);
		if (!buyerId) {
			console.error(`Buyer user not found for Firebase UID ${firebaseBuyerUid}`);
			await connection.rollback();
			return res.status(404).json({ error: "Buyer user not found" });
		}
		const [userResults] = await connection.query("SELECT * FROM users WHERE id = ? FOR UPDATE", [buyerId]);
		if (userResults.length === 0) {
			console.error(`Buyer user row disappeared for ID ${buyerId}`);
			await connection.rollback();
			return res.status(404).json({ error: "Buyer user data inconsistency" });
		}
		const buyer = userResults[0];
		console.log(`Buyer found: ID ${buyer.id}, Username ${buyer.username}, Credits: ${buyer.trade_credit}`);

		if (item.owner_id === buyer.id) {
			console.warn(`Buyer ${buyer.username} already owns item ${numericItemId}`);
			await connection.rollback();
			return res.status(400).json({ error: "You already own this item" });
		}

		if (buyer.trade_credit < numericOfferedPrice) {
			console.error(`Insufficient credit: Buyer ${buyer.username} has ${buyer.trade_credit}, needs ${numericOfferedPrice}`);
			await connection.rollback();
			return res.status(400).json({ error: "Insufficient trade credit" });
		}

		console.log(`Deducting ${numericOfferedPrice} credits from buyer ${buyer.id}`);
		const [buyerUpdateResult] = await connection.query("UPDATE users SET trade_credit = trade_credit - ? WHERE id = ?", [numericOfferedPrice, buyer.id]);
		if (buyerUpdateResult.affectedRows === 0) throw new Error("Failed to update buyer credits");

		if (item.owner_id) {
			console.log(`Adding ${numericOfferedPrice} credits to seller ${item.owner_id}`);
			await connection.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [item.owner_id]);
			const [sellerUpdateResult] = await connection.query("UPDATE users SET trade_credit = trade_credit + ? WHERE id = ?", [numericOfferedPrice, item.owner_id]);
			if (sellerUpdateResult.affectedRows === 0) {
				console.warn(`Could not find seller user with ID ${item.owner_id} to add credits.`);
			}
		} else {
			console.log("Item has no previous owner (owner_id is NULL), no seller to credit.");
		}

		console.log(`Updating owner of item ${numericItemId} to buyer ${buyer.id}`);
		const [itemUpdateResult] = await connection.query("UPDATE items SET owner_id = ? WHERE id = ?", [buyer.id, numericItemId]);
		if (itemUpdateResult.affectedRows === 0) throw new Error("Failed to update item ownership");

		await connection.commit();
		console.log("Transaction committed successfully.");

		const [finalBuyerInfo] = await connection.query("SELECT trade_credit FROM users WHERE id = ?", [buyerId]);

		res.status(200).json({
			message: "Purchase successful",
			itemId: numericItemId,
			price: numericOfferedPrice,
			newBalance: finalBuyerInfo[0]?.trade_credit ?? buyer.trade_credit - numericOfferedPrice, // Use updated balance or calculate fallback
		});
	} catch (error) {
		console.error("Error during purchase transaction:", error);
		await connection.rollback();
		console.log("Transaction rolled back due to error.");
		res.status(500).json({ error: "Failed to process purchase" });
	} finally {
		if (connection) {
			connection.release();
			console.log("Connection released.");
		}
	}
});

// GET /api/items/user/:userId - Get items owned by a specific user
router.get("/user/:userId", authenticate, async (req, res) => {
	try {
		const userIdParam = req.params.userId;
		console.log(`[Route /user/:userId] Request received for userId param: ${userIdParam}`);

		let numericUserId;
		if (!/^\d+$/.test(userIdParam) || userIdParam.length > 15) {
			console.log(`[Route /user/:userId] Param looks like Firebase UID, attempting lookup...`);
			numericUserId = await getUserIdFromFirebaseUid(userIdParam);
			if (numericUserId === null) {
				console.error(`[Route /user/:userId] Could not find user for Firebase UID param: ${userIdParam}`);
				return res.status(404).json({ error: "User specified by UID not found" });
			}
			console.log(`[Route /user/:userId] Found numeric ID ${numericUserId} for UID param ${userIdParam}`);
		} else {
			numericUserId = Number(userIdParam);
			if (isNaN(numericUserId)) {
				console.error(`[Route /user/:userId] Invalid numeric userId param: ${userIdParam}`);
				return res.status(400).json({ error: "Invalid user ID format" });
			}
		}

		console.log(`[Route /user/:userId] Calling getItemsByOwner with ID: ${numericUserId}`);
		const items = await getItemsByOwner(numericUserId);
		res.json({ items });
	} catch (err) {
		console.error("Error fetching user items:", err);
		res.status(500).json({ error: "Failed to fetch user items" });
	}
});

// GET /api/items/:itemId - Get a specific item by ID
router.get("/:itemId", authenticate, async (req, res) => {
	try {
		const itemId = req.params.itemId;
		if (!/^\d+$/.test(itemId)) {
			console.log(`[Route /:itemId] Non-numeric itemId "${itemId}" requested, likely a sub-route. Skipping item lookup.`);
			return res.status(404).send("Not found or invalid item ID format");
		}
		console.log(`[Route /:itemId] Request for item ID: ${itemId}`);
		const item = await getItemById(itemId);

		if (!item) {
			return res.status(404).json({ error: "Item not found" });
		}
		res.json({ item });
	} catch (err) {
		console.error("Error fetching item:", err);
		res.status(500).json({ error: "Failed to fetch item" });
	}
});

module.exports = router;
