// @ts-nocheck
import React, { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Modal, SafeAreaView, FlatList, Dimensions, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from "react-native-reanimated";

import { logoutUser, auth } from "../utils/firebase"; 

const AppColors = {
	background: "rgba(248, 248, 248, 0.9)",
	textPrimary: "#000000",
	textSecondary: "#3C3C4399",
	separator: "#3C3C434A",
	primaryAction: "#007AFF",
	destructiveAction: "#FF3B30",
	icon: "#007AFF",
	pressedState: "rgba(0, 0, 0, 0.06)",
	modalBackdrop: "rgba(0,0,0,0.35)",
};

const menuRoutes = [
	{ id: "profile", title: "Profile", href: "/pages/profile", icon: "person-circle-outline" },
	{ id: "market", title: "Marketplace", href: "/pages/market", icon: "storefront-outline" },
	{ id: "trades", title: "My Trades", href: "/pages/trades", icon: "swap-horizontal-outline" },
	{ id: "rewards", title: "Daily Reward", href: "/pages/dailyReward", icon: "gift-outline" },
	{ id: "game", title: "Reaction Game", href: "/pages/reactionGame", icon: "game-controller-outline" },
	{ id: "settings", title: "Settings", href: "/(tabs)/editAccountPage", icon: "settings-outline" },
	{ id: "logout", title: "Log Out", action: "logout", icon: "log-out-outline", isDestructive: true },
];

const Dropdown = () => {
	const [modalVisible, setModalVisible] = useState(false);
	const router = useRouter();
	const scale = useSharedValue(0.95);
	const opacity = useSharedValue(0);

	const animatedModalStyle = useAnimatedStyle(() => {
		return {
			opacity: opacity.value,
			transform: [{ scale: scale.value }],
		};
	});

	const openMenu = () => {
		setModalVisible(true);
		scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
		opacity.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
	};

	const closeMenu = (callback?: () => void) => {
		scale.value = withTiming(0.95, { duration: 150, easing: Easing.in(Easing.ease) });
		opacity.value = withTiming(0, { duration: 100, easing: Easing.in(Easing.ease) }, (finished) => {
			if (finished) {
				runOnJS(setModalVisible)(false);
				if (callback) {
					runOnJS(callback)();
				}
			}
		});
	};

	const handleMenuItemPress = async (item) => {
		if (item.action === "logout") {
			closeMenu(async () => {
				try {
					await logoutUser(); 
					console.log("Logout successful, navigating to index page.");
					router.replace("/"); 
				} catch (error) {
					console.error("Logout failed in Dropdown:", error);
					Alert.alert("Logout Failed", error.message || "Could not log out at this time.");
				}
			});
		} else if (item.href) {
			closeMenu(() => {
				router.push(item.href);
			});
		} else {
			closeMenu(); 
		}
	};

	const renderMenuItem = ({ item }) => (
		<Pressable onPress={() => handleMenuItemPress(item)} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed, item.isDestructive && styles.destructiveItem]}>
			<Ionicons name={item.icon} size={22} color={item.isDestructive ? AppColors.destructiveAction : AppColors.icon} style={styles.menuIcon} />
			<Text style={[styles.menuItemText, item.isDestructive && styles.destructiveItemText]}>{item.title}</Text>
		</Pressable>
	);

	return (
		<View style={styles.container}>
			<Pressable onPress={openMenu} style={styles.menuButton}>
				<Ionicons name="ellipsis-horizontal-circle-outline" size={30} color={AppColors.primaryAction} />
			</Pressable>

			<Modal animationType="none" transparent={true} visible={modalVisible} onRequestClose={() => closeMenu()}>
				<Pressable style={styles.modalBackdrop} onPress={() => closeMenu()}>
					<Animated.View
						style={[styles.modalContentContainer, animatedModalStyle]}
						onStartShouldSetResponder={() => true} 
					>
						<BlurView intensity={90} tint="light" style={styles.blurViewContainer}>
							<FlatList data={menuRoutes} renderItem={renderMenuItem} keyExtractor={(item) => item.id} ItemSeparatorComponent={() => <View style={styles.separator} />} scrollEnabled={false} />
						</BlurView>
					</Animated.View>
				</Pressable>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
	},
	menuButton: {
		padding: 8,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: AppColors.modalBackdrop,
		justifyContent: "flex-start",
		alignItems: "flex-end",
		paddingTop: 60,
		paddingRight: 15,
	},
	modalContentContainer: {
		borderRadius: 14,
		overflow: "hidden",
		width: 250,
		shadowColor: "#000000",
		shadowOffset: {
			width: 0,
			height: 8,
		},
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 10,
		backgroundColor: "transparent",
	},
	blurViewContainer: {
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 18,
	},
	menuItemPressed: {
		backgroundColor: AppColors.pressedState,
	},
	menuIcon: {
		marginRight: 15,
	},
	menuItemText: {
		fontSize: 16,
		color: AppColors.textPrimary,
		fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
	},
	destructiveItem: {},
	destructiveItemText: {
		color: AppColors.destructiveAction,
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: AppColors.separator,
		marginLeft: 55, 
	},
});

export default Dropdown;
