// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Image, Animated } from "react-native";
import axios from "axios";
import { auth } from "../../utils/firebaseConfig";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from "react-native-reanimated"; // Import Reanimated for animations.

export default function DailyRewardScreen() {
	const [status, setStatus] = useState("checking");
	const [claimedItem, setClaimedItem] = useState(null);
	const [error, setError] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	// This is the reanimated value for the wheel rotation
	const rotation = useSharedValue(0);

	// This is the animated style for the wheel
	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ rotateZ: `${rotation.value}deg` }],
		};
	});

	const checkRewardStatus = useCallback(async () => {
		console.log(`[DailyReward] Checking status...`);
		setStatus("checking");
		setError(null);
		setIsLoading(true);

		try {
			const user = auth.currentUser;
			if (!user) throw new Error("User not logged in.");
			const token = await user.getIdToken(true);

			const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/daily-reward-status`, { headers: { Authorization: `Bearer ${token}` } });

			console.log("[DailyReward] Status check response:", response.data);

			if (response.data?.claimed === true) {
				setStatus("claimed");
				setClaimedItem(response.data.item);
			} else {
				setStatus("ready");
			}
		} catch (err) {
			console.error("[DailyReward] Error checking reward status:", err);
			const errorMsg = err.response?.data?.error || err.message || "Failed to check reward status.";
			setError(errorMsg);
			setStatus("error");
			if (err.response?.status === 401 || err.response?.status === 403) {
				Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
			}
		} finally {
			setIsLoading(false);
		}
	}, [router]);

	const attemptClaimReward = useCallback(async () => {
		console.log(`[DailyReward] Attempting to claim...`);
		setStatus("spinning");
		setIsLoading(true);
		setError(null);
		setClaimedItem(null);

		// Here is to start the spin animation
		rotation.value = 0; // Reset rotation
		rotation.value = withTiming(
			360 * 5, // This is to have it spin Spin 5 times
			{ duration: 2500, easing: Easing.out(Easing.cubic) } // Animation config
		);

		try {
			const user = auth.currentUser;
			if (!user) throw new Error("User not logged in.");
			const token = await user.getIdToken(true);

			const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/claim-daily-reward`, {}, { headers: { Authorization: `Bearer ${token}` } });

			console.log("[DailyReward] Claim response:", response.data);

			const processResult = () => {
				if (response.data?.item) {
					console.log("[DailyReward] Reward successfully claimed or already existed!");
					setStatus("claimed");
					setClaimedItem(response.data.item);
					if (response.data?.alreadyClaimed === false) {
						Alert.alert("Reward Claimed!", `You received: ${response.data.item.name}`);
					} else {
						Alert.alert("Already Claimed", `You already claimed ${response.data.item.name} today.`);
					}
				} else {
					console.error("[DailyReward] Claim successful but no item data received:", response.data);
					throw new Error("Claim processed but item details are missing.");
				}
				setIsLoading(false);
			};

			setTimeout(() => {
				runOnJS(processResult)();
			}, 2500);
		} catch (err) {
			rotation.value = withTiming(rotation.value % 360, { duration: 100 }); // This is to stop smoothly

			const processError = () => {
				console.error("[DailyReward] Error claiming reward:", err);
				const errorMsg = err.response?.data?.error || err.message || "Failed to claim daily reward.";
				setError(errorMsg);
				setStatus("error");
				setIsLoading(false);
				if (err.response?.status === 401 || err.response?.status === 403) {
					Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
				} else {
					Alert.alert("Claim Failed", errorMsg);
				}
			};
			setTimeout(() => {
				runOnJS(processError)();
			}, 150);
		}
	}, [router, rotation]);

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user) {
				console.log("[DailyReward] Auth state changed: User logged in. Checking status.");
				checkRewardStatus();
			} else {
				console.log("[DailyReward] Auth state changed: User logged out.");
				setStatus("error");
				setError("Please log in to claim your daily reward.");
			}
		});
		if (auth.currentUser) {
			checkRewardStatus();
		} else {
			setStatus("error");
			setError("Please log in to claim your daily reward.");
		}

		return unsubscribe;
	}, [checkRewardStatus]);

	const renderContent = () => {
		switch (status) {
			case "checking":
				return <ActivityIndicator size="large" color="#4CAF50" />;

			case "error":
				return (
					<>
						<Ionicons name="alert-circle-outline" size={60} color="#ff6347" style={styles.icon} />
						<Text style={styles.errorText}>{error || "An error occurred."}</Text>
						<Pressable style={styles.button} onPress={checkRewardStatus}>
							<Text style={styles.buttonText}>Retry Check</Text>
						</Pressable>
					</>
				);

			case "ready":
				return (
					<>
						<Text style={styles.infoText}>Ready to claim your daily item!</Text>
						<Reanimated.View style={[styles.wheelPlaceholder, animatedStyle]}>
							<Ionicons name="help-buoy-outline" size={100} color="#ccc" />
							<Text style={styles.placeholderText}>(Spinning Wheel)</Text>
						</Reanimated.View>
						<Pressable style={styles.button} onPress={attemptClaimReward} disabled={isLoading}>
							<Text style={styles.buttonText}>Spin for Item!</Text>
						</Pressable>
					</>
				);

			case "spinning":
				return (
					<>
						<Text style={styles.infoText}>Spinning...</Text>
						<Reanimated.View style={[styles.wheelPlaceholder, animatedStyle]}>
							<Ionicons name="sync-outline" size={100} color="#4CAF50" />
						</Reanimated.View>
						<Pressable style={[styles.button, styles.buttonDisabled]} disabled={true}>
							<Text style={styles.buttonText}>Spinning...</Text>
						</Pressable>
					</>
				);

			case "claimed":
				return (
					<>
						<Text style={styles.infoText}>{claimedItem && !isLoading ? "You received:" : "Already claimed today:"}</Text>
						{claimedItem ? (
							<View style={styles.itemDisplay}>
								<Image source={{ uri: claimedItem.image_url || `https://placehold.co/150x150/222/ccc?text=Item+${claimedItem.id}` }} style={styles.itemImage} />
								<Text style={styles.itemName}>{claimedItem.name}</Text>
								<Text style={styles.itemValue}>Value: ${claimedItem.hidden_value?.toFixed(2)}</Text>
							</View>
						) : isLoading ? (
							<ActivityIndicator size="large" color="#4CAF50" />
						) : (
							<Text style={styles.errorText}>Could not display claimed item.</Text>
						)}
						<Pressable style={[styles.button, styles.buttonDisabled]} disabled={true}>
							<Text style={styles.buttonText}>Claimed</Text>
						</Pressable>
					</>
				);

			default:
				return <Text style={styles.errorText}>Unknown state.</Text>;
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Daily Reward</Text>
			<View style={styles.contentArea}>{renderContent()}</View>
			<Pressable style={styles.backButton} onPress={() => router.back()}>
				<Ionicons name="arrow-back-outline" size={24} color="#ccc" />
				<Text style={styles.backButtonText}>Back to Profile</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		alignItems: "center",
		paddingTop: 60,
		paddingBottom: 40,
		paddingHorizontal: 20,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#4CAF50",
		marginBottom: 40,
	},
	contentArea: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		width: "100%",
	},
	infoText: {
		fontSize: 18,
		color: "#ccc",
		marginBottom: 25,
		textAlign: "center",
	},
	wheelPlaceholder: {
		width: 250,
		height: 250,
		borderRadius: 125,
		backgroundColor: "#222",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 30,
		borderWidth: 3,
		borderColor: "#444",
		borderStyle: "dashed",
	},
	placeholderText: {
		color: "#777",
		marginTop: 10,
		fontSize: 16,
	},
	button: {
		backgroundColor: "#4CAF50",
		paddingVertical: 15,
		paddingHorizontal: 40,
		borderRadius: 8,
		minWidth: 180,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "bold",
	},
	buttonDisabled: {
		backgroundColor: "#555",
		opacity: 0.8,
	},
	itemDisplay: {
		alignItems: "center",
		backgroundColor: "#1a1a1a",
		padding: 20,
		borderRadius: 10,
		marginBottom: 30,
		borderWidth: 1,
		borderColor: "#333",
		minWidth: 250,
	},
	itemImage: {
		width: 120,
		height: 120,
		borderRadius: 8,
		marginBottom: 15,
		backgroundColor: "#333",
	},
	itemName: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#E0E0E0",
		marginBottom: 5,
	},
	itemValue: {
		fontSize: 16,
		color: "#4CAF50",
	},
	errorText: {
		color: "#ff6347",
		fontSize: 16,
		textAlign: "center",
		marginBottom: 15,
	},
	icon: {
		marginBottom: 15,
	},
	backButton: {
		position: "absolute",
		bottom: 20,
		left: 20,
		flexDirection: "row",
		alignItems: "center",
		padding: 10,
	},
	backButtonText: {
		color: "#ccc",
		fontSize: 16,
		marginLeft: 5,
	},
});
