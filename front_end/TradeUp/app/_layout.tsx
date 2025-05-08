// @ts-nocheck
import { Stack, useRouter, Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { auth } from "../utils/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import PremiumDropdown from '../components/Dropdown'; 

export default function RootLayout() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			console.log("[RootLayout] Auth state changed. User:", user ? user.uid : null);
			setIsAuthenticated(!!user);
		});
		return unsubscribe; 
	}, []); 

	if (isAuthenticated === null) {
		return (
			<View style={styles.centeredLoading}>
				<ActivityIndicator size="large" color="#0A84FF" />
			</View>
		);
	}

	const commonAuthenticatedHeaderOptions = (screenTitle: string) => ({
		headerShown: true,
		headerStyle: {
			backgroundColor: '#1C1C1E', 
		},
		headerTintColor: '#FFFFFF', 
		headerTitleStyle: {
			fontWeight: '600',
			fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
		},
		title: screenTitle,
		headerRight: () => <PremiumDropdown />,
	});

	if (!isAuthenticated) {
		return (
			<Stack>
				<Stack.Screen name="pages/login" options={{ headerShown: false }} />
				<Stack.Screen name="pages/signUp" options={{ headerShown: false }} />
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="pages/profile" options={{ headerShown: false }} />
				<Stack.Screen name="+not-found" />
			</Stack>
		);
	}

	return (
		<Stack key="authenticated-stack"> 
			<Stack.Screen
				name="(tabs)"
				options={commonAuthenticatedHeaderOptions("TradeUp")}
			/>
			<Stack.Screen
				name="pages/profile"
				options={commonAuthenticatedHeaderOptions("Profile")}
			/>
			<Stack.Screen
				name="pages/market"
				options={commonAuthenticatedHeaderOptions("Marketplace")}
			/>
			<Stack.Screen
				name="pages/trades"
				options={commonAuthenticatedHeaderOptions("My Trades")}
			/>
			<Stack.Screen
				name="pages/dailyReward"
				options={commonAuthenticatedHeaderOptions("Daily Reward")}
			/>
			<Stack.Screen
				name="pages/reactionGame"
				options={commonAuthenticatedHeaderOptions("Reaction Game")}
			/>
			<Stack.Screen
				name="pages/addItem"
				options={commonAuthenticatedHeaderOptions("Add New Item")}
			/>
			<Stack.Screen 
				name="pages/dailyChallenge" 
				options={commonAuthenticatedHeaderOptions("Daily Challenge")}
			/>
			<Stack.Screen name="+not-found" options={{ title: "Oops! Page Not Found" }}
			/>
		</Stack>
	);
}

const styles = StyleSheet.create({
	centeredLoading: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000000",
	}
});
