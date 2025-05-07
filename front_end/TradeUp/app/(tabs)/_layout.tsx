import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: "#141414",
				headerShown: false,
				tabBarStyle: {
					backgroundColor: "#121212",
					borderTopWidth: 0,
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: 60,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />,
					tabBarButton: () => null,
				}}
			/>
			<Tabs.Screen
				name="editAccountPage"
				options={{
					title: "Account",
					tabBarIcon: ({ color }) => <Ionicons name="person" size={28} color={color} />,
					tabBarButton: () => null,
				}}
			/>
		</Tabs>
	);
}
