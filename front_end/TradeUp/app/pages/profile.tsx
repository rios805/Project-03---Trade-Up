// @ts-nocheck
import React, { useState, useEffect } from "react";
import { View, Pressable, Text, StyleSheet, Image, ScrollView, useWindowDimensions, ActivityIndicator, Alert } from "react-native";
import StarRating from "../../components/StarRating";
import UserItem from "../../components/UserItem";
import { useRouter } from "expo-router";
import { auth, getUserInfo } from "../../utils/firebaseConfig";
import axios from "axios";

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
	const [rating, setRating] = useState(3.5);
	const [profileImageUrl, setProfileImageUrl] = useState("https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png");
	const [userName, setUserName] = useState("Loading...");
	const [tradeCredit, setTradeCredit] = useState(0);
	const [userItems, setUserItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const { width: screenWidth } = useWindowDimensions();
	const router = useRouter();

	const fetchUserData = async () => {
		console.log("[Profile] Fetching user data...");
		setLoading(true);
		setError(null);
		try {
			const user = auth.currentUser;
			if (!user) {
				console.warn("[Profile] No user logged in.");
				setError("User not logged in.");
				router.replace("/pages/login");
				return;
			}

			const token = await user.getIdToken();
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
		} catch (err: any) {
			console.error("[Profile] Error fetching data:", err);
			setError(err.response?.data?.error || err.message || "Failed to load profile data.");
			if (err.response?.status === 401 || err.response?.status === 403) {
				Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUserData();
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (!user) {
				console.log("[Profile] Auth state changed: User logged out. Redirecting...");
				router.replace("/pages/login");
			} else {
				console.log("[Profile] Auth state changed: User logged in.");
				fetchUserData();
			}
		});
		return unsubscribe;
	}, [router]);

	let columns = 5;
	if (screenWidth < 600) {
		columns = 2;
	} else if (screenWidth < 900) {
		columns = 3;
	}
	const itemWidth = (screenWidth - ITEM_MARGIN * (columns + 1)) / columns;

	const handleGoToMarket = () => {
		router.push("/pages/market");
	};
	const handleGoToTrades = () => {
		router.push("/pages/trades");
	};
	const handleAddItem = () => {
		router.push("/pages/addItem");
	};

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#4CAF50" />
				<Text style={styles.loadingText}>Loading Profile...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorText}>{error}</Text>
				<Pressable style={styles.button} onPress={fetchUserData}>
					<Text style={styles.buttonText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	const totalInventoryValue = userItems.reduce((sum, item) => sum + (item.hidden_value || 0), 0);

	return (
		<ScrollView style={styles.outerContainer} contentContainerStyle={styles.scrollContentContainer}>
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

			<View style={styles.navigationButtonsContainer}>
				<Pressable onPress={handleGoToMarket} style={({ pressed }) => [styles.button, styles.navButton, pressed && styles.buttonPressed]}>
					<Text style={styles.buttonText}>Go to Market</Text>
				</Pressable>
				<Pressable onPress={handleGoToTrades} style={({ pressed }) => [styles.button, styles.navButton, pressed && styles.buttonPressed]}>
					<Text style={styles.buttonText}>View Trades</Text>
				</Pressable>
				<Pressable onPress={handleAddItem} style={({ pressed }) => [styles.button, styles.navButton, styles.addButton, pressed && styles.buttonPressedAdd]}>
					<Text style={styles.buttonText}>Add Item</Text>
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
		marginBottom: 30,
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
	navigationButtonsContainer: {
		flexDirection: "row",
		justifyContent: "space-around",
		width: "100%",
		maxWidth: 600,
		alignSelf: "center",
		marginBottom: 30,
		paddingHorizontal: 10,
	},
	button: {
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		minWidth: 120,
		marginHorizontal: 5,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 1,
	},
	navButton: {
		backgroundColor: "#0277BD",
		flex: 1,
	},
	addButton: {
		backgroundColor: "#FF6347",
	},
	buttonPressed: {
		backgroundColor: "#01579B",
	},
	buttonPressedAdd: {
		backgroundColor: "#D84315",
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
