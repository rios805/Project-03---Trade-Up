const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { getAllItems, getItemsByOwner, createItem } = require("../db/itemQueries");

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

  // GET /api/items/user/:userId - Get items owned by a specific user
router.get("/user/:userId", authenticate, async (req, res) => {
	try {
	  const items = await getItemsByOwner(req.params.userId);
	  res.json({ items });
	} catch (err) {
	  console.error("Error fetching user items:", err);
	  res.status(500).json({ error: "Failed to fetch user items" });
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
	  // This would need to be implemented in itemQueries.js
	  const itemId = req.params.itemId;
	  // const item = await getItemById(itemId);
	  
	  // This is  Placeholder response until getItemById gets implemented
	  //I'm to lazy to implement it right now
	  res.json({ 
		message: "This endpoint would return a specific item",
		itemId: itemId
	  });
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

module.exports = router;
