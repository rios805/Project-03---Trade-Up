const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const pool = require("../db/pool").promise(); 
const { updateTradeStatus, getTradeById } = require("../db/tradeQueries"); 
const { getItemById } = require("../db/itemQueries");


async function getUserIdFromFirebaseUid(firebaseUid) {
	if (!firebaseUid || typeof firebaseUid !== 'string' || firebaseUid.trim() === '' || firebaseUid === 'undefined') {
		console.error(`[Helper] Invalid or missing Firebase UID received: ${firebaseUid}`);
		return null;
	}
	console.log(`[Helper] Looking up user ID for Firebase UID: ${firebaseUid}`);
	try {
		const [userRows] = await pool.query("SELECT id FROM users WHERE firebase_uid = ?", [firebaseUid]);
		console.log(`[Helper] Found user rows for UID ${firebaseUid}:`, userRows);
		if (userRows.length > 0) {
			const userId = userRows[0].id;
			console.log(`[Helper] Returning user ID: ${userId} (Type: ${typeof userId})`);
			return typeof userId === 'number' ? userId : null;
		} else {
			console.warn(`[Helper] No user found for UID: ${firebaseUid}`);
			return null;
		}
	} catch (dbError) {
		console.error(`[Helper] Database error looking up UID ${firebaseUid}:`, dbError);
		return null; 
	}
}


// GET /api/trades/me - Get all trades for the current user with item and user details
router.get("/me", authenticate, async (req, res) => {
	try {
		const currentUserFirebaseUid = req.user.uid;
		console.log(`Fetching trades for user UID: ${currentUserFirebaseUid}`);

		const currentUserId = await getUserIdFromFirebaseUid(currentUserFirebaseUid);
		if (!currentUserId) {
			console.error(`Could not find user ID for Firebase UID: ${currentUserFirebaseUid}`);
			return res.status(404).json({ error: "Current user not found in application database." });
		}
		console.log(`User ID: ${currentUserId} corresponds to UID: ${currentUserFirebaseUid}`);

		const sql = `
            SELECT
                t.id AS trade_id,
                t.status,
                t.created_at,
                t.requester_id, 
                t.responder_id, 
                req_user.username AS requester_username,
                req_user.firebase_uid AS requester_firebase_uid, 
                res_user.username AS responder_username,
                res_user.firebase_uid AS responder_firebase_uid, 
                item_offered.id AS item_offered_id,
                item_offered.name AS item_offered_name,
                item_offered.image_url AS item_offered_image_url,
                item_requested.id AS item_requested_id,
                item_requested.name AS item_requested_name,
                item_requested.image_url AS item_requested_image_url
            FROM trades t
            LEFT JOIN items AS item_offered ON t.item_offered_id = item_offered.id
            LEFT JOIN items AS item_requested ON t.item_requested_id = item_requested.id
            LEFT JOIN users AS req_user ON t.requester_id = req_user.id 
            LEFT JOIN users AS res_user ON t.responder_id = res_user.id 
            WHERE t.requester_id = ? OR t.responder_id = ?      
            ORDER BY t.created_at DESC;
        `;

		const [trades] = await pool.query(sql, [currentUserId, currentUserId]);

		console.log(`Found ${trades.length} trades for user ID: ${currentUserId}`);

		const processedTrades = trades.map(trade => {
			const isCurrentUserRequester = trade.requester_id === currentUserId;
			const otherPartyUsername = isCurrentUserRequester ? trade.responder_username : trade.requester_username;
			const otherPartyFirebaseUid = isCurrentUserRequester ? trade.responder_firebase_uid : trade.requester_firebase_uid;

			return {
				id: trade.trade_id,
				status: trade.status,
				created_at: trade.created_at,
				requester_firebase_uid: trade.requester_firebase_uid,
				responder_firebase_uid: trade.responder_firebase_uid,
				item_offered: {
					id: trade.item_offered_id,
					name: trade.item_offered_name,
					image_url: trade.item_offered_image_url,
				},
				item_requested: {
					id: trade.item_requested_id,
					name: trade.item_requested_name,
					image_url: trade.item_requested_image_url,
				},
				otherParty: {
					username: otherPartyUsername || 'Unknown User',
					firebase_uid: otherPartyFirebaseUid
				}
			};
		});

		res.json({ trades: processedTrades });

	} catch (err) {
		console.error("Error fetching trades:", err);
		res.status(500).json({ error: "Failed to fetch trades" });
	}
});

// POST /api/trades/create - Create a new trade request
router.post("/create", authenticate, async (req, res) => {
	try {
		const { item_offered_id, item_requested_id, responder_firebase_uid } = req.body;
		const requesterFirebaseUid = req.user.uid;

		if (!item_offered_id || !item_requested_id || !responder_firebase_uid) {
			console.warn(`Trade creation failed: Missing data. Offered: ${item_offered_id}, Requested: ${item_requested_id}, Responder UID: ${responder_firebase_uid}`);
			return res.status(400).json({ error: "Missing required fields: item offered, item requested, or responder UID." });
		}

		console.log(`Attempting trade creation: Offer ${item_offered_id} for ${item_requested_id} from UID ${requesterFirebaseUid} to UID ${responder_firebase_uid}`);

		const requesterUserId = await getUserIdFromFirebaseUid(requesterFirebaseUid);
		const responderUserId = await getUserIdFromFirebaseUid(responder_firebase_uid); 

		if (!requesterUserId) {
			console.error(`Trade creation failed: Could not find requester user ID for UID ${requesterFirebaseUid}`);
			return res.status(404).json({ error: "Requester user not found." });
		}
		if (!responderUserId) {
			console.error(`Trade creation failed: Could not find responder user ID for UID ${responder_firebase_uid}`);
			return res.status(404).json({ error: "Responder user not found." });
		}
		console.log(`User IDs found: Requester=${requesterUserId}, Responder=${responderUserId}`);

		const [offeredItemRows] = await pool.query("SELECT owner_id FROM items WHERE id = ?", [item_offered_id]);
		if (offeredItemRows.length === 0) {
			return res.status(404).json({ error: "Offered item not found." });
		}
		if (offeredItemRows[0].owner_id !== requesterUserId) {
			console.warn(`Trade creation failed: User ID ${requesterUserId} (UID: ${requesterFirebaseUid}) does not own offered item ${item_offered_id}`);
			return res.status(403).json({ error: "You do not own the item you are trying to offer." });
		}
		console.log(`Verified: Requester ${requesterUserId} owns item ${item_offered_id}.`);

		const [requestedItemRows] = await pool.query("SELECT owner_id FROM items WHERE id = ?", [item_requested_id]);
		if (requestedItemRows.length === 0) {
			return res.status(404).json({ error: "Requested item not found." });
		}
		if (requestedItemRows[0].owner_id !== responderUserId) {
			console.warn(`Trade creation failed: Requested item ${item_requested_id} not owned by responder ID ${responderUserId} (UID: ${responder_firebase_uid})`);
			return res.status(403).json({ error: "The requested item does not belong to the specified user." });
		}
		console.log(`Verified: Responder ${responderUserId} owns item ${item_requested_id}.`);

		const [result] = await pool.query(
			"INSERT INTO trades (item_offered_id, item_requested_id, requester_id, responder_id, status) VALUES (?, ?, ?, ?, 'pending')",
			[item_offered_id, item_requested_id, requesterUserId, responderUserId]
		);
		const tradeId = result.insertId;

		console.log(`Trade created successfully with ID: ${tradeId}`);

        const fetchNewTradeSql = `
            SELECT
                t.id AS trade_id, t.status, t.created_at,
                req_user.firebase_uid AS requester_firebase_uid,
                res_user.firebase_uid AS responder_firebase_uid,
                item_offered.id AS item_offered_id, item_offered.name AS item_offered_name, item_offered.image_url AS item_offered_image_url,
                item_requested.id AS item_requested_id, item_requested.name AS item_requested_name, item_requested.image_url AS item_requested_image_url
            FROM trades t
            LEFT JOIN users AS req_user ON t.requester_id = req_user.id
            LEFT JOIN users AS res_user ON t.responder_id = res_user.id
            LEFT JOIN items AS item_offered ON t.item_offered_id = item_offered.id
            LEFT JOIN items AS item_requested ON t.item_requested_id = item_requested.id
            WHERE t.id = ?;
        `;
        const [newTradeDetails] = await pool.query(fetchNewTradeSql, [tradeId]);

		res.status(201).json({
			message: "Trade request created successfully",
			trade: newTradeDetails[0] || { id: tradeId } 
		});

	} catch (err) {
		console.error("Error creating trade:", err);
		res.status(500).json({ error: "Failed to create trade request due to a server error." });
	}
});

// PATCH /api/trades/:tradeId/respond - Accept or reject a trade
router.patch("/:tradeId/respond", authenticate, async (req, res) => {
	const connection = await pool.getConnection();
	try {
		const { tradeId } = req.params;
		const { status } = req.body; 
		const currentUserFirebaseUid = req.user.uid;

		console.log(`Responding to trade ${tradeId} with status ${status} by user UID ${currentUserFirebaseUid}`);

		const currentUserId = await getUserIdFromFirebaseUid(currentUserFirebaseUid);
		if (!currentUserId) {
			console.error(`Could not find user ID for Firebase UID: ${currentUserFirebaseUid}`);
			await connection.release(); 
			return res.status(404).json({ error: "Current user not found in database." });
		}
		console.log(`User ID: ${currentUserId} corresponds to UID: ${currentUserFirebaseUid}`);


		if (status !== "accepted" && status !== "rejected") {
			await connection.release();
			return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'" });
		}

		await connection.beginTransaction();

		const [tradeRows] = await connection.query("SELECT * FROM trades WHERE id = ? FOR UPDATE", [tradeId]);
		const trade = tradeRows[0];

		if (!trade) {
			await connection.rollback();
			await connection.release();
			return res.status(404).json({ error: "Trade not found" });
		}

		if (trade.responder_id !== currentUserId) { 
			await connection.rollback();
			await connection.release();
			return res.status(403).json({ error: "You are not authorized to respond to this trade" });
		}

		if (trade.status !== 'pending') {
			await connection.rollback();
			await connection.release();
			return res.status(400).json({ error: `Trade has already been ${trade.status}.` });
		}

        if (status === "accepted") {
            const [requestedItemCheck] = await connection.query("SELECT owner_id FROM items WHERE id = ? FOR UPDATE", [trade.item_requested_id]);
            if (!requestedItemCheck.length || requestedItemCheck[0].owner_id !== trade.responder_id) {
                await connection.rollback();
                await connection.release();
                console.warn(`Trade ${tradeId} accept failed: Responder ${trade.responder_id} no longer owns requested item ${trade.item_requested_id}`);
                return res.status(409).json({ error: "You no longer own the item requested in this trade." });
            }

            const [offeredItemCheck] = await connection.query("SELECT owner_id FROM items WHERE id = ? FOR UPDATE", [trade.item_offered_id]);
            if (!offeredItemCheck.length || offeredItemCheck[0].owner_id !== trade.requester_id) {
                await connection.rollback();
                await connection.release();
                console.warn(`Trade ${tradeId} accept failed: Requester ${trade.requester_id} no longer owns offered item ${trade.item_offered_id}`);
                return res.status(409).json({ error: "The other user no longer owns the item they offered." });
            }
             console.log(`Trade ${tradeId} ownership verified for both items.`);
        }


		await connection.query("UPDATE trades SET status = ? WHERE id = ?", [status, tradeId]);

		if (status === "accepted") {
			console.log(`Trade ${tradeId} accepted. Swapping items: ${trade.item_offered_id} -> owner ${trade.responder_id}, ${trade.item_requested_id} -> owner ${trade.requester_id}`);
			const [update1] = await connection.query("UPDATE items SET owner_id = ? WHERE id = ?", [trade.responder_id, trade.item_offered_id]);
			const [update2] = await connection.query("UPDATE items SET owner_id = ? WHERE id = ?", [trade.requester_id, trade.item_requested_id]);

			if (update1.affectedRows === 0 || update2.affectedRows === 0) {
				console.error(`Failed ownership update for trade ${tradeId}. Update1: ${update1.affectedRows}, Update2: ${update2.affectedRows}`);
				await connection.rollback();
				await connection.release();
				return res.status(500).json({ error: "Failed to update item ownership during trade." });
			}
		}

		await connection.commit();
		console.log(`Trade ${tradeId} successfully responded with status: ${status}`);

		res.json({
			message: `Trade ${status}`,
			tradeId,
		});
	} catch (err) {
		await connection.rollback();
		console.error(`Error responding to trade ${req.params.tradeId}:`, err);
		res.status(500).json({ error: `Failed to ${req.body.status || 'process'} trade due to a server error.` });
	} finally {
		if (connection) connection.release();
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
		console.error("Error fetching trade details:", err);
		res.status(500).json({ error: "Failed to fetch trade details" });
	}
});

module.exports = router;
