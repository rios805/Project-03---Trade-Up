const pool = require("../db/pool").promise();

async function findOrCreateUser(firebaseUser) {
	const { uid, email, name } = firebaseUser;
	console.log(`[findOrCreateUser] Finding or creating user for UID: ${uid}, Email: ${email}`);
	try {
		const [existingRows] = await pool.query("SELECT * FROM users WHERE firebase_uid = ?", [uid]);
		if (existingRows.length > 0) {
			console.log(`[findOrCreateUser] Found existing user: ID ${existingRows[0].id}`);
			return existingRows[0];
		}
		console.log(`[findOrCreateUser] No existing user found. Creating new user...`);
		const [insertResult] = await pool.query("INSERT INTO users (username, email, trade_credit, firebase_uid) VALUES (?, ?, ?, ?)", [name || `User_${uid.substring(0, 5)}`, email, 0, uid]);
		console.log(`[findOrCreateUser] New user created with ID: ${insertResult.insertId}`);
		const [newRows] = await pool.query("SELECT * FROM users WHERE id = ?", [insertResult.insertId]);
		return newRows[0];
	} catch (err) {
		console.error(`[findOrCreateUser] Error finding or creating user for UID ${uid}:`, err);
		return null;
	}
}

/**
 * Updates a user's trade credit by amount (+/-)
 * @param {number} userId - Internal User ID
 * @param {number} delta - Amount to add/subtract
 * @param {object} [db=pool] - Optional DB connection or pool to use (this defaults to pool (mentioning because it caused me problems))
 * @returns {Promise<number | null>} New credit balance or null on failure
 */
async function updateTradeCredit(userId, delta, db = pool) {
	console.log(`[updateTradeCredit] Attempting to update credit for user ${userId} by ${delta}`);
	if (typeof userId !== "number" || isNaN(userId) || userId <= 0) {
		console.error(`[updateTradeCredit] Invalid userId: ${userId}`);
		return null;
	}
	if (typeof delta !== "number" || isNaN(delta)) {
		console.error(`[updateTradeCredit] Invalid delta: ${delta}`);
		return null;
	}

	try {
		const updateSql = "UPDATE users SET trade_credit = trade_credit + ? WHERE id = ?";
		const [updateResult] = await db.query(updateSql, [delta, userId]);
		console.log(`[updateTradeCredit] Update result for user ${userId}:`, updateResult);

		if (updateResult.affectedRows === 0) {
			console.warn(`[updateTradeCredit] Update affected 0 rows for user ${userId}. User might not exist.`);
			return null;
		}

		const [selectResult] = await db.query("SELECT trade_credit FROM users WHERE id = ?", [userId]);

		if (selectResult.length > 0) {
			const newBalance = selectResult[0].trade_credit;
			console.log(`[updateTradeCredit] Successfully updated credit for user ${userId}. New balance: ${newBalance}`);
			return newBalance;
		} else {
			console.error(`[updateTradeCredit] Could not fetch new balance for user ${userId} after successful update.`);
			return null;
		}
	} catch (err) {
		console.error(`[updateTradeCredit] Error updating credit for user ${userId}:`, err);
		throw err;
	}
}

async function setTradeCredit(userId, newAmount) {
	return new Promise((resolve, reject) => {
		pool.query("UPDATE users SET trade_credit = ? WHERE id = ?", [newAmount, userId], (err) => {
			if (err) return reject(err);
			resolve(newAmount);
		});
	});
}

module.exports = {
	findOrCreateUser,
	updateTradeCredit,
	setTradeCredit,
};
