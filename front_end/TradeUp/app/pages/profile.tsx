// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Image, ScrollView, useWindowDimensions, ActivityIndicator, Alert, RefreshControl, Pressable, SafeAreaView, StatusBar, Platform } from "react-native";
import UserItem from "../../components/UserItem";
import { useRouter } from "expo-router";
import { auth } from "../../utils/firebaseConfig";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

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

	const numColumns = isWeb ? (screenWidth > 850 ? 3 : 2) : 2;

	const scrollContentContainerHorizontalPadding = styles.scrollContentContainer.paddingHorizontal || 0;
	const userItemsContainerCalculatedWidth = Math.min(screenWidth - scrollContentContainerHorizontalPadding * 2, MAX_CONTENT_WIDTH);

	const itemContentAreaWidth = userItemsContainerCalculatedWidth - GRID_CONTAINER_PADDING * 2;
	const itemWidth = Math.floor((itemContentAreaWidth - ITEM_MARGIN_GRID * (numColumns - 1)) / numColumns);
	const itemHeight = itemWidth;

	const handleGoToMarket = () => router.push("/pages/market");
	const handleGoToTrades = () => router.push("/pages/trades");
	const handleGoToDailyReward = () => router.push("/pages/dailyReward");
	const handleGoToReactionGame = () => router.push("/pages/reactionGame");
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
		{ title: "Reaction Game", icon: "flash-outline", onPress: handleGoToReactionGame, accentColor: AppColors.accentGreen, hoverBg: AppColors.hoverGreenBg, glowColor: AppColors.glowGreen },
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
});
