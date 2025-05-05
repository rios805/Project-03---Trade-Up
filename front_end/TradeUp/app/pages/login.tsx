import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig";

export default function LoginScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const { width } = useWindowDimensions();
	const isWeb = width >= 768;
	const router = useRouter();
	const handleLogin = async () => {
		console.log(":closed_lock_with_key: Attempting login with:", email);
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			console.log(":white_check_mark: Logged in user:", userCredential.user.email);
			router.push("/pages/profile");
		} catch (error: any) {
			console.error(":x: Login error:", error.message);
			alert("Login failed: " + error.message);
		}
	};
	return (
		<View style={styles.container}>
			<View style={[styles.formContainer, isWeb && styles.webForm]}>
				<Text style={styles.title}>Log In</Text>
				<TextInput style={[styles.input, isWeb && styles.inputWeb]} placeholder="Email" placeholderTextColor="#ccc" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
				<TextInput style={[styles.input, isWeb && styles.inputWeb]} placeholder="Password" placeholderTextColor="#ccc" secureTextEntry value={password} onChangeText={setPassword} />
				<Pressable style={[styles.loginButton, isWeb && styles.buttonWeb]} onPress={handleLogin}>
					<Text style={styles.loginText}>Log In</Text>
				</Pressable>
			</View>
		</View>
	);
}
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		justifyContent: "center",
		padding: 24,
		alignItems: "center",
	},
	formContainer: {
		width: "100%",
	},
	webForm: {
		maxWidth: 400,
		width: "100%",
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		textAlign: "center",
		color: "#4CAF50",
		marginBottom: 36,
	},
	input: {
		backgroundColor: "#333",
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 8,
		borderColor: "#4CAF50",
		borderWidth: 1,
		marginBottom: 20,
		fontSize: 16,
		color: "#fff",
		width: "100%",
	},
	inputWeb: {
		alignSelf: "center",
	},
	loginButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		width: "100%",
	},
	buttonWeb: {
		alignSelf: "center",
	},
	loginText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
});
