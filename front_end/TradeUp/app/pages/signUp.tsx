// @ts-nocheck
import React, { useState, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, ScrollView, SafeAreaView, StatusBar} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig";
import { useRouter } from "expo-router";
import axios from "axios";
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
	successText: "#34C759",
	buttonTextPrimary: "#FFFFFF",
	pressedPrimary: "#005FCE",
};

export default function SignUpScreen() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [signUpSuccess, setSignUpSuccess] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const [nameFocused, setNameFocused] = useState(false);
	const [emailFocused, setEmailFocused] = useState(false);
	const [passwordFocused, setPasswordFocused] = useState(false);
	const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

	const { width } = useWindowDimensions();
	const isWeb = Platform.OS === "web";
	const router = useRouter();

	const nameInputRef = useRef<TextInput>(null);
	const emailInputRef = useRef<TextInput>(null);
	const passwordInputRef = useRef<TextInput>(null);
	const confirmPasswordInputRef = useRef<TextInput>(null);

	const handleSignUp = async () => {
		Keyboard.dismiss();
		setError("");
		if (!name.trim() || !email.trim() || !password || !confirmPassword) {
			setError("Please fill in all fields.");
			return;
		}
		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			setError("Please enter a valid email address.");
			return;
		}
		if (password.length < 6) {
			setError("Password must be at least 6 characters long.");
			return;
		}

		setIsLoading(true);
		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
			const user = userCredential.user;
			const token = await user.getIdToken();
			const backendUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`;
			await axios.post(
				backendUrl,
				{ username: name.trim() },
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				}
			);
			setSignUpSuccess(true);
		} catch (e: any) {
			let friendlyMessage = "Failed to sign up. Please try again.";
			if (e.code === "auth/email-already-in-use") {
				friendlyMessage = "This email address is already in use.";
			} else if (e.code === "auth/weak-password") {
				friendlyMessage = "The password is too weak.";
			} else if (axios.isAxiosError(e) && !e.response) {
				friendlyMessage = "Network error. Please check your connection.";
			} else if (e.response?.data?.error) {
				friendlyMessage = e.response.data.error;
			} else if (e.message) {
				friendlyMessage = e.message;
			}
			setError(friendlyMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLoginNav = () => {
		router.replace("/pages/login");
	};

	if (signUpSuccess) {
		return (
			<LinearGradient colors={[AppColors.backgroundGradientStart, AppColors.backgroundGradientEnd]} style={styles.gradientBackground}>
				<SafeAreaView style={styles.safeArea}>
					{Platform.OS !== "web" && <StatusBar barStyle="light-content" />}
					<View style={styles.successContainer}>
						<Ionicons name="checkmark-circle-outline" size={72} color={AppColors.successText} style={styles.icon} />
						<Text style={styles.title}>Account Created!</Text>
						<Text style={styles.subtitle}>You can now log in with your new credentials.</Text>
						<Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressedPrimary]} onPress={handleLoginNav}>
							<Text style={styles.primaryButtonText}>Go to Log In</Text>
						</Pressable>
					</View>
				</SafeAreaView>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient colors={[AppColors.backgroundGradientStart, AppColors.backgroundGradientEnd]} style={styles.gradientBackground}>
			<SafeAreaView style={styles.safeArea}>
				{Platform.OS !== "web" && <StatusBar barStyle="light-content" />}
				<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
					<ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
						<View style={[styles.formWrapper, isWeb && { maxWidth: 400 }]}>
							<Ionicons name="person-add-outline" size={56} color={AppColors.primary} style={styles.icon} />
							<Text style={styles.title}>Create Account</Text>
							<Text style={styles.subtitle}>Join the TradeUp adventure.</Text>

							{error ? <Text style={styles.errorText}>{error}</Text> : null}

							<TextInput ref={nameInputRef} style={[styles.input, nameFocused && styles.inputFocused]} placeholder="Username" placeholderTextColor={AppColors.placeholderText} value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => emailInputRef.current?.focus()} blurOnSubmit={false} textContentType="name" onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)} />
							<TextInput ref={emailInputRef} style={[styles.input, emailFocused && styles.inputFocused]} placeholder="Email Address" placeholderTextColor={AppColors.placeholderText} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordInputRef.current?.focus()} blurOnSubmit={false} textContentType="emailAddress" onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} />
							<TextInput ref={passwordInputRef} style={[styles.input, passwordFocused && styles.inputFocused]} placeholder="Password (min. 6 characters)" placeholderTextColor={AppColors.placeholderText} secureTextEntry value={password} onChangeText={setPassword} returnKeyType="next" onSubmitEditing={() => confirmPasswordInputRef.current?.focus()} blurOnSubmit={false} textContentType="newPassword" onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} />
							<TextInput ref={confirmPasswordInputRef} style={[styles.input, confirmPasswordFocused && styles.inputFocused]} placeholder="Confirm Password" placeholderTextColor={AppColors.placeholderText} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} returnKeyType="done" onSubmitEditing={handleSignUp} textContentType="newPassword" onFocus={() => setConfirmPasswordFocused(true)} onBlur={() => setConfirmPasswordFocused(false)} />
							<Pressable style={({ pressed }) => [styles.primaryButton, isLoading && styles.buttonDisabled, pressed && styles.buttonPressedPrimary]} onPress={handleSignUp} disabled={isLoading}>
								{isLoading ? <ActivityIndicator size="small" color={AppColors.textPrimary} /> : <Text style={styles.primaryButtonText}>Sign Up</Text>}
							</Pressable>
							<View style={styles.footer}>
								<Text style={styles.footerText}>Already have an account? </Text>
								<Pressable onPress={() => router.push("/pages/login")}>
									<Text style={styles.linkText}>Log In</Text>
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
	scrollContainer: {
		flexGrow: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 30,
		paddingHorizontal: 20,
	},
	successContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 30,
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
		marginBottom: 10,
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
		paddingBottom: 20,
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
