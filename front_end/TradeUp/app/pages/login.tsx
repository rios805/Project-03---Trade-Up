// @ts-nocheck
import React, { useState, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, ScrollView, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig"; 
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const AppColors = {
	backgroundGradientStart: "#000000",
	backgroundGradientEnd: "#121212",
	primary: "#0A84FF",
	textPrimary: "#FFFFFF",
	textSecondary: "rgba(235, 235, 245, 0.70)",
	inputBackground: "#1C1C1E",
	inputBorder: "#3A3A3C",
	inputFocusBorder: "#0A84FF",
	placeholderText: "#8E8E93",
	errorText: "#FF3B30",
	buttonTextPrimary: "#FFFFFF",
	pressedPrimary: "#005FCE",
};

export default function LoginScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const [emailFocused, setEmailFocused] = useState(false);
	const [passwordFocused, setPasswordFocused] = useState(false);

	const { width } = useWindowDimensions();
	const isWeb = Platform.OS === "web";
	const router = useRouter();

	const emailInputRef = useRef<TextInput>(null);
	const passwordInputRef = useRef<TextInput>(null);

	const handleLogin = async () => {
		Keyboard.dismiss();
		setError("");
		if (!email.trim() || !password) {
			setError("Please enter both email and password.");
			return;
		}
		setIsLoading(true);
		try {
			await signInWithEmailAndPassword(auth, email.trim(), password);
			console.log("[LoginScreen] Firebase login successful.");
			router.replace("/pages/profile");
		} catch (e: any) {
			console.error("[LoginScreen] Firebase login error:", e.code, e.message);
			let friendlyMessage = "Login failed. Please check your credentials.";
			if (e.code === "auth/invalid-email" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
				friendlyMessage = "Invalid email or password.";
			} else if (e.message) {
				friendlyMessage = e.message;
			}
			setError(friendlyMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<LinearGradient colors={[AppColors.backgroundGradientStart, AppColors.backgroundGradientEnd]} style={styles.gradientBackground}>
			<SafeAreaView style={styles.safeArea}>
				{Platform.OS !== "web" && <StatusBar barStyle="light-content" />}
				<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
					<ScrollView
						contentContainerStyle={styles.scrollContainer}
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode="on-drag"
						showsVerticalScrollIndicator={false}
						style={styles.scrollViewStyle}
					>
						<View style={[styles.formWrapper, isWeb && { maxWidth: 420 }]}>
							<Ionicons name="key-outline" size={56} color={AppColors.primary} style={styles.icon} />
							<Text style={styles.title}>Welcome Back</Text>
							<Text style={styles.subtitle}>Log in to continue your trading journey.</Text>

							{error ? <Text style={styles.errorText}>{error}</Text> : null}

							<TextInput ref={emailInputRef} style={[styles.input, emailFocused && styles.inputFocused]} placeholder="Email Address" placeholderTextColor={AppColors.placeholderText} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordInputRef.current?.focus()} blurOnSubmit={false} textContentType="emailAddress" onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} />
							<TextInput ref={passwordInputRef} style={[styles.input, passwordFocused && styles.inputFocused]} placeholder="Password" placeholderTextColor={AppColors.placeholderText} secureTextEntry value={password} onChangeText={setPassword} returnKeyType="go" onSubmitEditing={handleLogin} textContentType="password" onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} />
							<Pressable style={({ pressed }) => [styles.primaryButton, isLoading && styles.buttonDisabled, pressed && styles.buttonPressedPrimary]} onPress={handleLogin} disabled={isLoading}>
								{isLoading ? <ActivityIndicator size="small" color={AppColors.buttonTextPrimary} /> : <Text style={styles.primaryButtonText}>Log In</Text>}
							</Pressable>

							<View style={styles.footer}>
								<Text style={styles.footerText}>Don't have an account? </Text>
								<Pressable onPress={() => router.push("/pages/signUp")}>
									<Text style={styles.linkText}>Sign Up</Text>
								</Pressable>
							</View>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
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
	keyboardAvoidingContainer: {
		flex: 1,
	},
	scrollViewStyle: {
		flex: 1,
		width: "100%",
	},
	scrollContainer: {
		flexGrow: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 40,
		paddingHorizontal: 25,
	},
	formWrapper: {
		width: "100%",
		alignItems: "center",
	},
	icon: {
		marginBottom: 25,
		marginTop: 20,
	},
	title: {
		fontSize: 30,
		fontWeight: "bold",
		color: AppColors.textPrimary,
		marginBottom: 12,
		fontFamily: "sans-serif-medium",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 15,
		color: AppColors.textSecondary,
		marginBottom: 30,
		textAlign: "center",
		maxWidth: "95%",
		fontFamily: "sans-serif-light",
		lineHeight: 22,
	},
	errorText: {
		color: AppColors.errorText,
		marginBottom: 18, 
		fontSize: 14,
		textAlign: "center",
		fontFamily: "sans-serif",
	},
	input: {
		backgroundColor: AppColors.inputBackground,
		paddingVertical: 15,
		paddingHorizontal: 18, 
		borderRadius: 12,
		marginBottom: 18, 
		fontSize: 16,
		color: AppColors.textPrimary,
		width: "100%",
		fontFamily: "sans-serif",
		borderWidth: 1,
		borderColor: AppColors.inputBorder,
	},
	inputFocused: {
		borderColor: AppColors.inputFocusBorder,
		shadowColor: AppColors.inputFocusBorder,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.7,
		shadowRadius: 5,
		elevation: 4,
	},
	primaryButton: {
		backgroundColor: AppColors.primary,
		paddingVertical: 16, 
		borderRadius: 12,
		alignItems: "center",
		width: "100%",
		minHeight: 52,
		marginTop: 15,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.5,
		elevation: 4,
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	buttonPressedPrimary: {
		backgroundColor: AppColors.pressedPrimary,
	},
	primaryButtonText: {
		color: AppColors.buttonTextPrimary,
		fontSize: 16, 
		fontWeight: "600",
		fontFamily: "sans-serif-medium",
	},
	footer: {
		flexDirection: "row",
		marginTop: 30,
		paddingBottom: 25,
		justifyContent: "center",
	},
	footerText: {
		color: AppColors.textSecondary,
		fontSize: 14, 
		fontFamily: "sans-serif",
	},
	linkText: {
		color: AppColors.primary,
		fontSize: 14,
		fontWeight: "600",
		fontFamily: "sans-serif-medium",
	},
});
