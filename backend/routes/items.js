const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { getAllItems, getItemsByOwner, createItem, getItemById } = require("../db/itemQueries");
const pool = require("../db/pool").promise();

// Helper function (ensure this is present and correct)
async function getUserIdFromFirebaseUid(firebaseUid) {
    console.log(`[Helper] Looking up user ID for Firebase UID: ${firebaseUid}`);
    if (!firebaseUid) {
        console.error("[Helper] Received null or undefined firebaseUid");
        return null;
    }
    try {
        const [userRows] = await pool.query("SELECT id FROM users WHERE firebase_uid = ?", [firebaseUid]);
        console.log(`[Helper] Found user rows for UID ${firebaseUid}:`, userRows);
        if (userRows.length > 0) {
            console.log(`[Helper] Returning user ID: ${userRows[0].id}`);
            return userRows[0].id; // This returns the integer ID becauce for some reason it wasn't doing that before
        } else {
          //You can get rid of these logs (I mainly used them for debugging)
            console.warn(`[Helper] No user found for UID: ${firebaseUid}`);
            return null;
        }
    } catch (dbError) {
        console.error(`[Helper] Database error looking up UID ${firebaseUid}:`, dbError);
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

        if (userId === null || typeof userId !== 'number') {
            console.error(`[Route /user/me] Failed to get valid numeric user ID for Firebase UID: ${firebaseUid}. Got: ${userId}`);
            return res.status(404).json({ error: "User not found in application database." });
        }
        console.log(`[Route /user/me] Numeric userId ${userId} obtained. Proceeding to fetch items...`);

        console.log(`[Route /user/me] Calling getItemsByOwner with userId: ${userId} (Type: ${typeof userId})`);

        const items = await getItemsByOwner(userId); // Pass the numeric userId

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
    res.json(items); 
  } catch (error) {
    console.error("Error fetching marketplace items:", error);
    res.status(500).json({ error: "Failed to fetch marketplace items" });
  }
});


router.get("/test", async (req, res) => {
  try {
    const items = await getAllItems();
    res.json({ items });
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

router.get("/all", authenticate, async (req, res) => {
  try {
    const items = await getAllItems();
    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
      owner_id
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

router.post("/generate-daily", authenticate, async (req, res) => {
  try {
    const firebaseUid = req.body.userId || req.user.uid; 
    const owner_id = await getUserIdFromFirebaseUid(firebaseUid);
     if (!owner_id) {
        const targetUserDesc = req.body.userId ? `user with UID ${firebaseUid}` : 'current user';
        console.error(`Could not find ${targetUserDesc} in database to generate daily item.`);
        return res.status(404).json({ error: `Target user (${targetUserDesc}) not found in database.` });
    }

    const newItemId = await createItem({
      name: "Daily Bonus Item",
      description: "A random item generated for your daily challenge",
      image_url: "https://placeholder.com/item.jpg",
      hidden_value: Math.floor(Math.random() * 100) + 1,
      item_type: "Misc",
      owner_id: owner_id 
    });

    res.status(201).json({
      message: "Daily items generated successfully",
      itemId: newItemId
    });
  } catch (err) {
    console.error("Error generating daily items:", err);
    res.status(500).json({ error: "Failed to generate daily items" });
  }
});

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

    await connection.beginTransaction();
    console.log("Transaction started.");

    const [itemResults] = await connection.query("SELECT * FROM items WHERE id = ? FOR UPDATE", [itemId]);
    if (itemResults.length === 0) {
      console.error(`Item not found: ID ${itemId}`);
      await connection.rollback();
      return res.status(404).json({ error: "Item not found" });
    }
    const item = itemResults[0];
    console.log(`Item found: ${item.name}, Value: ${item.hidden_value}, Owner ID: ${item.owner_id}`);

    // Thhis is to get buyer's integer ID
    const buyerId = await getUserIdFromFirebaseUid(firebaseBuyerUid);
    if (!buyerId) {
        console.error(`Buyer user not found for Firebase UID ${firebaseBuyerUid}`);
        await connection.rollback();
        return res.status(404).json({ error: "Buyer user not found" });
    }

    const [userResults] = await connection.query("SELECT * FROM users WHERE id = ? FOR UPDATE", [buyerId]);
    const buyer = userResults[0];
    console.log(`Buyer found: ID ${buyer.id}, Username ${buyer.username}, Credits: ${buyer.trade_credit}`);

    if (item.owner_id === buyer.id) {
      console.warn(`Buyer ${buyer.username} already owns item ${itemId}`);
      await connection.rollback();
      return res.status(400).json({ error: "You already own this item" });
    }

    if (buyer.trade_credit < offeredPrice) {
      console.error(`Insufficient credit: Buyer ${buyer.username} has ${buyer.trade_credit}, needs ${offeredPrice}`);
      await connection.rollback();
      return res.status(400).json({ error: "Insufficient trade credit" });
    }


    console.log(`Deducting ${offeredPrice} credits from buyer ${buyer.id}`);
    const [buyerUpdateResult] = await connection.query("UPDATE users SET trade_credit = trade_credit - ? WHERE id = ?", [offeredPrice, buyer.id]);
    if (buyerUpdateResult.affectedRows === 0) throw new Error("Failed to update buyer credits");

    if (item.owner_id) { // Thisheck if item has an owner (owner_id is not NULL)
      console.log(`Adding ${offeredPrice} credits to seller ${item.owner_id}`);
      const [sellerUpdateResult] = await connection.query("UPDATE users SET trade_credit = trade_credit + ? WHERE id = ?", [offeredPrice, item.owner_id]);
      if (sellerUpdateResult.affectedRows === 0) {
          // This might happen if the owner_id refers to a deleted user. Log a warning but maybe proceed? (i'm not sure if this is the best approach)
          console.warn(`Could not find seller user with ID ${item.owner_id} to add credits.`);
      }
    } else {
      console.log("Item has no previous owner (owner_id is NULL), no seller to credit.");
    }

    console.log(`Updating owner of item ${itemId} to buyer ${buyer.id}`);
    const [itemUpdateResult] = await connection.query("UPDATE items SET owner_id = ? WHERE id = ?", [buyer.id, itemId]);
    if (itemUpdateResult.affectedRows === 0) throw new Error("Failed to update item ownership");

    await connection.commit();
    console.log("Transaction committed successfully.");

    // This is to fetch updated buyer info to get the new balance accurately
     const [finalBuyerInfo] = await connection.query("SELECT trade_credit FROM users WHERE id = ?", [buyerId]);

    res.status(200).json({
      message: "Purchase successful",
      itemId,
      price: offeredPrice,
      newBalance: finalBuyerInfo[0]?.trade_credit ?? buyer.trade_credit - offeredPrice, // Use updated balance or calculate fallback
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
    if (isNaN(Number(userIdParam)) && userIdParam.length > 10) { // Simple check: if not a number and long, assume it's a UID
        console.log(`[Route /user/:userId] Param looks like Firebase UID, attempting lookup...`);
        numericUserId = await getUserIdFromFirebaseUid(userIdParam);
         if (numericUserId === null) {
             console.error(`[Route /user/:userId] Could not find user for Firebase UID param: ${userIdParam}`);
             return res.status(404).json({ error: "User specified by UID not found" });
         }
         console.log(`[Route /user/:userId] Found numeric ID ${numericUserId} for UID param ${userIdParam}`);
    } else {
        numericUserId = Number(userIdParam); // Assume it's already a numeric ID
        if (isNaN(numericUserId)) {
             console.error(`[Route /user/:userId] Invalid numeric userId param: ${userIdParam}`);
             return res.status(400).json({ error: "Invalid user ID format" });
        }
    }

    console.log(`[Route /user/:userId] Calling getItemsByOwner with ID: ${numericUserId}`);
    const items = await getItemsByOwner(numericUserId); // Use the determined numeric ID
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
    if (itemId === 'user' || itemId === 'marketplace' || itemId === 'all' || itemId === 'test') {
        return res.status(404).send('Not found'); 
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
