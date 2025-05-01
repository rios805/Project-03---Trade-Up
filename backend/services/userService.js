const pool = require("../db/pool");

/**
 * Finds a user by Firebase UID or creates them if not found.
 * @param {Object} firebaseUser - Contains uid, email, and name
 * @returns {Object} User record from DB
 */
async function findOrCreateUser(firebaseUser) {
	const { uid, email, name } = firebaseUser;

	return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM users WHERE firebase_uid = ?", [uid], (err, rows) => {
			if (err) return reject(err);

			if (rows.length > 0) {
				return resolve(rows[0]);
			}

			// Create new user
			pool.query("INSERT INTO users (username, email, trade_credit, firebase_uid) VALUES (?, ?, ?, ?)", [name, email, 0, uid], (err) => {
				if (err) return reject(err);

				resolve({
					username: name,
					email,
					trade_credit: 0,
					firebase_uid: uid,
				});
			});
		});
	});
}

/**
 * Updates a user's trade credit by amount (+/-)
 * @param {string} userId - User ID
 * @param {number} delta - Amount to add/subtract
 * @returns {number} New credit balance
 */
async function updateTradeCredit(userId, delta) {
	return new Promise((resolve, reject) => {
		pool.query("UPDATE users SET trade_credit = trade_credit + ? WHERE id = ?", [delta, userId], (err) => {
			if (err) return reject(err);

			pool.query("SELECT trade_credit FROM users WHERE id = ?", [userId], (err, rows) => {
				if (err) return reject(err);
				resolve(rows[0]?.trade_credit ?? null);
			});
		});
	});
}

/**
 * Sets a user's trade credit to an exact value for testing purposes
 */
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
