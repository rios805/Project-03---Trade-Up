// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Pressable, Text, StyleSheet, Image, ScrollView, useWindowDimensions, ActivityIndicator, Alert, RefreshControl } from "react-native";
import UserItem from "../../components/UserItem";
import { useRouter } from "expo-router";
import { auth } from "../../utils/firebaseConfig";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons"; // This is to import Ionicons

const images = {
	noStar: require("../../assets/images/noStars.png"),
	oneStar: require("../../assets/images/oneStars.png"),
	twoStar: require("../../assets/images/twoStars.png"),
	threeStar: require("../../assets/images/threeStars.png"),
	fourStar: require("../../assets/images/fourStars.png"),
	fiveStar: require("../../assets/images/fiveStars.png"),
};

const ITEM_MARGIN = 10;

export default function Profile() {
	const [profileImageUrl, setProfileImageUrl] = useState("https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png");
	const [userName, setUserName] = useState("Loading...");
	const [tradeCredit, setTradeCredit] = useState(0);
	const [userItems, setUserItems] = useState([]);
	const [loadingProfile, setLoadingProfile] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [profileError, setProfileError] = useState(null);
	const hasFetchedProfileData = useRef(false);
	const isMounted = useRef(true);

	const router = useRouter();
	const { width: screenWidth } = useWindowDimensions();

	const fetchUserData = useCallback(
		async (isRefresh = false) => {
			console.log(`[Profile] Fetching user data... Refresh: ${isRefresh}`);
			if (!isRefresh) {
				setLoadingProfile(true);
			}
			setProfileError(null);

			try {
				const user = auth.currentUser;
				if (!user) {
					console.warn("[Profile] No user logged in for fetchUserData.");
					if (!isRefresh) setLoadingProfile(false);
					setRefreshing(false);
					return;
				}

				const token = await user.getIdToken(true);
				console.log("[Profile] Got ID token.");

				const userInfoResponse = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/info`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				console.log("[Profile] User info fetched:", userInfoResponse.data);
				setUserName(userInfoResponse.data?.username || "User");
				setTradeCredit(userInfoResponse.data?.trade_credit || 0);

				const itemsResponse = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/user/me`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				console.log("[Profile] User items fetched:", itemsResponse.data.items?.length);
				setUserItems(itemsResponse.data?.items || []);

				hasFetchedProfileData.current = true;
			} catch (err) {
				console.error("[Profile] Error fetching profile data:", err);
				const errorMsg = err.response?.data?.error || err.message || "Failed to load profile data.";
				setProfileError(errorMsg);
				if (err.response?.status === 401 || err.response?.status === 403) {
					Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
				}
			} finally {
				if (isMounted.current) {
					setLoadingProfile(false);
					setRefreshing(false);
				}
			}
		},
		[router]
	);

	const onRefresh = useCallback(() => {
		console.log("[Profile] Refresh triggered.");
		setRefreshing(true);
		fetchUserData(true);
	}, [fetchUserData]);

	useEffect(() => {
		isMounted.current = true;
		console.log("[Profile] useEffect for auth changes running.");
		const unsubscribeAuth = auth.onAuthStateChanged((user) => {
			if (!isMounted.current) return;
			if (user && !hasFetchedProfileData.current) {
				console.log("[Profile] Auth state changed: User logged in AND initial fetch needed. Fetching data.");
				fetchUserData();
			} else if (!user) {
				console.log("[Profile] Auth state changed: User logged out. Resetting state and redirecting...");
				hasFetchedProfileData.current = false;
				setLoadingProfile(true);
				setProfileError(null);
				setUserName("Loading...");
				setTradeCredit(0);
				setUserItems([]);
				setTimeout(() => {
					if (isMounted.current) router.replace("/pages/login");
				}, 0);
			} else {
				console.log("[Profile] Auth state changed: User logged in, but data fetch already initiated or completed.");
			}
		});

		if (auth.currentUser && !hasFetchedProfileData.current && loadingProfile) {
			console.log("[Profile] Component mounted with user logged in, triggering initial fetch.");
			fetchUserData();
		} else if (!auth.currentUser) {
			console.log("[Profile] Component mounted, user not logged in.");
			setLoadingProfile(false);
		}

		return () => {
			console.log("[Profile] Component unmounting.");
			isMounted.current = false;
			unsubscribeAuth();
		};
	}, [router, fetchUserData, loadingProfile]);

	let columns = 5;
	if (screenWidth < 600) columns = 2;
	else if (screenWidth < 900) columns = 3;
	const itemWidth = (screenWidth - ITEM_MARGIN * (columns + 1)) / columns;

	const handleGoToMarket = () => router.push("/pages/market");
	const handleGoToTrades = () => router.push("/pages/trades");
	const handleGoToDailyReward = () => router.push("/pages/dailyReward");
	const handleGoToReactionGame = () => router.push("/pages/reactionGame");
	const handleGoToLeaderboard = () => router.push("/pages/leaderboard");

	if (loadingProfile && !refreshing) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#4CAF50" />
				<Text style={styles.loadingText}>Loading Profile...</Text>
			</View>
		);
	}

	if (profileError && !loadingProfile && auth.currentUser) {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorText}>{profileError}</Text>
				<Pressable style={styles.button} onPress={() => fetchUserData()}>
					<Text style={styles.buttonText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	if (!auth.currentUser && !loadingProfile) {
		return (
			<View style={styles.centered}>
				<Text style={styles.loadingText}>Please log in.</Text>
				<Pressable style={styles.button} onPress={() => router.replace("/pages/login")}>
					<Text style={styles.buttonText}>Go to Login</Text>
				</Pressable>
			</View>
		);
	}

	const totalInventoryValue = userItems.reduce((sum, item) => sum + (item.hidden_value || 0), 0);

	return (
		<ScrollView style={styles.outerContainer} contentContainerStyle={styles.scrollContentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} tintColor={"#4CAF50"} />}>
			<View style={styles.topSection}>
				<Text style={styles.welcomeText}>Welcome, {userName}!</Text>
			</View>
			<View style={styles.infoRow}>
				<View style={styles.profileContainer}>
					<Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
					<Text style={styles.nameText}>{userName}</Text>
				</View>
				<View style={styles.ratingContainer}>
					<Text style={styles.ratingLabel}>Rating:</Text>
					<Image source={images.threeStar} style={styles.ratingImage} />
				</View>
			</View>
			<View style={styles.balancesRow}>
				<View style={styles.balanceBox}>
					<Text style={styles.balanceLabel}>Trade Credits</Text>
					<Text style={styles.balanceAmount}>${tradeCredit.toFixed(2)}</Text>
				</View>
				<View style={styles.balanceBox}>
					<Text style={styles.balanceLabel}>Inventory Value</Text>
					<Text style={styles.balanceAmount}>${totalInventoryValue.toFixed(2)}</Text>
				</View>
			</View>

			<View style={[styles.navigationButtonsContainer, styles.buttonRow]}>
				<Pressable onPress={handleGoToDailyReward} style={({ pressed }) => [styles.button, styles.dailyButton, pressed && styles.buttonPressedDaily]}>
					<Ionicons name="gift-outline" size={18} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Daily Reward</Text>
				</Pressable>
				<Pressable onPress={handleGoToReactionGame} style={({ pressed }) => [styles.button, styles.gameButton, pressed && styles.buttonPressedGame]}>
					<Ionicons name="flash-outline" size={18} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Reaction Game</Text>
				</Pressable>
			</View>
			<View style={[styles.navigationButtonsContainer, styles.buttonRow]}>
				<Pressable onPress={handleGoToMarket} style={({ pressed }) => [styles.button, styles.navButton, pressed && styles.buttonPressed]}>
					<Ionicons name="storefront-outline" size={18} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Market</Text>
				</Pressable>
				<Pressable onPress={handleGoToTrades} style={({ pressed }) => [styles.button, styles.navButton, pressed && styles.buttonPressed]}>
					<Ionicons name="swap-horizontal-outline" size={18} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Trades</Text>
				</Pressable>
			</View>
			<View style={[styles.navigationButtonsContainer, styles.buttonRow]}>
				<Pressable onPress={() => router.push("/pages/addItem")} style={({ pressed }) => [styles.button, styles.navButton, pressed && styles.buttonPressed]}>
					<Ionicons name="add-circle-outline" size={18} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Add Item</Text>
				</Pressable>
				<Pressable onPress={() => router.push("/pages/leaderBoard")} style={({ pressed }) => [styles.button, styles.navButton, pressed && styles.buttonPressed]}>
					<Ionicons name="trophy-outline" size={18} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Leader Board</Text>
				</Pressable>
			</View>

			<View style={styles.bannerContainer}>
				<Text style={styles.bannerText}>Your Inventory</Text>
			</View>
			{userItems.length > 0 ? (
				<View style={[styles.userItemsContainer, { maxWidth: screenWidth - ITEM_MARGIN * 2 }]}>
					{userItems.map((item, index) => (
						<View key={item.id || index} style={[styles.userItemWrapper, { width: itemWidth, margin: ITEM_MARGIN / 2 }]}>
							<UserItem imageUrl={item.image_url} value={item.hidden_value?.toFixed(2) || "N/A"} title={item.name || "Untitled Item"} />
						</View>
					))}
				</View>
			) : (
				<Text style={styles.emptyInventoryText}>Your inventory is empty.</Text>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	outerContainer: {
		flex: 1,
		backgroundColor: "#000",
	},
	scrollContentContainer: {
		alignItems: "center",
		paddingBottom: 40,
		paddingTop: 30,
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		padding: 20,
	},
	loadingText: {
		marginTop: 10,
		color: "#ccc",
		fontSize: 16,
	},
	errorText: {
		color: "#ff6347",
		fontSize: 16,
		textAlign: "center",
		marginBottom: 15,
	},
	topSection: {
		alignItems: "center",
		marginBottom: 25,
		width: "100%",
		paddingTop: 20,
	},
	welcomeText: {
		fontSize: 26,
		fontWeight: "bold",
		color: "#4CAF50",
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-around",
		width: "100%",
		maxWidth: 600,
		alignSelf: "center",
		paddingHorizontal: 20,
		marginBottom: 25,
	},
	profileContainer: {
		alignItems: "center",
	},
	profileImage: {
		width: 110,
		height: 110,
		borderRadius: 55,
		borderWidth: 2,
		borderColor: "#4CAF50",
		marginBottom: 8,
	},
	nameText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#E0E0E0",
		textAlign: "center",
	},
	ratingContainer: {
		alignItems: "center",
	},
	ratingLabel: {
		fontSize: 14,
		color: "#B0B0B0",
		marginBottom: 5,
	},
	ratingImage: {
		width: 100,
		height: 20,
		resizeMode: "contain",
	},
	balancesRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		width: "100%",
		maxWidth: 600,
		alignSelf: "center",
		marginBottom: 20,
		paddingHorizontal: 10,
	},
	balanceBox: {
		backgroundColor: "#1A1A1A",
		paddingVertical: 15,
		paddingHorizontal: 10,
		borderRadius: 8,
		alignItems: "center",
		flex: 1,
		marginHorizontal: 5,
		borderWidth: 1,
		borderColor: "#333",
	},
	balanceLabel: {
		fontSize: 14,
		color: "#B0B0B0",
		marginBottom: 5,
		fontWeight: "500",
	},
	balanceAmount: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#4CAF50",
	},
	buttonRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		width: "100%",
		maxWidth: 600,
		alignSelf: "center",
		marginBottom: 15,
		paddingHorizontal: 10,
	},
	navigationButtonsContainer: {},
	button: {
		flexDirection: "row",
		paddingVertical: 12,
		paddingHorizontal: 10,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		marginHorizontal: 5,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 1,
	},
	buttonIcon: {
		marginRight: 6,
	},
	dailyButton: {
		backgroundColor: "#FFC107",
	},
	gameButton: {
		backgroundColor: "#00BCD4",
	},
	navButton: {
		backgroundColor: "#0277BD",
	},
	buttonPressed: {
		backgroundColor: "#01579B",
	},
	buttonPressedDaily: {
		backgroundColor: "#FFA000",
	},
	buttonPressedGame: {
		backgroundColor: "#0097A7",
	},
	buttonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "bold",
		textAlign: "center",
	},
	bannerContainer: {
		width: "100%",
		backgroundColor: "#4CAF50",
		paddingVertical: 12,
		alignItems: "center",
		marginBottom: 20,
		marginTop: 15,
	},
	bannerText: {
		fontSize: 22,
		fontWeight: "bold",
		color: "#fff",
	},
	userItemsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		alignItems: "flex-start",
		width: "100%",
		paddingHorizontal: ITEM_MARGIN / 2,
	},
	userItemWrapper: {},
	emptyInventoryText: {
		marginTop: 30,
		fontSize: 16,
		color: "#888",
		textAlign: "center",
	},
});
