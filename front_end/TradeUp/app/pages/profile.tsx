// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Pressable, Text, Modal, Button, Picker, StyleSheet, Image, ScrollView, useWindowDimensions, ActivityIndicator, Alert, RefreshControl } from "react-native";
import UserItem from "../../components/UserItem";
import { useRouter } from "expo-router";
import { auth } from "../../utils/firebaseConfig";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons"; // This is to import Ionicons

import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

import { LogBox } from "react-native";

LogBox.ignoreLogs(["onResponderTerminate"]);

const screenWidth = Dimensions.get("window").width;

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

	const [isModalVisible, setModalVisible] = useState(false);
	const [selectedItem, setSelectedItem] = useState("");

	const hasFetchedProfileData = useRef(false);
	const isMounted = useRef(true);

	const router = useRouter();
	const { width: screenWidth } = useWindowDimensions();

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// chart 

	const [trades, setTrades] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [] }] });
	const [chartLabels, setChartLabels] = useState<string[]>([]);

	/// --
	// getting the trades

	const fetchTrades = async (token) => {
		console.log("[TradesScreen] Fetching trades from /api/trades/me");
		const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/trades/me`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		console.log("[TradesScreen] Received trades data:", response.data);
		return response.data.trades || [];
	};

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

	useEffect(() => {
		console.log("[TradesScreen] Component mounted or loadTrades changed.");
		loadTrades();
		console.log(trades);
	}, [loadTrades]);

	/// --

	/// --
	// parsing the trades data

	useEffect(() => {
		const processTradesData = () => {
			// Step 1: Parse the created_at dates from trades
			const tradeDates = trades.map(trade => new Date(trade.created_at));

			// Step 2: Format the dates to something readable or suitable for chart labels
			const formattedDates = tradeDates.map(date => date.toLocaleDateString());

			// Step 3: Count the frequency of trades per day (or any other time period you want)
			const dateCounts = formattedDates.reduce((acc, date) => {
				acc[date] = (acc[date] || 0) + 1;
				return acc;
			}, {});

			// Step 4: Prepare the chart data
			const labels = Object.keys(dateCounts);  // unique dates
			const values = Object.values(dateCounts); // count of trades for each date

			setChartData({
				labels: labels,
				datasets: [
					{
						data: values,
						strokeWidth: 2,
					},
				],
			});
		};

		// Ensure that processTradesData is called only if trades exist
		if (trades.length > 0) {
			processTradesData();
		}
	}, [trades]); // Dependency array to trigger effect when `trades` 

	/// --

	///////////////////////////////////////////////////////////////////////////////////////////////////////

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

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// liquidate

	// Set the default selected item if available
	useEffect(() => {
		if (userItems.length > 0 && !selectedItem) {
			setSelectedItem(userItems[0].id); // or keep it "" if you want to force selection
		}
	}, [userItems]);

	const handleCashout = useCallback(async () => {
		if (!selectedItem) {
			Alert.alert("No Item Selected", "Please select an item to cash out.");
			return;
		}

		try {
			const user = auth.currentUser;
			if (!user) {
				Alert.alert("Error", "You must be logged in to cash out.");
				return;
			}

			const token = await user.getIdToken(true);
			console.log(`[Cashout] Attempting to cash out item ID: ${selectedItem}`);

			const response = await axios.post(
				`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/${selectedItem}/cashout`,
				{}, // POST body (empty)
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			console.log("[Cashout] Success:", response.data);
			Alert.alert("Success", `Cashed out item for ${response.data.value} credits.`);
			setModalVisible(false);

			// Optionally refresh profile data
			fetchUserData(true);
		} catch (err) {
			console.error("[Cashout] Error:", err);
			const errorMsg = err.response?.data?.error || err.message || "Failed to cash out item.";
			Alert.alert("Error", errorMsg);
		}
	}, [selectedItem, fetchUserData]);

	///////////////////////////////////////////////////////////////////////////////////////////////////////

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// profile image

	useEffect(() => {
		if (userName && userName !== "User") {
			const avatarUrl = `https://avatars.abstractapi.com/v1/?api_key=1080d304eaea40c2bb35c6345beda69b&name=${encodeURIComponent(userName)}`;
			setProfileImageUrl(avatarUrl);
		}
	}, [userName]);

	///////////////////////////////////////////////////////////////////////////////////////////////////////

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
	const handleGoToLogin = () => { router.push('/pages/login'); };

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

			<View style={styles.logoutButtonContainer}>
				<Pressable
					onPress={handleGoToLogin}
					style={({ pressed }) => [
						styles.logoutButton,
						pressed && styles.buttonPressedLiquidate,
					]}
				>
					<Ionicons name="log-out-outline" size={18} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Logout</Text>
				</Pressable>
			</View>

			<View style={styles.topSection}>
				<Text style={styles.welcomeText}>Welcome, {userName}!</Text>
			</View>

			<View style={{ marginBottom: 24 }}>
				{chartData.labels.length > 0 ? (
					<LineChart
						data={chartData}
						width={screenWidth - 32} // Adjust to fit nicely
						width={500} // fixed width
						height={220}
						yAxisLabel=""
						chartConfig={{
							backgroundColor: "#4CAF50",
							backgroundGradientFrom: "#81C784",
							backgroundGradientTo: "#388E3C",
							decimalPlaces: 0,
							color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
							labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
							style: {
								borderRadius: 16,
							},
							propsForDots: {
								r: "4",
								strokeWidth: "2",
								stroke: "#fff",
							},
						}}
						bezier
						style={{
							marginVertical: 8,
							borderRadius: 16,
						}}
					/>
				) : (
					<Text>No activity to display</Text>
				)}
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

				<Pressable onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.button, styles.liquidateButton, pressed && styles.buttonPressedLiquidate]}>
					<Ionicons name="wallet-outline" size={18} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Liquidate</Text>
				</Pressable>
			</View>

			{/* <Button title="Select Item" onPress={() => setModalVisible(true)} /> */}
			<Modal
				visible={isModalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalBackground}>
					<View style={styles.modalContainer}>
						{/* X Button in top right */}
						<Pressable
							onPress={() => setModalVisible(false)}
							style={styles.modalCloseButton}
						>
							<Text style={styles.modalCloseText}>✕</Text>
						</Pressable>

						<Text style={styles.modalTitle}>Select an Item</Text>

						<Picker
							selectedValue={selectedItem}
							onValueChange={(itemValue) => setSelectedItem(itemValue)}
							style={styles.modalPicker}
						>
							{userItems.map((item) => (
								<Picker.Item key={item.id} label={item.name} value={item.id} />
							))}
						</Picker>

						<Button title="Cashout" onPress={handleCashout} />
					</View>
				</View>
			</Modal>

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
	liquidateButton: {
		backgroundColor: "#16e1ba",
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
	buttonPressedLiquidate: {
		backgroundColor: "#3d7369",
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
	modalBackground: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: "#000000aa",
	},
	modalContainer: {
		backgroundColor: 'white',
		padding: 20,
		borderRadius: 15,
		width: '80%',
		maxWidth: 400, // prevents it from getting too wide
		position: 'relative',
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 10,
		elevation: 5,
		alignSelf: 'center',
	},
	modalCloseButton: {
		position: 'absolute',
		top: 10,
		right: 10,
		zIndex: 1,
		padding: 10,
	},
	modalCloseText: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#333',
	},
	modalTitle: {
		marginBottom: 15,
		textAlign: 'center',
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	modalPicker: {
		height: 50,
		width: '100%',
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 5,
	},
	logoutButtonContainer: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'flex-end',
		paddingHorizontal: 16,
		marginBottom: 10,
	},
	logoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: '#4caf50',
		borderRadius: 8,
	},
});
