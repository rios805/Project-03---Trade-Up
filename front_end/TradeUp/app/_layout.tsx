import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { auth } from "../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function RootLayout() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setIsAuthenticated(!!user);
		});

		return unsubscribe;
	}, []);

	if (isAuthenticated === null) {
		// this shhows loading indicator while checking auth state (at least it should)
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
				<ActivityIndicator size="large" color="#4CAF50" />
			</View>
		);
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
			<Stack.Screen name="pages/login" options={{ headerShown: false }} />
			<Stack.Screen name="pages/signUp" options={{ headerShown: false }} />
			<Stack.Screen name="pages/addItem" options={{ headerShown: false }} />
		</Stack>
	);
}
