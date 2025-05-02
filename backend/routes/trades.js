const express = require("express");
const router = express.Router();
const authenticate = require("../authMiddleware");
const pool = require("../db/pool").promise();
const { updateTradeStatus, getTradeById } = require("../db/tradeQueries");
const { getItemById } = require("../db/itemQueries");

// --- Helper Function to get User Integer ID --- (This doesn't have to be a helper function, it can even be in a different file, I just didn't want to create a new file for this)
async function getUserIdFromFirebaseUid(firebaseUid) {
    console.log(`[Helper Trade] Looking up user ID for Firebase UID: ${firebaseUid}`);
    if (!firebaseUid) {
        console.error("[Helper Trade] Received null or undefined firebaseUid");
        return null;
    }
    try {
        const [userRows] = await pool.query("SELECT id FROM users WHERE firebase_uid = ?", [firebaseUid]);
        console.log(`[Helper Trade] Found user rows for UID ${firebaseUid}:`, userRows);
        return userRows.length > 0 ? userRows[0].id : null;
    } catch (dbError) {
        console.error(`[Helper Trade] Database error looking up UID ${firebaseUid}:`, dbError);
        return null;
    }
}


// GET /api/trades/me - Get all trades for the current user with item and user details
router.get("/me", authenticate, async (req, res) => {
    console.log("[Route /trades/me] Request received.");
	try {
		const currentUserFirebaseUid = req.user.uid;
        console.log(`[Route /trades/me] Fetching trades for user UID: ${currentUserFirebaseUid}`);

		const currentUserId = await getUserIdFromFirebaseUid(currentUserFirebaseUid);
		if (!currentUserId) {
			console.error(`[Route /trades/me] Could not find user ID for Firebase UID: ${currentUserFirebaseUid}`);
			return res.status(404).json({ error: "Current user not found in database." });
		}
		console.log(`[Route /trades/me] User ID: ${currentUserId} corresponds to UID: ${currentUserFirebaseUid}`);

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
        console.log(`[Route /trades/me] Found ${trades.length} trades for user ID: ${currentUserId}`);

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
		console.error("[Route /trades/me] Error fetching trades:", err);
		res.status(500).json({ error: "Failed to fetch trades" });
	}
});

// POST /api/trades/create - Create a new trade request
router.post("/create", authenticate, async (req, res) => {
    console.log("[Route /trades/create] Request received. Body:", req.body);
	try {

		const { item_offered_id, item_requested_id, responder_firebase_uid } = req.body;
		const requesterFirebaseUid = req.user.uid;

        console.log(`[Route /trades/create] Destructured values: offered=${item_offered_id}, requested=${item_requested_id}, requesterUID=${requesterFirebaseUid}, responderUID=${responder_firebase_uid}`);

        if (item_offered_id === undefined || item_requested_id === undefined || !responder_firebase_uid || !requesterFirebaseUid) {
             console.error("[Route /trades/create] Missing required fields in request body or auth token.");
             return res.status(400).json({ error: "Missing required information for trade creation." });
        }
        if (requesterFirebaseUid === responder_firebase_uid) {
             console.warn("[Route /trades/create] User attempting to trade with themselves.");
             return res.status(400).json({ error: "You cannot trade with yourself." });
        }

		const requesterUserId = await getUserIdFromFirebaseUid(requesterFirebaseUid);
		const responderUserId = await getUserIdFromFirebaseUid(responder_firebase_uid); // Use the correctly destructured variable

		if (!requesterUserId || !responderUserId) {
			console.warn(`[Route /trades/create] Trade creation failed: Could not find user IDs for UIDs ${requesterFirebaseUid} or ${responder_firebase_uid}`);
			return res.status(404).json({ error: "One or both users not found in the database." });
		}
		 console.log(`[Route /trades/create] User IDs found: Requester=${requesterUserId}, Responder=${responderUserId}`);

        const [offeredItemRows] = await pool.query("SELECT owner_id FROM items WHERE id = ?", [item_offered_id]);
        if (offeredItemRows.length === 0) {
             console.warn(`[Route /trades/create] Offered item ${item_offered_id} not found.`);
             return res.status(404).json({ error: "The item you are offering does not exist." });
        }
        if (offeredItemRows[0].owner_id !== requesterUserId) {
             console.warn(`[Route /trades/create] Trade creation failed: User ID ${requesterUserId} does not own item ${item_offered_id}`);
             return res.status(403).json({ error: "You can only offer items you currently own." });
        }

         const [requestedItemRows] = await pool.query("SELECT owner_id FROM items WHERE id = ?", [item_requested_id]);
         if (requestedItemRows.length === 0) {
             console.warn(`[Route /trades/create] Requested item ${item_requested_id} not found.`);
             return res.status(404).json({ error: "The requested item does not exist." });
         }
         if (requestedItemRows[0].owner_id !== responderUserId) {
              console.warn(`[Route /trades/create] Trade creation failed: Requested item ${item_requested_id} not owned by responder ID ${responderUserId}`);
              return res.status(403).json({ error: "The requested item does not belong to the specified user." });
         }

		const [result] = await pool.query(
            "INSERT INTO trades (item_offered_id, item_requested_id, requester_id, responder_id, status) VALUES (?, ?, ?, ?, 'pending')",
            [item_offered_id, item_requested_id, requesterUserId, responderUserId]
        );
        const tradeId = result.insertId;

        console.log(`[Route /trades/create] Trade created successfully with ID: ${tradeId}`);

		res.status(201).json({
			message: "Trade request created successfully",
			tradeId,
		});
	} catch (err) {
		console.error("[Route /trades/create] Error creating trade:", err);
		res.status(500).json({ error: "Failed to create trade request due to a server error." });
	}
});

// PATCH /api/trades/:tradeId/respond - Accept or reject a trade
router.patch("/:tradeId/respond", authenticate, async (req, res) => {
    console.log(`[Route /trades/:tradeId/respond] Request received for trade ID: ${req.params.tradeId}, Body:`, req.body);
	const connection = await pool.getConnection(); // Use connection for transaction
	try {
		const { tradeId } = req.params;
		const { status } = req.body;
		const currentUserFirebaseUid = req.user.uid;

        const numericTradeId = Number(tradeId);
        if (isNaN(numericTradeId)) {
            return res.status(400).json({ error: "Invalid trade ID format." });
        }

        console.log(`[Route /trades/:tradeId/respond] Responding to trade ${numericTradeId} with status ${status} by user UID ${currentUserFirebaseUid}`);

		const currentUserId = await getUserIdFromFirebaseUid(currentUserFirebaseUid);
		 if (!currentUserId) {
			console.error(`[Route /trades/:tradeId/respond] Could not find user ID for Firebase UID: ${currentUserFirebaseUid}`);
			return res.status(404).json({ error: "Current user not found in database." });
		}
		 console.log(`[Route /trades/:tradeId/respond] User ID: ${currentUserId} corresponds to UID: ${currentUserFirebaseUid}`);

		if (status !== "accepted" && status !== "rejected") {
			return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'" });
		}

        await connection.beginTransaction();
        console.log(`[Route /trades/:tradeId/respond] Transaction started for trade ${numericTradeId}.`);

		const [tradeRows] = await connection.query("SELECT * FROM trades WHERE id = ? FOR UPDATE", [numericTradeId]);
        const trade = tradeRows[0];

		if (!trade) {
            await connection.rollback();
            console.warn(`[Route /trades/:tradeId/respond] Trade not found: ${numericTradeId}`);
			return res.status(404).json({ error: "Trade not found" });
		}

		if (trade.responder_id !== currentUserId) {
             await connection.rollback();
             console.warn(`[Route /trades/:tradeId/respond] User ${currentUserId} (${currentUserFirebaseUid}) is not authorized to respond to trade ${numericTradeId} (Responder ID: ${trade.responder_id}).`);
			 return res.status(403).json({ error: "You are not authorized to respond to this trade" });
		}

        if (trade.status !== 'pending') {
             await connection.rollback();
             console.warn(`[Route /trades/:tradeId/respond] Trade ${numericTradeId} already has status: ${trade.status}.`);
             return res.status(400).json({ error: `Trade has already been ${trade.status}.` });
        }

		await connection.query("UPDATE trades SET status = ? WHERE id = ?", [status, numericTradeId]);
         console.log(`[Route /trades/:tradeId/respond] Updated status of trade ${numericTradeId} to ${status}.`);

		if (status === "accepted") {
            console.log(`[Route /trades/:tradeId/respond] Trade ${numericTradeId} accepted. Swapping items: ${trade.item_offered_id} -> owner ${trade.responder_id}, ${trade.item_requested_id} -> owner ${trade.requester_id}`);

            if (!trade.item_offered_id || !trade.item_requested_id || !trade.responder_id || !trade.requester_id) {
                 console.error(`[Route /trades/:tradeId/respond] Missing critical IDs in trade record ${numericTradeId}. Cannot swap items.`);
                 throw new Error("Internal error: Trade record is incomplete."); // Will trigger rollback
            }

			const [update1] = await connection.query("UPDATE items SET owner_id = ? WHERE id = ?", [trade.responder_id, trade.item_offered_id]);
			const [update2] = await connection.query("UPDATE items SET owner_id = ? WHERE id = ?", [trade.requester_id, trade.item_requested_id]);

            if (update1.affectedRows === 0 || update2.affectedRows === 0) {
                 console.error(`[Route /trades/:tradeId/respond] Failed ownership update for trade ${numericTradeId}. Update1: ${update1.affectedRows}, Update2: ${update2.affectedRows}. Items might be missing or already transferred.`);
                 throw new Error("Failed to update item ownership during trade. Items might be missing.");
            }
             console.log(`[Route /trades/:tradeId/respond] Item ownership swapped successfully for trade ${numericTradeId}.`);
		}

        await connection.commit();
        console.log(`[Route /trades/:tradeId/respond] Transaction committed successfully for trade ${numericTradeId}.`);

		res.json({
			message: `Trade ${status}`,
			tradeId: numericTradeId, 
		});
	} catch (err) {
        await connection.rollback();
		console.error(`[Route /trades/:tradeId/respond] Error responding to trade:`, err);
		res.status(500).json({ error: `Failed to ${req.body.status || 'process'} trade due to a server error.` });
	} finally {
        if (connection) connection.release(); 
    }
});


// GET /api/trades/:tradeId - Get details of a specific trade
router.get("/:tradeId", authenticate, async (req, res) => {
    console.log(`[Route /trades/:tradeId] Request received for trade ID: ${req.params.tradeId}`);
	try {
        const numericTradeId = Number(req.params.tradeId);
        if (isNaN(numericTradeId)) {
            return res.status(400).json({ error: "Invalid trade ID format." });
        }

		const trade = await getTradeById(numericTradeId);

		if (!trade) {
            console.warn(`[Route /trades/:tradeId] Trade not found: ${numericTradeId}`);
			return res.status(404).json({ error: "Trade not found" });
		}

        console.log(`[Route /trades/:tradeId] Found trade details for ID: ${numericTradeId}`);
		res.json({ trade }); 

	} catch (err) {
		console.error(`[Route /trades/:tradeId] Error fetching trade details for ID ${req.params.tradeId}:`, err);
		res.status(500).json({ error: "Failed to fetch trade details" });
	}
});

module.exports = router;
