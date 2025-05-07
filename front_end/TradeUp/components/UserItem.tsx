// @ts-nocheck
import React from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";

const AppColors = {
	textPrimary: "#F5F5F7",
	textSecondary: "rgba(235, 235, 245, 0.70)",
	cardBackground: "#1C1C1E",
	cardBorder: "#3A3A3C",
	accentGreen: "#34C759",
};

const UserItem = ({ imageUrl, title, value }) => {
	const numericValue = parseFloat(value || 0);
	const shouldDisplayValue = (typeof numericValue === "number" && !isNaN(numericValue) && numericValue > 0) || value === "0.00" || (typeof value === "string" && value.trim() !== "" && isNaN(numericValue));

	return (
		<View style={styles.card}>
			<Image
				source={{ uri: imageUrl || "https://placehold.co/300x300/1C1C1E/FFFFFF?text=Item&font=sans-serif" }}
				style={styles.image}
				resizeMode="cover" 
			/>
			<View style={styles.textContainer}>
				<Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
					{title || "Untitled Item"}
				</Text>
				{shouldDisplayValue && (
					<Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
						{typeof numericValue === "number" && !isNaN(numericValue) ? `$${numericValue.toFixed(2)}` : value}
					</Text>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: AppColors.cardBackground,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: AppColors.cardBorder,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.12,
		shadowRadius: 10,
		elevation: 6, 
		overflow: "hidden", 
		width: "100%",
		height: "100%",
		flexDirection: "column",
		justifyContent: "flex-start", 
	},
	image: {
		width: "100%",
		height: "70%", 
		backgroundColor: "#2A2A2C", 
	},
	textContainer: {
		flex: 1, 
		paddingHorizontal: 10,
		paddingVertical: 8,
		justifyContent: "center", 
	},
	title: {
		fontSize: Platform.OS === "web" ? 14 : 13,
		fontWeight: "600",
		color: AppColors.textPrimary,
		marginBottom: 3,
		fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
		textAlign: "left",
	},
	value: {
		fontSize: Platform.OS === "web" ? 13 : 12, 
		fontWeight: "bold",
		color: AppColors.accentGreen,
		fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
		textAlign: "left",
	},
});

export default UserItem;
