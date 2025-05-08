//@ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	useWindowDimensions,
	ActivityIndicator,
	Alert,
	RefreshControl,
	Pressable,
	Platform,
	SafeAreaView,
	StatusBar,
	TextInput, 
} from "react-native";
import MarketItem from "../../components/MarketItem";
import axios from "axios";
import { auth } from "../../utils/firebaseConfig";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const AppColors = {
	backgroundPrimary: "#000000", 
	backgroundSecondary: "#121212", 
	textPrimary: "#FFFFFF",
	textSecondary: "rgba(235, 235, 245, 0.65)", 
	accentBlue: "#0A84FF", 
	accentGreen: "#34C759", 
	accentRed: "#FF3B30", 
	fillTertiary: "rgba(118, 118, 128, 0.24)", 
	fillQuaternary: "rgba(118, 118, 128, 0.12)", 
	separator: "rgba(84, 84, 88, 0.45)", 
	placeholderText: "rgba(235, 235, 245, 0.45)", 
	cardBackground: "#1C1C1E", 
	cardBorder: "rgba(84, 84, 88, 0.35)", 
	loadingIndicator: "#0A84FF",
	buttonTextPrimary: "#FFFFFF",
	searchBarBackground: "rgba(118, 118, 128, 0.18)",
	searchBarPlaceholder: "rgba(235, 235, 245, 0.45)",
	modalOverlayBackground: "rgba(0, 0, 0, 0.75)", 
	modalContentBackground: "#1C1C1E", 
};

const ITEM_MARGIN = Platform.OS === "web" ? 20 : 16;
const CONTAINER_PADDING = Platform.OS === "web" ? 32 : 20;

export default function MarketScreen() {
	const [allItems, setAllItems] = useState([]);
	const [viewMode, setViewMode] = useState("player");
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const { width: screenWidth } = useWindowDimensions();
	const router = useRouter();
	const currentUserUid = auth.currentUser?.uid;

	let columns = 2;
	if (screenWidth >= 1280) {
		columns = 4;
	} else if (screenWidth >= 960) {
		columns = 3;
	} else if (screenWidth >= 640) {
		columns = 2;
	} else {
		columns = 1;
	}
	if (Platform.OS === 'web' && screenWidth < 540) columns = 1;

	const itemWidth = useMemo(() => {
		const availableWidth = screenWidth - CONTAINER_PADDING * 2;
		if (columns === 1) return availableWidth - ITEM_MARGIN;
		return (availableWidth - ITEM_MARGIN * (columns - 1)) / columns;
	}, [screenWidth, columns]);

	const fetchMarketItems = useCallback(async () => {
		if (!refreshing) setLoading(true);
		setError(null);
		try {
			const user = auth.currentUser;
			if (!user) {
				Alert.alert("Not logged in", "Please log in to view market items.");
				setLoading(false); setRefreshing(false);
				router.replace("/pages/login");
				return;
			}
			const token = await user.getIdToken(true);
			const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/marketplace`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setAllItems(response.data || []);
		} catch (err) {
			const errorMsg = err.response?.data?.error || err.message || "Failed to load market items.";
			setError(errorMsg);
			setAllItems([]);
			if (err.response?.status === 401 || err.response?.status === 403) {
				Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
			}
		} finally {
			setLoading(false); setRefreshing(false);
		}
	}, [refreshing, router]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchMarketItems();
	}, [fetchMarketItems]);

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user) {
				fetchMarketItems();
			} else {
				router.replace("/pages/login");
			}
		});
		return () => unsubscribe();
	}, [fetchMarketItems, router]);

	const filteredMarketItems = useMemo(() => {
		let itemsToFilter = [];
		if (viewMode === "player") {
			itemsToFilter = allItems.filter((item) => item.ownerFirebaseUid !== null && item.ownerFirebaseUid !== currentUserUid);
		} else {
			itemsToFilter = allItems.filter((item) => item.ownerFirebaseUid === null);
		}

		if (searchQuery.trim() === "") {
			return itemsToFilter;
		}

		return itemsToFilter.filter(
			(item) =>
				item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.description?.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [allItems, viewMode, currentUserUid, searchQuery]);

	const handlePurchaseComplete = (purchasedItemId) => {
		setAllItems((prevItems) => prevItems.filter((item) => item.id !== purchasedItemId));
	};

	const renderHeader = () => (
		<>
			<View style={styles.bannerContainer}>
				<Text style={styles.bannerText}>Marketplace</Text>
			</View>
			<View style={styles.controlsContainer}>
				<View style={styles.searchBarContainer}>
					<Ionicons name="search-outline" size={20} color={AppColors.placeholderText} style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search items..."
						placeholderTextColor={AppColors.placeholderText}
						value={searchQuery}
						onChangeText={setSearchQuery}
						clearButtonMode="while-editing"
						autoCorrect={false}
						spellCheck={false}
					/>
				</View>
				<View style={styles.toggleContainer}>
					<Pressable
						style={({ pressed }) => [
							styles.toggleButton,
							viewMode === "player" && styles.toggleButtonActive,
							pressed && styles.toggleButtonPressed,
						]}
						onPress={() => setViewMode("player")}
					>
						<Text style={[styles.toggleButtonText, viewMode === "player" && styles.toggleButtonTextActive]}>Player Items</Text>
					</Pressable>
					<Pressable
						style={({ pressed }) => [
							styles.toggleButton,
							viewMode === "system" && styles.toggleButtonActive,
							pressed && styles.toggleButtonPressed,
						]}
						onPress={() => setViewMode("system")}
					>
						<Text style={[styles.toggleButtonText, viewMode === "system" && styles.toggleButtonTextActive]}>System Items</Text>
					</Pressable>
				</View>
			</View>
			{error && (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			)}
		</>
	);

	return (
		<LinearGradient colors={[AppColors.backgroundPrimary, AppColors.backgroundPrimary]} style={styles.gradientBackground}>
			<SafeAreaView style={styles.safeArea}>
				{Platform.OS !== "web" && <StatusBar barStyle="light-content" />}
				{renderHeader()}
				{loading && !refreshing ? (
					<View style={styles.centeredMessageContainer}>
						<ActivityIndicator size="large" color={AppColors.loadingIndicator} />
						<Text style={styles.loadingText}>Fetching Market Goods...</Text>
					</View>
				) : filteredMarketItems.length === 0 ? (
					<ScrollView
						contentContainerStyle={styles.centeredMessageContainer}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accentGreen]} tintColor={AppColors.accentGreen} />}
					>
						<Ionicons name="bag-handle-outline" size={64} color={AppColors.textSecondary} />
						<Text style={styles.emptyText}>
							{searchQuery ? "No items match your search." : (viewMode === "player" ? "No items from other players right now." : "No system items available currently.")}
						</Text>
					</ScrollView>
				) : (
					<ScrollView
						contentContainerStyle={styles.scrollContainer}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accentGreen]} tintColor={AppColors.accentGreen} />}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.itemsGridContainer}>
							{filteredMarketItems.map((item) => (
								<View key={item.id.toString()} style={[styles.marketItemWrapper, { width: itemWidth, marginHorizontal: ITEM_MARGIN / 2, marginBottom: ITEM_MARGIN }]}>
									<MarketItem id={item.id} imageUrl={item.image_url} price={item.hidden_value} title={item.name} description={item.description} ownerFirebaseUid={item.ownerFirebaseUid} onPurchaseComplete={handlePurchaseComplete} />
								</View>
							))}
						</View>
					</ScrollView>
				)}
			</SafeAreaView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	gradientBackground: {
		flex: 1,
	},
	safeArea: {
		flex: 1,
		paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
		backgroundColor: AppColors.backgroundPrimary,
	},
	bannerContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Platform.OS === 'web' ? 16 : 12, 
		paddingHorizontal: CONTAINER_PADDING,
		backgroundColor: AppColors.backgroundPrimary,
		borderBottomWidth: 1,
		borderBottomColor: AppColors.separator,
	},
	bannerText: {
		fontSize: Platform.OS === 'web' ? 18 : 16, 
		fontWeight: "600", 
		color: AppColors.textPrimary,
		fontFamily: "sans-serif",
	},
	controlsContainer: {
		paddingHorizontal: CONTAINER_PADDING,
		paddingTop: 12,
		paddingBottom: 8, 
		backgroundColor: AppColors.backgroundPrimary,
		borderBottomWidth: 1,
		borderBottomColor: AppColors.separator,
		marginBottom: Platform.OS === 'web' ? 15 : 10, 
	},
	searchBarContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: AppColors.searchBarBackground,
		borderRadius: 10,
		paddingHorizontal: 10,
		marginBottom: 16, 
		height: Platform.OS === 'web' ? 40 : 38,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		height: '100%',
		color: AppColors.textPrimary,
		fontSize: 16,
		fontFamily: "sans-serif",
	},
	toggleContainer: {
		flexDirection: "row",
		justifyContent: "center",
		backgroundColor: AppColors.fillQuaternary,
		borderRadius: 9, 
		padding: 2,
	},
	toggleButton: {
		flex: 1,
		paddingVertical: Platform.OS === 'web' ? 7 : 6, 
		paddingHorizontal: 10,
		borderRadius: 7, 
		alignItems: 'center',
	},
	toggleButtonActive: {
		backgroundColor: AppColors.accentBlue,
		shadowColor: "rgba(0, 0, 0, 0.2)",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.8,
		shadowRadius: 3,
		elevation: 3, 
	},
	toggleButtonPressed: {
		backgroundColor: "rgba(118, 118, 128, 0.35)", 
	},
	toggleButtonText: {
		color: AppColors.textSecondary,
		fontWeight: "500",
		fontSize: 13,
		fontFamily: "sans-serif",
	},
	toggleButtonTextActive: {
		color: AppColors.buttonTextPrimary,
		fontWeight: "600", 
	},
	errorContainer: {
		padding: 15,
		backgroundColor: AppColors.accentRed,
		alignItems: "center",
		marginHorizontal: CONTAINER_PADDING,
		borderRadius: 10,
		marginBottom: 10,
	},
	errorText: {
		color: AppColors.buttonTextPrimary,
		fontSize: 14,
		textAlign: "center",
		fontFamily: "sans-serif",
	},
	scrollContainer: {
		paddingTop: 5, 
		paddingBottom: CONTAINER_PADDING + ITEM_MARGIN,
		paddingHorizontal: CONTAINER_PADDING - ITEM_MARGIN / 2,
	},
	itemsGridContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "flex-start",
	},
	marketItemWrapper: {
	},
	centeredMessageContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	loadingText: {
		marginTop: 15,
		fontSize: 16,
		color: AppColors.textSecondary,
		fontFamily: "sans-serif",
	},
	emptyText: {
		fontSize: 17,
		color: AppColors.textSecondary,
		textAlign: "center",
		marginTop: 20,
		fontFamily: "sans-serif", 
		lineHeight: 24,
	},
});
