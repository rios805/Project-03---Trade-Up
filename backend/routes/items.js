const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { getAllItems, getItemsByOwner, createItem, getItemById } = require("../db/itemQueries");
const pool = require("../db/pool").promise();

router.get("/test", async (req, res) => {
	try {
		const items = await getAllItems();
		res.json({ items });
	} catch (err) {
		console.error("Error fetching items:", err);
		res.status(500).json({ error: "Failed to fetch items" });
	}
});

// (I was using this mainly for testing purposes)
// GET /api/items/all - Get all items (authenticated)
router.get("/all", authenticate, async (req, res) => {
	try {
		const items = await getAllItems();
		res.json(items);
	} catch (error) {
		console.error("Error fetching items:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// This si to GET /api/items/user/:userId - Get items owned by a specific user
router.get("/user/:userId", authenticate, async (req, res) => {
	try {
	  const items = await getItemsByOwner(req.params.userId);
	  res.json({ items });
	} catch (err) {
	  console.error("Error fetching user items:", err);
	  res.status(500).json({ error: "Failed to fetch user items" });
	}
  });

  // GET /api/items/user/me - Get items owned by the current user
router.get("/user/me", authenticate, async (req, res) => {
	try {
	  const userId = req.user.uid;
	  const items = await getItemsByOwner(userId);
	  res.json({ items });
	} catch (err) {
	  console.error("Error fetching current user items:", err);
	  res.status(500).json({ error: "Failed to fetch your items" });
	}
  });
  

  // GET /api/items/marketplace - Get all available items for trade
router.get("/marketplace", authenticate, async (req, res) => {
	try {
	  // This should be replaced with a more specific query (might be changed later)
	  const items = await getAllItems();
	  res.json(items);
	} catch (error) {
	  console.error("Error fetching marketplace items:", error);
	  res.status(500).json({ error: "Failed to fetch marketplace items" });
	}
  });


  // POST /api/items/create - Create a new item
router.post("/create", authenticate, async (req, res) => {
	try {
	  const { name, description, image_url, hidden_value, item_type } = req.body;
	  const owner_id = req.user.uid;
	  
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
		itemId: newItemId
	  });
	} catch (err) {
	  console.error("Error creating item:", err);
	  res.status(500).json({ error: "Failed to create item" });
	}
  });

  // GET /api/items/:itemId - Get a specific item by ID
router.get("/:itemId", authenticate, async (req, res) => {
	try {
	  const itemId = req.params.itemId;
	  const item = await getItemById(itemId);

	  if (!item) {
		return res.status(404).json({error: "Item not found"});
	  }
	  res.json({ item });
	} catch (err) {
	  console.error("Error fetching item:", err);
	  res.status(500).json({ error: "Failed to fetch item" });
	}
  });


  // POST /api/items/generate-daily - Generate daily items for a user (This is intended for admin only)
  // This login might be changed once we get items implemtned. We can also add weigh logic to this so some items are more common than others
router.post("/generate-daily", authenticate, async (req, res) => {
	try {
	  const userId = req.body.userId || req.user.uid;
	  
	  // This will later be reaplaced with a way to generate items based on some logic
	  // For now, it just creates a single placeholder item
	  const newItemId = await createItem({
		name: "Daily Bonus Item",
		description: "A random item generated for your daily challenge",
		image_url: "https://placeholder.com/item.jpg",
		hidden_value: Math.floor(Math.random() * 100) + 1, // Creating a Random value between 1-100
		item_type: "Misc",
		owner_id: userId
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

  // POST /api/items/purchase - Purchase an item (This is the main endpoint for buying items)
  //(Make sure to have an account with enough credits before testing this)
  router.post("/purchase", authenticate, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { itemId, offeredPrice } = req.body;
      /// This gets Firebase UID from authenticated user
      const firebaseBuyerUid = req.user.uid;

      console.log(`Purchase attempt: Buyer UID: ${firebaseBuyerUid}, Item ID: ${itemId}, Offered Price: ${offeredPrice}`);

      if (!itemId || offeredPrice === undefined || offeredPrice === null) {
        // This ensures offeredPrice is checked correctly (0 is a valid price potentially, Maybe I'm not really sure about this)
        console.error("Bad Request: Missing itemId or offeredPrice.");
        return res.status(400).json({ error: "Item ID and offered price are required" });
      }

      // This starts the transaction
      await connection.beginTransaction();
      console.log("Transaction started.");

      // 1. This gets item details and lock the row for update (if using InnoDB)
      const [itemResults] = await connection.query("SELECT * FROM items WHERE id = ? FOR UPDATE", [itemId]);
      if (itemResults.length === 0) {
        console.error(`Item not found: ID ${itemId}`);
        //If the item is not found, rollback the transaction to prevent any changes that might cause problems
        await connection.rollback();
        return res.status(404).json({ error: "Item not found" });
      }
      const item = itemResults[0];
      console.log(`Item found: ${item.name}, Value: ${item.hidden_value}, Owner ID: ${item.owner_id}`);

      // 2. This gets buyer details using Firebase UID and then locks the row
      const [userResults] = await connection.query("SELECT * FROM users WHERE firebase_uid = ? FOR UPDATE", [firebaseBuyerUid]);
      if (userResults.length === 0) {
        console.error(`Buyer not found: Firebase UID ${firebaseBuyerUid}`);
        await connection.rollback();
        // Consider if a user *should* always exist if authenticated. Maybe 500 is better? I'm not sure.
        return res.status(404).json({ error: "Buyer user not found" });
      }
      const buyer = userResults[0];
      console.log(`Buyer found: ${buyer.username}, Credits: ${buyer.trade_credit}`);

          // This part here is probably optional: Check if buyer already owns the item (or maybe not, this might actually be needed I didn't test it but I'm leaving it here just in case)
          if (item.owner_id === buyer.id) {
               console.warn(`Buyer ${buyer.username} already owns item ${itemId}`);
               await connection.rollback();
               return res.status(400).json({ error: "You already own this item" });
          }

      // 3. This checks if the buyer has enough credit
      if (buyer.trade_credit < offeredPrice) {
        console.error(`Insufficient credit: Buyer ${buyer.username} has ${buyer.trade_credit}, needs ${offeredPrice}`);
        await connection.rollback();
        return res.status(400).json({ error: "Insufficient trade credit" });
      }

      // 4. This checks if the offered price is sufficient (optional check, adjust or remove if we need to)
      // This check might be removed if are going to allow any price offer
      // Example: 80% of hidden value
      const minPrice = item.hidden_value * 0.8;
      if (offeredPrice < minPrice) {
        console.error(`Price too low: Offered ${offeredPrice}, minimum required ${minPrice}`);
        await connection.rollback();
        return res.status(400).json({ error: `Offered price is too low. Minimum required: $${minPrice.toFixed(2)}` });
      }

      // Since this is a long router, I'm ussing subheadings to make it easier to read (if you don't want thmm just remove them)
      // --- Perform the transaction steps ---

      // a. Deduct the credits from buyer
      console.log(`Deducting ${offeredPrice} credits from buyer ${buyer.id}`);
      const [buyerUpdateResult] = await connection.query("UPDATE users SET trade_credit = trade_credit - ? WHERE id = ?", [offeredPrice, buyer.id]);
          if (buyerUpdateResult.affectedRows === 0) {
               console.error(`Failed to update buyer credits for user ID ${buyer.id}`);
               throw new Error("Failed to update buyer credits"); // This will trigger rollback in catch
          }

      // b. Adds credits to ther seller (if item had an owner)
      if (item.owner_id) {
        console.log(` Adding ${offeredPrice} credits to seller ${item.owner_id}`);
        const [sellerUpdateResult] = await connection.query("UPDATE users SET trade_credit = trade_credit + ? WHERE id = ?", [offeredPrice, item.owner_id]);
              if (sellerUpdateResult.affectedRows === 0) {
                   console.error(`Failed to update seller credits for user ID ${item.owner_id}`);
                   throw new Error("Failed to update seller credits");
              }
      } else {
               console.log("No seller to credit for this item.");
          }

      // c. This updates item ownership
      console.log(`Updating owner of item ${itemId} to buyer ${buyer.id}`);
      const [itemUpdateResult] = await connection.query("UPDATE items SET owner_id = ? WHERE id = ?", [buyer.id, itemId]);
          if (itemUpdateResult.affectedRows === 0) {
               console.error(`Failed to update ownership for item ID ${itemId}`);
               throw new Error("Failed to update item ownership");
          }

      // Commit transaction
      await connection.commit();
      console.log("Transaction committed successfully.");

      res.status(200).json({
        message: "Purchase successful",
        itemId,
        price: offeredPrice,
        newBalance: buyer.trade_credit - offeredPrice, // Sends back the calculated new balance (hopefully, I didn't acctually test this but it should work)
      });
    } catch (error) {
      console.error("Error during purchase transaction:", error);
      // Rollback transaction in case of any error during the process
      await connection.rollback();
      console.log("Transaction rolled back due to error.");
      res.status(500).json({ error: "Failed to process purchase" });
    } finally {
      // This is just to release the connection.
      if (connection) {
        connection.release();
        console.log("Connection released.");
      }
    }
  });

module.exports = router;
