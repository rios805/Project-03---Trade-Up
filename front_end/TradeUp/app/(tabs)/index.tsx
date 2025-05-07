// @ts-nocheck
import React from "react";
import { View, Text, Pressable, StyleSheet, Platform, SafeAreaView, StatusBar, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { auth } from "../../utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const AppColors = {
	backgroundGradientStart: "#000000",
	backgroundGradientEnd: "#121212",
	primaryCallToAction: "#0A84FF",
	secondaryCallToActionBackground: "rgba(255, 255, 255, 0.1)",
	secondaryCallToActionBorder: "rgba(255, 255, 255, 0.2)",
	textPrimary: "#FFFFFF",
	textSecondary: "rgba(235, 235, 245, 0.70)",
	buttonTextPrimary: "#FFFFFF",
	buttonTextSecondary: "#FFFFFF",
	iconColor: "#0A84FF",
	pressedPrimary: "#005FCE",
	pressedSecondary: "rgba(255, 255, 255, 0.2)",
};

export default function LandingScreen() {
	const router = useRouter();

	useFocusEffect(
		React.useCallback(() => {
			if (auth.currentUser) {
				console.log("[LandingScreen] User is authenticated, navigating to /pages/profile.");
				router.replace("/pages/profile");
			} else {
				console.log("[LandingScreen] User is not authenticated. Staying on landing screen.");
			}
		}, [router])
	);

	const isMobile = Platform.OS === "ios" || Platform.OS === "android";

	return (
		<LinearGradient colors={[AppColors.backgroundGradientStart, AppColors.backgroundGradientEnd]} style={styles.gradientBackground}>
			<SafeAreaView style={styles.safeArea}>
				{isMobile && <StatusBar barStyle="light-content" />}
				<View style={styles.container}>
					<View style={styles.logoContainer}>
						<Ionicons name="trending-up-outline" size={80} color={AppColors.iconColor} />
					</View>

					<View style={styles.contentContainer}>
						<Text style={styles.title}>TradeUp</Text>
						<Text style={styles.subtitle}>
							Your Marketplace for Trading Collectibles.
							{"\n"}
							Discover. Barter. Elevate.
						</Text>
					</View>

					<View style={styles.buttonContainer}>
						<Pressable style={({ pressed }) => [styles.button, styles.loginButton, pressed && styles.buttonPressedPrimary]} onPress={() => router.push("/pages/login")}>
							<Text style={[styles.buttonText, styles.loginButtonText]}>Log In</Text>
						</Pressable>

						<Pressable style={({ pressed }) => [styles.button, styles.signupButton, pressed && styles.buttonPressedSecondary]} onPress={() => router.push("/pages/signUp")}>
							<Text style={[styles.buttonText, styles.signupButtonText]}>Create Account</Text>
						</Pressable>
					</View>
				</View>
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
	},
	container: {
		flex: 1,
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 30,
		paddingBottom: 50,
		paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 40 : 60,
	},
	logoContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		maxHeight: "30%",
		marginTop: 100,
	},
	contentContainer: {
		alignItems: "center",
		width: "100%",
		marginBottom: 30,
	},
	title: {
		fontSize: 44,
		fontWeight: "bold",
		color: AppColors.textPrimary,
		textAlign: "center",
		marginBottom: 10,
		fontFamily: "sans-serif-condensed",
		letterSpacing: -0.5,
		
	},
	subtitle: {
		fontSize: 17,
		color: AppColors.textSecondary,
		textAlign: "center",
		marginBottom: 20,
		fontFamily: "sans-serif-light",
		lineHeight: 24,
		paddingHorizontal: 10,
		marginBottom: 360,
	},
	buttonContainer: {
		width: "100%",
		maxWidth: 360,
	},
	button: {
		paddingVertical: 15,
		borderRadius: 12,
		marginBottom: 16,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 52,
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	loginButton: {
		backgroundColor: AppColors.primaryCallToAction,
	},
	signupButton: {
		backgroundColor: AppColors.secondaryCallToActionBackground,
		borderColor: AppColors.secondaryCallToActionBorder,
		borderWidth: 1,
	},
	buttonPressedPrimary: {
		backgroundColor: AppColors.pressedPrimary,
	},
	buttonPressedSecondary: {
		backgroundColor: AppColors.pressedSecondary,
	},
	buttonText: {
		fontSize: 16,
		fontWeight: "600",
		fontFamily: "sans-serif-medium",
	},
	loginButtonText: {
		color: AppColors.buttonTextPrimary,
	},
	signupButtonText: {
		color: AppColors.buttonTextPrimary,
	},
});
