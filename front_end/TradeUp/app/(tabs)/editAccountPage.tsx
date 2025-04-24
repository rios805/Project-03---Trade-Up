import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { auth, logoutUser, getUserInfo } from "../../utils/firebase";
import { useRouter } from "expo-router";

export default function AccountEditScreen() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [tradeCredit, setTradeCredit] = useState(0);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		//This is to load user data
		const loadUserData = async () => {
			try {
				if (auth.currentUser) {
					setEmail(auth.currentUser.email || "");

					// This gets additional user info from the database
					const userInfo = await getUserInfo(auth.currentUser.uid);
					setName(userInfo.username || "");
					setTradeCredit(userInfo.trade_credit || 0);
				}
			} catch (error) {
				console.error("Error loading user data:", error);
			} finally {
				setLoading(false);
			}
		};

		loadUserData();
	}, []);

	const handleSaveChanges = () => {
		// This is going to be the function that saves the changes but not yet implemented
		Alert.alert("Changes Saved", `Your account has been updated!`);
	};

	const handleSignOut = async () => {
		try {
			await logoutUser();
			router.replace("/pages/login");
		} catch (error: any) {
			Alert.alert("Error", error.message);
		}
	};

	if (loading) {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator size="large" color="#4CAF50" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Edit Account</Text>

			<View style={styles.infoContainer}>
				<Text style={styles.label}>Trade Credits:</Text>
				<Text style={styles.creditValue}>{tradeCredit}</Text>
			</View>

			<TextInput style={styles.input} placeholder="Username" placeholderTextColor="#ccc" value={name} onChangeText={setName} />

			<TextInput style={styles.input} placeholder="Email" placeholderTextColor="#ccc" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} editable={false} />

			<TextInput style={styles.input} placeholder="New Password" placeholderTextColor="#ccc" secureTextEntry value={password} onChangeText={setPassword} />

			<Pressable style={styles.saveButton} onPress={handleSaveChanges}>
				<Text style={styles.buttonText}>Save Changes</Text>
			</Pressable>

			<Pressable style={styles.signOutButton} onPress={handleSignOut}>
				<Text style={styles.signOutText}>Sign Out</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		padding: 24,
	},
	centered: {
		justifyContent: "center",
		alignItems: "center",
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		textAlign: "center",
		color: "#4CAF50",
		marginBottom: 36,
		marginTop: 20,
	},
	infoContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#333",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginBottom: 20,
	},
	label: {
		color: "#ccc",
		fontSize: 16,
	},
	creditValue: {
		color: "#4CAF50",
		fontSize: 18,
		fontWeight: "bold",
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
	},
	saveButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		marginBottom: 16,
	},
	signOutButton: {
		backgroundColor: "#333",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		borderColor: "#ff6347",
		borderWidth: 1,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
	signOutText: {
		color: "#ff6347",
		fontSize: 16,
		fontWeight: "bold",
	},
});
