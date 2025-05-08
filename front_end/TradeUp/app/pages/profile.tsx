// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Modal, Text, Button, StyleSheet, Image, ScrollView, useWindowDimensions, ActivityIndicator, Alert, RefreshControl, Pressable, SafeAreaView, StatusBar, Platform } from "react-native";
import UserItem from "../../components/UserItem";
import { useRouter } from "expo-router";
import { Picker } from '@react-native-picker/picker';
import { auth } from "../../utils/firebaseConfig";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const AppColors = {
	backgroundGradientStart: "#000000",
	backgroundGradientEnd: "#0D0D0D",
	primary: "#0A84FF",
	textPrimary: "#F5F5F7",
	textSecondary: "rgba(235, 235, 245, 0.70)",
	cardBackground: "#1C1C1E",
	modalCardBackground: "#232325",
	cardBorder: "#3A3A3C",
	accentGreen: "#34C759",
	accentRed: "#FF3B30",
	iconColor: "#FFFFFF",
	pressedPrimary: "rgba(10, 132, 255, 0.5)",
	pressedGreen: "rgba(52, 199, 89, 0.5)",
	pressedSubtleIcon: "rgba(255, 255, 255, 0.2)",
	loadingIndicator: "#0A84FF",
	buttonTextPrimary: "#FFFFFF",
	hoverPrimaryBg: "rgba(10, 132, 255, 0.15)",
	hoverGreenBg: "rgba(52, 199, 89, 0.15)",
	modalOverlayBg: "rgba(0, 0, 0, 0.88)",
	inputBackground: "#2C2C2E",
	inputBorder: "#48484A",
	inputFocusBorder: "#0A84FF",
	placeholderText: "rgba(235, 235, 245, 0.45)",
	hoverSubtleIconBg: "rgba(255, 255, 255, 0.08)",
	glowPrimary: "rgba(10, 132, 255, 0.7)",
	glowGreen: "rgba(52, 199, 89, 0.7)",
};

const images = {
	noStar: require("../../assets/images/noStars.png"),
	oneStar: require("../../assets/images/oneStars.png"),
	twoStar: require("../../assets/images/twoStars.png"),
	threeStar: require("../../assets/images/threeStars.png"),
	fourStar: require("../../assets/images/fourStars.png"),
	fiveStar: require("../../assets/images/fiveStars.png"),
};

const ITEM_MARGIN_GRID = Platform.OS === "web" ? 10 : 16;
const GRID_CONTAINER_PADDING = Platform.OS === "web" ? 15 : 5;
const MAX_CONTENT_WIDTH = 640;

const AnimatedPressable = ({ onPress, style, children, pressedStyle, hoverStyle, hoverEffect = true, hapticStyle = Haptics.ImpactFeedbackStyle.Light, baseShadow = { opacity: 0, radius: 0, offset: { width: 0, height: 0 }, color: "#000" }, hoverShadow = { opacity: 0.4, radius: 25, offset: { width: 0, height: 10 } }, isCardHover = false }) => {
	const scale = useSharedValue(1);
	const translateY = useSharedValue(0);
	const rotateX = useSharedValue(0);
	const rotateY = useSharedValue(0);
	const animatedShadowOpacity = useSharedValue(baseShadow.opacity);
	const animatedShadowRadius = useSharedValue(baseShadow.radius);
	const animatedShadowOffsetHeight = useSharedValue(baseShadow.offset.height);
	const animatedShadowColor = useSharedValue(baseShadow.color || "#000");
	const [isHovered, setIsHovered] = useState(false);
	const { width: componentWidth, height: componentHeight } = StyleSheet.flatten(style || {});

	const animatedComponentStyle = useAnimatedStyle(() => {
		const transform = [{ scale: scale.value }, { translateY: translateY.value }];
		if (isCardHover && Platform.OS === "web") {
			transform.push({ perspective: 1200 }, { rotateX: `${rotateX.value}deg` }, { rotateY: `${rotateY.value}deg` });
		}
		return { transform, shadowOpacity: animatedShadowOpacity.value, shadowRadius: animatedShadowRadius.value, shadowOffset: { width: baseShadow.offset.width, height: animatedShadowOffsetHeight.value }, shadowColor: animatedShadowColor.value };
	});

	const pressSpringConfig = { damping: 15, stiffness: 480, mass: 0.5 };
	const hoverSpringConfig = { damping: 20, stiffness: 130, mass: 1.1 };
	const cardHoverSpringConfig = { damping: 25, stiffness: 100, mass: 1.2 };

	const handlePressIn = () => {
		scale.value = withSpring(isCardHover ? 0.985 : 0.97, pressSpringConfig);
		if (Platform.OS !== "web" && hapticStyle) {
			Haptics.impactAsync(hapticStyle);
		}
	};
	const handlePressOut = () => {
		const targetScale = isHovered && Platform.OS === "web" && hoverEffect ? (isCardHover ? 1.01 : 1.03) : 1;
		scale.value = withSpring(targetScale, { ...pressSpringConfig, stiffness: 400 });
	};

	const handleHoverIn = (event) => {
		if (Platform.OS === "web" && hoverEffect) {
			setIsHovered(true);
			const targetScale = isCardHover ? 1.01 : 1.03;
			const targetTranslateY = isCardHover ? -6 : -6;

			scale.value = withSpring(targetScale, isCardHover ? cardHoverSpringConfig : hoverSpringConfig);
			translateY.value = withSpring(targetTranslateY, isCardHover ? cardHoverSpringConfig : hoverSpringConfig);
			animatedShadowOpacity.value = withTiming(hoverShadow.opacity, { duration: 180, easing: Easing.out(Easing.ease) });
			animatedShadowRadius.value = withSpring(hoverShadow.radius, isCardHover ? cardHoverSpringConfig : hoverSpringConfig);
			animatedShadowOffsetHeight.value = withSpring(hoverShadow.offset.height, isCardHover ? cardHoverSpringConfig : hoverSpringConfig);

			if (hoverStyle && hoverStyle.shadowColor) {
				animatedShadowColor.value = hoverStyle.shadowColor;
			} else {
				animatedShadowColor.value = baseShadow.color || "#000";
			}

			if (isCardHover && event && event.nativeEvent && componentWidth && componentHeight) {
				const { locationX, locationY } = event.nativeEvent;
				const rotateYFactor = (locationX / componentWidth - 0.5) * -8;
				const rotateXFactor = (locationY / componentHeight - 0.5) * 8;
				rotateX.value = withSpring(rotateXFactor, cardHoverSpringConfig);
				rotateY.value = withSpring(rotateYFactor, cardHoverSpringConfig);
			}
		}
	};
	const handleHoverOut = () => {
		if (Platform.OS === "web" && hoverEffect) {
			setIsHovered(false);
			scale.value = withSpring(1, isCardHover ? cardHoverSpringConfig : hoverSpringConfig);
			translateY.value = withSpring(0, isCardHover ? cardHoverSpringConfig : hoverSpringConfig);
			animatedShadowOpacity.value = withTiming(baseShadow.opacity, { duration: 300, easing: Easing.in(Easing.ease) });
			animatedShadowRadius.value = withSpring(baseShadow.radius, isCardHover ? cardHoverSpringConfig : hoverSpringConfig);
			animatedShadowOffsetHeight.value = withSpring(baseShadow.offset.height, isCardHover ? cardHoverSpringConfig : hoverSpringConfig);
			animatedShadowColor.value = baseShadow.color || "#000";
			if (isCardHover) {
				rotateX.value = withSpring(0, cardHoverSpringConfig);
				rotateY.value = withSpring(0, cardHoverSpringConfig);
			}
		}
	};
	return (
		<Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} onHoverIn={handleHoverIn} onHoverOut={handleHoverOut} onMouseEnter={Platform.OS === "web" ? handleHoverIn : undefined} onMouseLeave={Platform.OS === "web" ? handleHoverOut : undefined} style={({ pressed }) => [style, animatedComponentStyle, isHovered && Platform.OS === "web" && hoverEffect && hoverStyle, pressed && pressedStyle]}>
			{children}
		</Pressable>
	);
};

export default function ProfileScreen() {
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
	const isWeb = Platform.OS === "web";
	const [isHovered, setIsHovered] = useState(false);
	// === [POPUP MODAL STATE ADDED] ===
	const [finalScoreSummary, setFinalScoreSummary] = useState(null);
	const [showEndOfDayModal, setShowEndOfDayModal] = useState(false);
	const hasShownModalRef = useRef(false);



	const [isModalVisible, setModalVisible] = useState(false);
	const [selectedItem, setSelectedItem] = useState("");

	const fetchUserData = useCallback(
		async (isRefresh = false) => {
			if (!isRefresh && isMounted.current) setLoadingProfile(true);
			if (isMounted.current) setProfileError(null);
			try {
				const user = auth.currentUser;
				if (!user) {
					if (isMounted.current) {
						if (!isRefresh) setLoadingProfile(false);
						setRefreshing(false);
					}
					return;
				}
				const token = await user.getIdToken(true);
				const [userInfoResponse, itemsResponse] = await Promise.all([axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/info`, { headers: { Authorization: `Bearer ${token}` } }), axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/user/me`, { headers: { Authorization: `Bearer ${token}` } })]);
				if (isMounted.current) {
					setUserName(userInfoResponse.data?.username || "User");
					setTradeCredit(userInfoResponse.data?.trade_credit || 0);
					setUserItems(itemsResponse.data?.items || []);
				}
				hasFetchedProfileData.current = true;
			} catch (err) {
				const errorMsg = err.response?.data?.error || err.message || "Failed to load profile data.";
				if (isMounted.current) setProfileError(errorMsg);
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

	// === [CHECK FOR FINALIZED SCORE ADDED] ===
	const checkIfDayFinalized = useCallback(async () => {
		try {
		if (hasShownModalRef.current) return;
		const user = auth.currentUser;
		if (!user) return;
	
		const token = await user.getIdToken();
		const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/scores/today-summary`, {
			headers: { Authorization: `Bearer ${token}` },
		});
	
		if (res.data?.final_score && res.data?.earned_credit !== undefined) {
			setFinalScoreSummary(res.data);
			setShowEndOfDayModal(true);
			hasShownModalRef.current = true;
		}
		} catch (err) {
		console.log("[Profile] No final score yet:", err.response?.data || err.message);
		}
	}, []);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchUserData(true);
	}, [fetchUserData]);

	useEffect(() => {
		isMounted.current = true;
		const unsubscribeAuth = auth.onAuthStateChanged((user) => {
			if (!isMounted.current) return;
			if (user) {
				if (!hasFetchedProfileData.current || refreshing) fetchUserData(refreshing);
				else setLoadingProfile(false);
			} else {
				hasFetchedProfileData.current = false;
				setLoadingProfile(true);
				setProfileError(null);
				setUserName("Loading...");
				setTradeCredit(0);
				setUserItems([]);
				setTimeout(() => {
					if (isMounted.current) router.replace("/pages/login");
				}, 0);
			}
		});
		if (auth.currentUser && !hasFetchedProfileData.current && loadingProfile) fetchUserData();
		else if (!auth.currentUser) setLoadingProfile(false);
		return () => {
			isMounted.current = false;
			unsubscribeAuth();
		};
	}, [router, fetchUserData, refreshing, loadingProfile]);

	// === [POLLING FOR FINALIZATION ADDED] ===
	useEffect(() => {
		checkIfDayFinalized();
		const interval = setInterval(checkIfDayFinalized, 60000); // every 1 min
		return () => clearInterval(interval);
	}, [checkIfDayFinalized]);
	  

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

	const numColumns = isWeb ? (screenWidth > 850 ? 3 : 2) : 2;

	const scrollContentContainerHorizontalPadding = styles.scrollContentContainer.paddingHorizontal || 0;
	const userItemsContainerCalculatedWidth = Math.min(screenWidth - scrollContentContainerHorizontalPadding * 2, MAX_CONTENT_WIDTH);

	const itemContentAreaWidth = userItemsContainerCalculatedWidth - GRID_CONTAINER_PADDING * 2;
	const itemWidth = Math.floor((itemContentAreaWidth - ITEM_MARGIN_GRID * (numColumns - 1)) / numColumns);
	const itemHeight = itemWidth;

	const handleGoToMarket = () => router.push("/pages/market");
	const handleGoToTrades = () => router.push("/pages/trades");
	const handleGoToDailyReward = () => router.push("/pages/dailyReward");
	const handleGoToDailyChallenge = () => router.push("/pages/dailyChallenge");
	const handleGoToReactionGame = () => router.push("/pages/reactionGame");
	const handleGoToLeaderboard = () => router.push("/pages/leaderBoard");
	const handleGoToAddItem = () => router.push("/pages/addItem");
	const handleGoToEditAccount = () => router.push("/(tabs)/editAccountPage");

	if (loadingProfile && !refreshing) {
		return (
			<LinearGradient colors={[AppColors.backgroundGradientStart, AppColors.backgroundGradientEnd]} style={styles.centered}>
				<ActivityIndicator size="large" color={AppColors.loadingIndicator} />
				<Text style={styles.messageText}>Loading Profile...</Text>
			</LinearGradient>
		);
	}
	if (profileError && !loadingProfile && auth.currentUser) {
		return (
			<LinearGradient colors={[AppColors.backgroundGradientStart, AppColors.backgroundGradientEnd]} style={styles.centered}>
				<Ionicons name="alert-circle-outline" size={60} color={AppColors.accentRed} />
				<Text style={styles.errorText}>{profileError}</Text>
				<AnimatedPressable onPress={() => fetchUserData()} style={styles.utilityButton} pressedStyle={{ backgroundColor: AppColors.pressedPrimary }} hoverEffect={false}>
					<Text style={styles.utilityButtonText}>Retry</Text>
				</AnimatedPressable>
			</LinearGradient>
		);
	}
	if (!auth.currentUser && !loadingProfile) {
		return (
			<LinearGradient colors={[AppColors.backgroundGradientStart, AppColors.backgroundGradientEnd]} style={styles.centered}>
				<Ionicons name="log-in-outline" size={60} color={AppColors.textSecondary} />
				<Text style={styles.messageText}>Please log in.</Text>
				<AnimatedPressable onPress={() => router.replace("/pages/login")} style={styles.utilityButton} pressedStyle={{ backgroundColor: AppColors.pressedPrimary }} hoverEffect={false}>
					<Text style={styles.utilityButtonText}>Go to Login</Text>
				</AnimatedPressable>
			</LinearGradient>
		);
	}

	const totalInventoryValue = userItems.reduce((sum, item) => sum + (item.hidden_value || 0), 0);

	const actionButtons = [
		{ title: "Marketplace", icon: "storefront-outline", onPress: handleGoToMarket, accentColor: AppColors.primary, hoverBg: AppColors.hoverPrimaryBg, glowColor: AppColors.glowPrimary },
		{ title: "My Trades", icon: "swap-horizontal-outline", onPress: handleGoToTrades, accentColor: AppColors.primary, hoverBg: AppColors.hoverPrimaryBg, glowColor: AppColors.glowPrimary },
		{ title: "Daily Reward", icon: "gift-outline", onPress: handleGoToDailyReward, accentColor: AppColors.accentGreen, hoverBg: AppColors.hoverGreenBg, glowColor: AppColors.glowGreen },
		{ title: "Daily Challenge", icon: "trophy-outline", onPress: handleGoToDailyChallenge, accentColor: AppColors.accentGreen, hoverBg: AppColors.hoverGreenBg, glowColor: AppColors.glowGreen },
		{ title: "Reaction Game", icon: "flash-outline", onPress: handleGoToReactionGame, accentColor: AppColors.accentGreen, hoverBg: AppColors.hoverGreenBg, glowColor: AppColors.glowGreen },
		{ title: "Leader Board", icon: "trophy-outline", onPress: handleGoToLeaderboard, accentColor: AppColors.accentGreen, hoverBg: AppColors.hoverGreenBg, glowColor: AppColors.glowGreen },
		{ title: "Add Item", icon: "add-circle-outline", onPress: handleGoToAddItem, accentColor: AppColors.accentGreen, hoverBg: AppColors.hoverGreenBg, glowColor: AppColors.glowGreen },
		{ title: "Liquidate Item", icon: "logo-usd", onPress: () => setModalVisible(true), accentColor: AppColors.accentGreen, hoverBg: AppColors.hoverGreenBg, glowColor: AppColors.glowGreen },
	];

	return (
		<LinearGradient colors={[AppColors.backgroundGradientStart, AppColors.backgroundGradientEnd]} style={styles.gradientBackground}>
			<SafeAreaView style={styles.safeArea}>
				{Platform.OS !== "web" && <StatusBar barStyle="light-content" />}
				<View style={styles.topBarContainer}>
					<View style={{ width: 34 }} />
					<Text style={styles.profileTitle}>Profile</Text>
					<AnimatedPressable onPress={handleGoToEditAccount} style={styles.editAccountIconPressable} pressedStyle={{ backgroundColor: AppColors.pressedSubtleIcon }} hoverStyle={{ backgroundColor: AppColors.hoverSubtleIconBg }} hapticStyle={Haptics.ImpactFeedbackStyle.Medium} baseShadow={{ opacity: 0, radius: 0, offset: { width: 0, height: 0 } }}>
						<Ionicons name="settings-outline" size={22} color={AppColors.textSecondary} />
					</AnimatedPressable>
				</View>


				<ScrollView contentContainerStyle={styles.scrollContentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accentGreen]} tintColor={AppColors.accentGreen} />} showsVerticalScrollIndicator={false}>

					<View style={styles.headerContainer}>
						<Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
						<Text style={styles.userNameText}>{userName}</Text>
						<Text style={styles.userEmailText}>{auth.currentUser?.email}</Text>
						<View style={styles.ratingContainer}>
							<Image source={images.threeStar} style={styles.ratingImage} />
						</View>
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

					<View style={styles.statsContainer}>
						<View style={styles.statBox}>
							<Text style={styles.statLabel}>Trade Credits</Text>
							<Text style={styles.statValue}>${tradeCredit.toFixed(2)}</Text>
						</View>
						<View style={styles.statBox}>
							<Text style={styles.statLabel}>Inventory Value</Text>
							<Text style={styles.statValue}>${totalInventoryValue.toFixed(2)}</Text>
						</View>
					</View>

					<View style={styles.actionListContainer}>
						{actionButtons.map((action, index) => (
							<AnimatedPressable key={index} style={[styles.actionListItem]} onPress={action.onPress} pressedStyle={{ backgroundColor: action.accentColor === AppColors.primary ? AppColors.pressedPrimary : AppColors.pressedGreen }} hoverStyle={[styles.actionListItemHover, { backgroundColor: action.hoverBg, shadowColor: action.glowColor }]} hoverEffect={true} baseShadow={{ opacity: 0.03, radius: 5, offset: { width: 0, height: 1 }, color: "#000" }} hoverShadow={{ opacity: 0.35, radius: 28, offset: { width: 0, height: 8 } }}>
								<Ionicons name={action.icon} size={22} color={action.accentColor} style={styles.actionListIcon} />
								<Text style={[styles.actionListText]}>{action.title}</Text>
								<Ionicons name="chevron-forward-outline" size={20} color={AppColors.textSecondary} />
							</AnimatedPressable>
						))}
					</View>

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

								<Pressable
									onPress={() => {
										handleCashout();
										setModalVisible(false);
									}}
									onHoverIn={() => setIsHovered(true)}
									onHoverOut={() => setIsHovered(false)}
									style={[
										styles.modalButton,
										isHovered && styles.modalButtonHover
									]}
								>
									<Text style={[styles.modalButtonText]}>Cashout</Text>
								</Pressable>
							</View>
						</View>
					</Modal>

					<Text style={styles.inventoryTitle}>Your Inventory</Text>
					{userItems.length > 0 ? (
						<View style={[styles.userItemsContainer, { width: userItemsContainerCalculatedWidth }]}>
							{userItems.map((item) => (
								<View
									key={item.id}
									style={[
										styles.userItemWrapper,
										{
											width: itemWidth,
											height: itemHeight,
											marginBottom: ITEM_MARGIN_GRID,
										},
									]}
								>
									<UserItem imageUrl={item.image_url} value={item.hidden_value?.toFixed(2) || "N/A"} title={item.name || "Untitled Item"} />
								</View>
							))}
						</View>
					) : (
						<Text style={styles.messageText}>Your inventory is empty.</Text>
					)}
					{showEndOfDayModal && finalScoreSummary && (
						<Modal transparent animationType="fade" visible={showEndOfDayModal}>
							<View style={styles.endOfDayModalOverlay}>
								<View style={styles.endOfDayModalBox}>
									<Text style={styles.endOfDayModalTitle}>Day Ended!</Text>
									<Text>Base Score: {finalScoreSummary.base_score}</Text>
									<Text>Bonus: {finalScoreSummary.challenge_bonus}</Text>
									<Text>Final Score: {finalScoreSummary.final_score}</Text>
									<Text>Trade Credits Earned: {finalScoreSummary.earned_credit}</Text>
									<Pressable
									style={styles.endOfDayModalButton}
									onPress={() => setShowEndOfDayModal(false)}
									>
									<Text style={styles.endOfDayModalButtonText}>Start New Day</Text>
									</Pressable>
								</View>
							</View>
					  	</Modal>
					)}
				</ScrollView>
			</SafeAreaView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	gradientBackground: { flex: 1 },
	safeArea: { flex: 1 },
	topBarContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 15,
		paddingTop: Platform.OS === "ios" ? 10 : (StatusBar.currentHeight || 0) + 12,
		paddingBottom: 12,
		width: "100%",
		borderBottomWidth: 1,
		borderBottomColor: AppColors.cardBorder,
	},
	profileTitle: { fontSize: 17, fontWeight: "600", color: AppColors.textPrimary, fontFamily: "sans-serif-medium" },
	editAccountIconPressable: { padding: 8, borderRadius: 20 },
	scrollContentContainer: {
		alignItems: "center",
		paddingTop: 25,
		paddingBottom: 60,
		paddingHorizontal: Platform.OS === "web" ? 25 : 15,
	},
	centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
	messageText: { marginTop: 20, color: AppColors.textSecondary, fontSize: 16, textAlign: "center", fontFamily: "sans-serif" },
	errorText: { color: AppColors.accentRed, fontSize: 16, textAlign: "center", marginBottom: 20, fontFamily: "sans-serif" },
	headerContainer: { alignItems: "center", marginBottom: 30, width: "100%" },
	profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: AppColors.primary, marginBottom: 12, backgroundColor: AppColors.cardBackground },
	userNameText: { fontSize: 24, fontWeight: "600", color: AppColors.textPrimary, marginBottom: 4, fontFamily: "sans-serif-medium" },
	userEmailText: { fontSize: 15, color: AppColors.textSecondary, marginBottom: 12, fontFamily: "sans-serif" },
	ratingContainer: { flexDirection: "row", alignItems: "center", marginTop: 4 },
	ratingImage: { width: 100, height: 20, resizeMode: "contain" },
	statsContainer: { flexDirection: "row", justifyContent: "space-around", width: "100%", maxWidth: MAX_CONTENT_WIDTH, marginBottom: 35 },
	statBox: {
		backgroundColor: AppColors.cardBackground,
		paddingVertical: 15,
		paddingHorizontal: 15,
		borderRadius: 12,
		alignItems: "center",
		flex: 1,
		marginHorizontal: 8,
		borderWidth: 1,
		borderColor: AppColors.cardBorder,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 7,
	},
	statLabel: { fontSize: 13, color: AppColors.textSecondary, marginBottom: 5, fontFamily: "sans-serif", fontWeight: "500" },
	statValue: { fontSize: 18, fontWeight: "600", color: AppColors.textPrimary, fontFamily: "sans-serif-medium" },
	actionListContainer: {
		width: "100%",
		maxWidth: MAX_CONTENT_WIDTH,
		backgroundColor: AppColors.cardBackground,
		borderRadius: 12,
		marginBottom: 35,
		borderWidth: 1,
		borderColor: AppColors.cardBorder,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 7,
	},
	actionListItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 18,
		paddingHorizontal: 20,
		borderBottomWidth: 1,
		borderBottomColor: AppColors.cardBorder,
	},
	actionListItemHover: {},
	actionListIcon: { marginRight: 20 },
	actionListText: { flex: 1, fontSize: 16, fontFamily: "sans-serif-medium", color: AppColors.textPrimary },
	utilityButton: {
		backgroundColor: AppColors.primary,
		paddingVertical: 14,
		paddingHorizontal: 35,
		borderRadius: 10,
		alignItems: "center",
		marginTop: 25,
		minHeight: 50,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 5,
	},
	utilityButtonText: { color: AppColors.buttonTextPrimary, fontSize: 16, fontWeight: "600", fontFamily: "sans-serif-medium" },
	inventoryTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: AppColors.textPrimary,
		marginBottom: 18,
		marginTop: 25,
		width: "100%",
		maxWidth: MAX_CONTENT_WIDTH,
		textAlign: "center",
		fontFamily: "sans-serif-medium",
	},
	userItemsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-around",
		alignSelf: "center",
		paddingHorizontal: GRID_CONTAINER_PADDING,
	},
	userItemWrapper: {},
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
	modalButton: {
		backgroundColor: 'white',
		padding: 10,
		borderRadius: 5,
		borderColor: '#ff3b30', // Your border color
		borderWidth: 1, // Ensure border width is set
	},
	modalButtonHover: {
		backgroundColor: '#ff3b30',
		padding: 10,
		borderRadius: 5,
		borderColor: '#ff3b30', // Your border color
		borderWidth: 1, // Ensure border width is set
	},
	modalButtonText: {
		color: 'black',
		textAlign: 'center',
		fontWeight: 'bold',
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
	// === Styles for end-of-day summary popup ===
	endOfDayModalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "center",
		alignItems: "center",
	},
	endOfDayModalBox: {
		backgroundColor: "white",
		padding: 20,
		borderRadius: 12,
		width: 300,
		alignItems: "center",
	},
	endOfDayModalTitle: {
		fontSize: 22,
		fontWeight: "bold",
		marginBottom: 15,
	},
	endOfDayModalButton: {
		marginTop: 20,
		backgroundColor: "#4CAF50",
		paddingHorizontal: 30,
		paddingVertical: 10,
		borderRadius: 8,
	},
	endOfDayModalButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
  
});
