// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert, RefreshControl, ScrollView } from "react-native";
import axios from "axios";
import { auth } from "../../utils/firebaseConfig";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; // I'm using this import for icons.

const fetchDailyChallenge = async (token) => {
	console.log("[DailyChallengeScreen] Fetching daily challenge from /api/challenges/daily");
	try {
		const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/challenges/daily`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		console.log("[DailyChallengeScreen] Received challenge data:", response.data.challenge);
		if (response.data.challenge) {
			response.data.challenge.is_completed = !!response.data.challenge.is_completed;
		}
		return response.data.challenge || null;
	} catch (error) {
		console.error("[DailyChallengeScreen] Error fetching daily challenge:", error.response?.data || error.message);
		throw error;
	}
};

const completeChallengeApi = async (token, userChallengeId) => {
	console.log(`[DailyChallengeScreen] Marking challenge ID ${userChallengeId} as complete.`);
	try {
		await axios.post(
			`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/challenges/${userChallengeId}/complete`,
			{}, // This is a Empty body for POST request
			{ headers: { Authorization: `Bearer ${token}` } }
		);
		console.log(`[DailyChallengeScreen] Challenge ${userChallengeId} marked complete successfully.`);
	} catch (error) {
		console.error(`[DailyChallengeScreen] Error completing challenge ${userChallengeId}:`, error.response?.data || error.message);
		throw error;
	}
};

export default function DailyChallengeScreen() {
	const [challenge, setChallenge] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const [completing, setCompleting] = useState(false);
	const router = useRouter();

	const loadChallenge = useCallback(async () => {
		console.log("[DailyChallengeScreen] loadChallenge called.");
		setError(null);
		if (!refreshing) {
			setLoading(true);
		}
		try {
			const user = auth.currentUser;
			if (!user) {
				console.warn("[DailyChallengeScreen] User not logged in during loadChallenge.");
				setError("User not logged in.");
				return;
			}
			console.log(`[DailyChallengeScreen] Current User UID: ${user.uid}`);
			const token = await user.getIdToken();
			console.log("[DailyChallengeScreen] Got ID token.");
			const fetchedChallenge = await fetchDailyChallenge(token);
			setChallenge(fetchedChallenge);
		} catch (err) {
			console.error("[DailyChallengeScreen] Failed to load challenge:", err);
			setError(err.message || "Failed to load daily challenge.");
			if (err?.response?.status === 401 || err?.response?.status === 403) {
				Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
			}
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [refreshing, router]);

	useEffect(() => {
		console.log("[DailyChallengeScreen] Component mounted. Setting up auth listener.");
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user) {
				console.log("[DailyChallengeScreen] Auth state changed: User logged in. Loading challenge.");
				loadChallenge();
			} else {
				console.log("[DailyChallengeScreen] Auth state changed: User logged out.");
				setError("Please log in to view your challenge.");
				setLoading(false);
				setChallenge(null);
			}
		});

		if (auth.currentUser) {
			loadChallenge();
		} else {
			setError("Please log in to view your challenge.");
			setLoading(false);
		}

		return unsubscribe;
	}, [loadChallenge]);

	const onRefresh = useCallback(() => {
		console.log("[DailyChallengeScreen] Refresh triggered.");
		setRefreshing(true);
	}, []);

	const handleCompleteChallenge = async () => {
		if (!challenge || challenge.is_completed || completing) {
			return;
		}

		console.log(`[DailyChallengeScreen] Attempting to complete challenge ID: ${challenge.id}`);
		setCompleting(true);
		setError(null);

		try {
			const user = auth.currentUser;
			if (!user) throw new Error("User not logged in.");
			const token = await user.getIdToken();

			await completeChallengeApi(token, challenge.id);

			Alert.alert("Success", "Challenge marked as complete!");

			setChallenge((prev) => (prev ? { ...prev, is_completed: true } : null));
		} catch (err) {
			console.error("[DailyChallengeScreen] Failed to complete challenge:", err);
			setError(err.message || "Failed to mark challenge as complete.");
			Alert.alert("Error", `Could not complete challenge: ${err.response?.data?.error || err.message}`);
		} finally {
			setCompleting(false);
		}
	};

	if (loading && !refreshing) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#4CAF50" />
				<Text style={styles.loadingText}>Loading Challenge...</Text>
			</View>
		);
	}

	if (!auth.currentUser && !loading) {
		return (
			<View style={styles.centered}>
				<Ionicons name="lock-closed-outline" size={60} color="#888" />
				<Text style={styles.errorText}>Please log in to view your daily challenge.</Text>
				<Pressable style={styles.button} onPress={() => router.replace("/pages/login")}>
					<Text style={styles.buttonText}>Go to Login</Text>
				</Pressable>
			</View>
		);
	}

	if (error && !loading) {
		return (
			<View style={styles.centered}>
				<Ionicons name="alert-circle-outline" size={60} color="#ff6347" />
				<Text style={styles.errorText}>{error}</Text>
				<Pressable style={styles.button} onPress={loadChallenge}>
					<Text style={styles.buttonText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	if (!challenge && !loading && !error) {
		return (
			<View style={styles.centered}>
				<Ionicons name="help-circle-outline" size={60} color="#888" />
				<Text style={styles.emptyText}>No challenge assigned for today yet.</Text>
				<Text style={styles.emptySubText}>Pull down to refresh or try again later.</Text>
				<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} tintColor={"#4CAF50"} />} style={{ width: "100%" }}></ScrollView>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} tintColor={"#4CAF50"} />}>
			<Text style={styles.title}>Today's Challenge</Text>

			{challenge && (
				<View style={styles.challengeCard}>
					<Ionicons name="trophy-outline" size={40} color="#FFD700" style={styles.icon} />
					<Text style={styles.description}>{challenge.description || "No description available."}</Text>
					<View style={styles.detailsContainer}>
						<Text style={styles.detailText}>
							<Text style={styles.detailLabel}>Type:</Text> {challenge.type || "N/A"}
						</Text>
						<Text style={styles.detailText}>
							<Text style={styles.detailLabel}>Bonus:</Text> {challenge.bonus_percent || 0}%
						</Text>
					</View>
					<View style={[styles.statusBadge, challenge.is_completed ? styles.statusCompleted : styles.statusInProgress]}>
						<Text style={styles.statusText}>{challenge.is_completed ? "Completed" : "In Progress"}</Text>
					</View>

					{!challenge.is_completed && (
						<Pressable style={[styles.button, styles.completeButton, completing && styles.buttonDisabled]} onPress={handleCompleteChallenge} disabled={completing}>
							{completing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Mark as Complete (Test)</Text>}
						</Pressable>
					)}
				</View>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	scrollContentContainer: {
		flexGrow: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		padding: 20,
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#4CAF50",
		textAlign: "center",
		marginBottom: 30,
	},
	challengeCard: {
		backgroundColor: "#1a1a1a",
		borderRadius: 12,
		padding: 25,
		width: "100%",
		maxWidth: 500,
		alignItems: "center",
		borderColor: "#333",
		borderWidth: 1,
		shadowColor: "#0f0",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 5,
		elevation: 4,
	},
	icon: {
		marginBottom: 15,
	},
	description: {
		fontSize: 18,
		color: "#E0E0E0",
		textAlign: "center",
		marginBottom: 20,
		lineHeight: 24,
	},
	detailsContainer: {
		flexDirection: "row",
		justifyContent: "space-around",
		width: "80%",
		marginBottom: 20,
		paddingTop: 15,
		borderTopWidth: 1,
		borderTopColor: "#333",
	},
	detailText: {
		fontSize: 15,
		color: "#B0B0B0",
	},
	detailLabel: {
		fontWeight: "600",
		color: "#ccc",
	},
	statusBadge: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 15,
		marginBottom: 20,
	},
	statusCompleted: {
		backgroundColor: "#1a4d2e",
	},
	statusInProgress: {
		backgroundColor: "#444",
	},
	statusText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 14,
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
	emptyText: {
		fontSize: 18,
		color: "#888",
		textAlign: "center",
		marginBottom: 5,
	},
	emptySubText: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginBottom: 20,
	},
	button: {
		backgroundColor: "#4CAF50",
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 10,
	},
	completeButton: {
		backgroundColor: "#0277BD",
		marginTop: 15,
	},
	buttonDisabled: {
		backgroundColor: "#666",
		opacity: 0.7,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
});
