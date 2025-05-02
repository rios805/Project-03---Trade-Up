const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const { createTrade, getTradesByUser, updateTradeStatus, getTradeById } = require("../db/tradeQueries");
const { getItemsByOwner, updateItemOwner } = require("../db/itemQueries");

// Ignore this route, this is just for testing purposes will get removed later
router.get("/test", async (req, res) => {
	try {
		const items = await getAllItems();
		res.json({ items });
	} catch (err) {
		console.error("Error fetching items:", err);
		res.status(500).json({ error: "Failed to fetch items" });
	}
});

// GET /api/trades/me - Get all trades for the current user
router.get("/me", authenticate, async (req, res) => {
	try {
		const userId = req.user.uid;
		const trades = await getTradesByUser(userId);

		// This is a very simple implemenation, we might want to add more details to the trades
		// like the items involved in the trade, their status, etc.
		// For now, we will just return the trades as they are
		res.json({ trades });
	} catch (err) {
		console.error("Error fetching trades:", err);
		res.status(500).json({ error: "Failed to fetch trades" });
	}
});

// POST /api/trades/create - Create a new trade request
router.post("/create", authenticate, async (req, res) => {
	try {
		const { item_offered_id, item_requested_id, responder_id } = req.body;
		const requester_id = req.user.uid;

		// This is to validate that the requester owns the offered item
		const userItems = await getItemsByOwner(requester_id);
		const ownsItem = userItems.some((item) => item.id === parseInt(item_offered_id));

		if (!ownsItem) {
			return res.status(403).json({ error: "You can only offer items you own" });
		}

		const tradeId = await createTrade({
			item_offered_id,
			item_requested_id,
			requester_id,
			responder_id,
		});

		res.status(201).json({
			message: "Trade request created successfully",
			tradeId,
		});
	} catch (err) {
		console.error("Error creating trade:", err);
		res.status(500).json({ error: "Failed to create trade request" });
	}
});

// PATCH /api/trades/:tradeId/respond - Accept or reject a trade
router.patch("/:tradeId/respond", authenticate, async (req, res) => {
	try {
		const { tradeId } = req.params;
		const { status } = req.body;
		const userId = req.user.uid;

		if (status !== "accepted" && status !== "rejected") {
			return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'" });
		}

		const trade = await getTradeById(tradeId);

		if (!trade) {
			return res.status(404).json({ error: "Trade not found" });
		}

		if (trade.responder_id != userId) {
			return res.status(403).json({ error: "You are not authorized to respond to this trade" });
		}

		await updateTradeStatus(tradeId, status);

		if (status === "accepted") {
			// Swap ownership of both items
			await updateItemOwner(trade.item_offered_id, trade.responder_id);
			await updateItemOwner(trade.item_requested_id, trade.requester_id);
		}

		res.json({
			message: `Trade ${status}`,
			tradeId,
		});
	} catch (err) {
		console.error(`Error ${req.body.status} trade:`, err);
		res.status(500).json({ error: `Failed to ${req.body.status} trade` });
	}
});


// GET /api/trades/:tradeId - Get details of a specific trade
router.get("/:tradeId", authenticate, async (req, res) => {
	try {
		const trade = await getTradeById(req.params.tradeId);

		if (!trade) {
			return res.status(404).json({ error: "Trade not found" });
		}

		res.json({ trade });
	} catch (err) {
		console.error("Error fetching trade:", err);
		res.status(500).json({ error: "Failed to fetch trade details" });
	}
});

module.exports = router;
