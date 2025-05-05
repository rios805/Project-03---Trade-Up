// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, RefreshControl, Image } from "react-native";
import axios from "axios";
import { auth } from "../../utils/firebaseConfig";
import { useRouter } from "expo-router";

const fetchTrades = async (token) => {
	console.log("[TradesScreen] Fetching trades from /api/trades/me");
	const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/trades/me`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	console.log("[TradesScreen] Received trades data:", response.data);
	return response.data.trades || [];
};

const respondToTrade = async (token, tradeId, status) => {
	console.log(`[TradesScreen] Sending response for trade ${tradeId}: ${status}`);
	await axios.patch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/trades/${tradeId}/respond`, { status }, { headers: { Authorization: `Bearer ${token}` } });
	console.log(`[TradesScreen] Response sent successfully for trade ${tradeId}`);
};

export default function TradesScreen() {
	const [trades, setTrades] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const router = useRouter();
	const currentUserUid = auth.currentUser?.uid;

	const loadTrades = useCallback(async () => {
		setError(null);
		if (!refreshing) {
			setLoading(true);
		}
		try {
			const user = auth.currentUser;
			if (!user) {
				console.warn("[TradesScreen] User not logged in during loadTrades.");
				throw new Error("User not logged in.");
			}
			console.log(`[TradesScreen] Current User UID for loading trades: ${user.uid}`);
			const token = await user.getIdToken();
			const fetchedTrades = await fetchTrades(token);
			setTrades(fetchedTrades);
		} catch (err) {
			console.error("[TradesScreen] Failed to load trades:", err);
			setError(err.message || "Failed to load trades.");
			if (err?.response?.status === 401 || err?.response?.status === 403) {
				Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
			}
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [refreshing, router]);

	useEffect(() => {
		console.log("[TradesScreen] Component mounted or loadTrades changed.");
		loadTrades();
	}, [loadTrades]);

	const handleRespond = async (tradeId, status) => {
		console.log(`[TradesScreen] handleRespond called for trade ${tradeId}, status: ${status}. Proceeding directly.`);
		try {
			const user = auth.currentUser;
			if (!user) throw new Error("User not logged in.");
			const token = await user.getIdToken();
			await respondToTrade(token, tradeId, status);
			console.log(`[TradesScreen] Trade ${tradeId} ${status} successfully. Refreshing list...`);
			Alert.alert("Success", `Trade ${status} successfully.`);
			setRefreshing(true);
			loadTrades();
		} catch (err) {
			console.error(`[TradesScreen] Failed to ${status} trade:`, err);
			Alert.alert("Error", `Failed to ${status} trade: ${err.response?.data?.error || err.message}`);
		}
	};

	const renderItemColumn = (item, label) => (
		<View style={styles.tradeColumn}>
			<Text style={styles.tradeHeader}>{label}</Text>
			<Image source={{ uri: item.image_url || "https://placehold.co/100x100/222/ccc?text=No+Image" }} style={styles.itemImage} onError={(e) => console.log(`[TradesScreen] Failed to load image: ${item.image_url}`, e.nativeEvent.error)} />
			<Text style={styles.itemText} numberOfLines={1} ellipsizeMode="tail">
				{item.name || "Unknown Item"} (ID: {item.id})
			</Text>
		</View>
	);

	const renderTradeItem = ({ item }) => {
		const isIncoming = item.responder_firebase_uid === currentUserUid;
		const canRespond = isIncoming && item.status === "pending";
		const otherPartyUsername = item.otherParty?.username || "Unknown User";

		return (
			<View style={styles.tradeCard}>
				<View style={styles.cardHeader}>
					<Text style={[styles.tradeStatus, styles[`status_${item.status}`]]}>{item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "Unknown"}</Text>
					<Text style={styles.otherPartyText}>{isIncoming ? `From: ${otherPartyUsername}` : `To: ${otherPartyUsername}`}</Text>
				</View>

				<View style={styles.tradeDetails}>
					{renderItemColumn(item.item_offered, isIncoming ? "They Offer:" : "You Offer:")}
					<View style={styles.arrowContainer}>
						<Text style={styles.arrowText}>⇄</Text>
					</View>
					{renderItemColumn(item.item_requested, isIncoming ? "For Your:" : "For Their:")}
				</View>

				{canRespond && (
					<View style={styles.buttonRow}>
						<Pressable
							style={[styles.button, styles.acceptButton]}
							onPress={() => {
								console.log(`[TradesScreen] Accept button pressed for trade ID: ${item.id}`);
								handleRespond(item.id, "accepted");
							}}
						>
							<Text style={styles.buttonText}>Accept</Text>
						</Pressable>
						<Pressable
							style={[styles.button, styles.rejectButton]}
							onPress={() => {
								console.log(`[TradesScreen] Reject button pressed for trade ID: ${item.id}`);
								handleRespond(item.id, "rejected");
							}}
						>
							<Text style={styles.buttonText}>Reject</Text>
						</Pressable>
					</View>
				)}
				<Text style={styles.tradeDate}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
			</View>
		);
	};

	if (loading && !refreshing) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#4CAF50" />
			</View>
		);
	}

	if (error && !loading) {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorText}>{error}</Text>
				<Pressable style={[styles.button, styles.retryButton]} onPress={loadTrades}>
					<Text style={styles.buttonText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Your Trades</Text>
			<FlatList data={trades} renderItem={renderTradeItem} keyExtractor={(item) => item.id.toString()} ListEmptyComponent={<Text style={styles.emptyText}>You have no active trades.</Text>} contentContainerStyle={styles.listContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTrades} colors={["#4CAF50"]} tintColor={"#4CAF50"} />} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#000", paddingTop: 50, paddingHorizontal: 10 },
	centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000", padding: 20 },
	title: { fontSize: 28, fontWeight: "bold", color: "#4CAF50", textAlign: "center", marginBottom: 20 },
	listContainer: { paddingBottom: 20 },
	tradeCard: {
		backgroundColor: "#1a1a1a",
		borderRadius: 12,
		padding: 15,
		marginBottom: 15,
		borderColor: "#333",
		borderWidth: 1,
		shadowColor: "#0f0",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
	tradeStatus: {
		fontSize: 15,
		fontWeight: "bold",
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: 5,
		overflow: "hidden",
		textTransform: "capitalize",
	},
	status_pending: { backgroundColor: "#444", color: "#ccc" },
	status_accepted: { backgroundColor: "#1a4d2e", color: "#4CAF50" },
	status_rejected: { backgroundColor: "#5d212a", color: "#ff6347" },
	otherPartyText: { fontSize: 14, color: "#aaa" },
	tradeDetails: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginBottom: 10 },
	arrowContainer: { paddingHorizontal: 10 },
	arrowText: { fontSize: 24, color: "#888", fontWeight: "bold" },
	tradeColumn: { flex: 1, alignItems: "center" },
	tradeHeader: { fontSize: 13, color: "#999", marginBottom: 8, fontWeight: "600" },
	itemImage: { width: 60, height: 60, borderRadius: 8, marginBottom: 5, backgroundColor: "#333" },
	itemText: { fontSize: 13, color: "#ddd", textAlign: "center" },
	tradeDate: { fontSize: 11, color: "#666", marginTop: 10, textAlign: "right" },
	buttonRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
		marginTop: 15,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "#333",
	},
	button: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginLeft: 10,
		minWidth: 80,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 2,
	},
	acceptButton: { backgroundColor: "#4CAF50" },
	rejectButton: { backgroundColor: "#ff6347" },
	retryButton: { backgroundColor: "#4CAF50", marginTop: 20, paddingVertical: 10, paddingHorizontal: 20 },
	buttonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
	emptyText: { color: "#888", textAlign: "center", marginTop: 50, fontSize: 16 },
	errorText: { color: "#ff6347", textAlign: "center", fontSize: 16, marginBottom: 10 },
});
