//@ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, Alert, RefreshControl } from "react-native";
import MarketItem from "../../components/MarketItem";
import axios from "axios";
import { auth } from "../../utils/firebaseConfig";

interface MarketItemType {
	id: number;
	image_url: string;
	hidden_value: number;
	name: string;
	description: string;
}

export default function Market() {
	const [marketItems, setMarketItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const { width: screenWidth } = useWindowDimensions();
	const ITEM_MARGIN = 10;

	let columns = 5;
	if (screenWidth < 600) {
		columns = 2;
	} else if (screenWidth < 900) {
		columns = 3;
	}

	const itemWidth = (screenWidth - ITEM_MARGIN * (columns + 1)) / columns;

	const fetchMarketItems = useCallback(async () => {
		console.log("Starting fetchMarketItems...");
		setLoading(true);

		try {
			const user = auth.currentUser;
			console.log("Current user:", user);

			if (!user) {
				Alert.alert("Not logged in", "Please log in to view market items.");
				setLoading(false);
				return;
			}

			const token = await user.getIdToken().catch((e) => {
				console.error("Error getting token:", e);
				throw e;
			});
			console.log("Got ID token");

			const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/marketplace`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			console.log("Got market items:", response.data.length);
			setMarketItems(response.data);
		} catch (error) {
			console.error("Failed to fetch market items:", error);
			Alert.alert("Error", "Failed to load market items.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchMarketItems();
	}, [fetchMarketItems]);

	useEffect(() => {
		console.log("useEffect running...");
		fetchMarketItems();
	}, [fetchMarketItems]);

	const handlePurchaseComplete = (itemId) => {
		setMarketItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
	};

	return (
		<>
			<View style={styles.bannerContainer}>
				<Text style={styles.bannerText}>Marketplace</Text>
			</View>

			{loading && !refreshing ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#4CAF50" />
				</View>
			) : (
				<ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />}>
					{marketItems.length === 0 ? (
						<View style={styles.emptyContainer}>
							<Text style={styles.emptyText}>No items available in the marketplace</Text>
						</View>
					) : (
						<View style={[styles.itemsContainer, { maxWidth: screenWidth - ITEM_MARGIN * 2 }]}>
							{marketItems.map((item) => (
								<View key={item.id} style={[styles.marketItem, { width: itemWidth, margin: ITEM_MARGIN / 2 }]}>
									<MarketItem id={item.id} imageUrl={item.image_url} price={item.hidden_value} title={item.name} description={item.description} onPurchaseComplete={handlePurchaseComplete} />
								</View>
							))}
						</View>
					)}
				</ScrollView>
			)}
		</>
	);
}

const styles = StyleSheet.create({
	bannerContainer: {
		width: "100%",
		backgroundColor: "#4CAF50",
		paddingVertical: 15,
		alignItems: "center",
		marginBottom: 20,
	},
	bannerText: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#fff",
	},
	scrollContainer: {
		flexGrow: 1,
		alignItems: "center",
		paddingBottom: 20,
	},
	itemsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		alignItems: "flex-start",
		width: "100%",
	},
	marketItem: {
		marginBottom: 20,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingTop: 50,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingTop: 100,
	},
	emptyText: {
		fontSize: 18,
		color: "#666",
		textAlign: "center",
	},
});
