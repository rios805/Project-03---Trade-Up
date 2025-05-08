//@ts-nocheck
import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, Modal, Pressable, Alert, FlatList, TextInput, Dimensions, useWindowDimensions, ActivityIndicator, Platform, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { auth } from "../utils/firebaseConfig";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const AppColors = {
	backgroundPrimary: "#000000",
	backgroundSecondary: "#121212",
	textPrimary: "#FFFFFF",
	textSecondary: "rgba(235, 235, 245, 0.65)",
	accentBlue: "#0A84FF",
	accentGreen: "#34C759",
	accentRed: "#FF3B30",
	fillTertiary: "rgba(118, 118, 128, 0.24)",
	fillQuaternary: "rgba(118, 118, 128, 0.12)",
	separator: "rgba(84, 84, 88, 0.45)",
	placeholderText: "rgba(235, 235, 245, 0.45)",
	cardBackground: "#1C1C1E",
	cardBorder: "rgba(84, 84, 88, 0.35)",
	loadingIndicator: "#0A84FF",
	buttonTextPrimary: "#FFFFFF",
	searchBarBackground: "rgba(118, 118, 128, 0.18)",
	searchBarPlaceholder: "rgba(235, 235, 245, 0.45)",
	modalOverlayBackground: "rgba(0, 0, 0, 0.65)",
	modalContentBackground: "#2C2C2E",
	modalTitleText: "#FFFFFF",
	modalBodyText: "rgba(235, 235, 245, 0.85)",
	modalInputBorder: "rgba(84, 84, 88, 0.6)",
	modalInputBackground: "rgba(118, 118, 128, 0.12)",
	modalButtonPressed: "rgba(255, 255, 255, 0.1)",
};

const fetchUserInventory = async (token) => {
	const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/user/me`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return response.data.items || [];
};

const createTrade = async (token, tradeData) => {
	const numericTradeData = {
		item_offered_id: Number(tradeData.item_offered_id),
		item_requested_id: Number(tradeData.item_requested_id),
		responder_firebase_uid: tradeData.responder_firebase_uid,
	};
	const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/trades/create`, numericTradeData, { headers: { Authorization: `Bearer ${token}` } });
	return response.data;
};

export default function MarketItem({ id, imageUrl, price, title, description, ownerFirebaseUid, onPurchaseComplete }) {
	const [infoModalVisible, setInfoModalVisible] = useState(false);
	const [buyModalVisible, setBuyModalVisible] = useState(false);
	const [bargainModalVisible, setBargainModalVisible] = useState(false);
	const [tradeModalVisible, setTradeModalVisible] = useState(false);

	const [inputPrice, setInputPrice] = useState(price);
	const [multiplier, setMultiplier] = useState(1); 

	const [chatMessages, setChatMessages] = useState([]);
	const [message, setMessage] = useState("");

	const [userInventory, setUserInventory] = useState([]);
	const [selectedTradeItem, setSelectedTradeItem] = useState(null);
	const [inventoryLoading, setInventoryLoading] = useState(false);
	const [inventoryError, setInventoryError] = useState(null);

	const [isLoading, setIsLoading] = useState(false);

	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const router = useRouter();

	const modalWidth = Platform.OS === "web" ? Math.min(500, windowWidth * 0.8) : windowWidth * 0.9;

	const closeAllModals = () => {
		setBuyModalVisible(false);
		setBargainModalVisible(false);
		setTradeModalVisible(false);
		setInventoryError(null); 
	};

	const openTradeModal = async () => {
		if (!ownerFirebaseUid) {
			Alert.alert("Cannot Trade", "This item does not have an owner and cannot be traded for.");
			return;
		}
		setInventoryLoading(true);
		setInventoryError(null);
		setTradeModalVisible(true);
		try {
			const user = auth.currentUser;
			if (!user) throw new Error("User not logged in.");
			const token = await user.getIdToken();
			const inventory = await fetchUserInventory(token);
			setUserInventory(inventory);
			if (inventory.length > 0) {
				setSelectedTradeItem(inventory[0].id); 
			} else {
				setSelectedTradeItem(null);
			}
		} catch (error) {
			console.error("Failed to fetch user inventory:", error);
			setInventoryError("Could not load your items. Please try again.");
		} finally {
			setInventoryLoading(false);
		}
	};

	const handleConfirmBuy = async () => {
		setIsLoading(true);
		try {
			const user = auth.currentUser;
			if (!user) {
				Alert.alert("Error", "You must be logged in to make a purchase");
				closeAllModals();
				setIsLoading(false);
				return;
			}
			const token = await user.getIdToken();
			const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/purchase`, { itemId: id, offeredPrice: inputPrice }, { headers: { Authorization: `Bearer ${token}` } });
			closeAllModals();
			Alert.alert("Purchase Successful", `You bought ${title} for $${inputPrice.toFixed(2)}`);
			if (onPurchaseComplete) onPurchaseComplete(id); 
		} catch (error) {
			console.error("Error purchasing item:", error);
			Alert.alert("Purchase Failed", error.response?.data?.error || "There was an error processing your purchase");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSendMessage = () => {
		if (message.trim()) {
			setChatMessages((msgs) => [...msgs, { text: message.trim(), isUser: true, id: Date.now().toString() }]);
			setTimeout(() => {
				setChatMessages((msgs) => [...msgs, { text: `I can offer this item for $${(price * 0.9).toFixed(2)}`, isUser: false, id: (Date.now() + 1).toString() }]);
			}, 1000);
			setMessage("");
		}
	};

	const handleConfirmTrade = async () => {
		if (!selectedTradeItem) {
			Alert.alert("No Item Selected", "Please select an item from your inventory to offer.");
			return;
		}
		if (!ownerFirebaseUid) {
			Alert.alert("Error", "Cannot determine the owner of the requested item.");
			return;
		}
		setIsLoading(true);
		try {
			const user = auth.currentUser;
			if (!user) throw new Error("User not logged in.");
			const token = await user.getIdToken();
			const tradeData = {
				item_offered_id: selectedTradeItem,
				item_requested_id: id, 
				responder_firebase_uid: ownerFirebaseUid,
			};
			await createTrade(token, tradeData);
			closeAllModals();
			Alert.alert("Trade Offer Sent", `Your offer to trade for ${title} has been sent.`);
		} catch (error) {
			console.error("Error creating trade:", error);
			Alert.alert("Trade Failed", error.response?.data?.error || "Could not send trade offer.");
		} finally {
			setIsLoading(false);
		}
	};

	const incrementPrice = () => setInputPrice((prev) => parseFloat((prev + multiplier).toFixed(2)));
	const decrementPrice = () => setInputPrice((prev) => Math.max(0, parseFloat((prev - multiplier).toFixed(2))));
	const incrementMultiplier = () => setMultiplier((prev) => prev + 1);
	const decrementMultiplier = () => setMultiplier((prev) => Math.max(1, prev - 1));

	const itemCardStyle = [styles.card, Platform.OS === "web" && styles.cardWeb];

	return (
		<View style={itemCardStyle}>
			<Image
				source={{ uri: imageUrl || "https://placehold.co/300x200/1C1C1E/FFFFFF?text=Item&font=sans-serif" }}
				style={styles.image}
				resizeMode="cover" 
			/>
			<View style={styles.textContainer}>
				<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
					{title || "Untitled Item"}
				</Text>
				<Text style={styles.value}>${price?.toFixed(2) || "0.00"}</Text>
				<Text style={styles.description} numberOfLines={Platform.OS === "web" ? 2 : 1} ellipsizeMode="tail">
					{description || "No description available."}
				</Text>
			</View>

			<View style={styles.buttonRow}>
				<Pressable
					style={({ pressed }) => [styles.actionButton, styles.buyButton, pressed && styles.buyButtonPressed]}
					onPress={() => {
						setInputPrice(price);
						setBuyModalVisible(true);
					}}
				>
					<Ionicons name="cart-outline" size={16} color={AppColors.buttonTextPrimary} style={styles.buttonIcon} />
					<Text style={styles.actionButtonText}>Buy</Text>
				</Pressable>

				{ownerFirebaseUid && (
					<>
						<Pressable style={({ pressed }) => [styles.actionButton, styles.bargainButton, pressed && styles.bargainButtonPressed]} onPress={() => setBargainModalVisible(true)}>
							<Ionicons name="chatbubbles-outline" size={16} color={AppColors.buttonTextPrimary} style={styles.buttonIcon} />
							<Text style={styles.actionButtonText}>Bargain</Text>
						</Pressable>
						<Pressable style={({ pressed }) => [styles.actionButton, styles.tradeButton, pressed && styles.tradeButtonPressed]} onPress={openTradeModal}>
							<Ionicons name="swap-horizontal-outline" size={16} color={AppColors.buttonTextPrimary} style={styles.buttonIcon} />
							<Text style={styles.actionButtonText}>Trade</Text>
						</Pressable>
					</>
				)}
			</View>

			<Modal animationType="fade" transparent visible={buyModalVisible} onRequestClose={closeAllModals}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalView, { width: modalWidth }]}>
						<Pressable style={styles.modalCloseButton} onPress={closeAllModals}>
							<Ionicons name="close-circle" size={28} color={AppColors.textSecondary} />
						</Pressable>
						<Text style={styles.modalTitle}>Purchase: {title}</Text>
						<ScrollView contentContainerStyle={styles.modalScrollViewContent}>
							<Text style={styles.modalLabel}>Confirm Price:</Text>
							<View style={styles.stepperContainer}>
								<Pressable style={styles.stepperButton} onPress={decrementPrice}>
									<Ionicons name="remove-circle-outline" size={24} color={AppColors.accentBlue} />
								</Pressable>
								<Text style={styles.priceText}>${inputPrice?.toFixed(2)}</Text>
								<Pressable style={styles.stepperButton} onPress={incrementPrice}>
									<Ionicons name="add-circle-outline" size={24} color={AppColors.accentBlue} />
								</Pressable>
							</View>
							<Text style={styles.modalLabel}>Adjust By:</Text>
							<View style={styles.stepperContainer}>
								<Pressable style={styles.stepperButton} onPress={decrementMultiplier}>
									<Ionicons name="remove-circle-outline" size={24} color={AppColors.accentBlue} />
								</Pressable>
								<Text style={styles.priceText}>${multiplier}</Text>
								<Pressable style={styles.stepperButton} onPress={incrementMultiplier}>
									<Ionicons name="add-circle-outline" size={24} color={AppColors.accentBlue} />
								</Pressable>
							</View>
						</ScrollView>
						<Pressable style={({ pressed }) => [styles.modalConfirmButton, isLoading && styles.modalButtonDisabled, pressed && styles.modalConfirmButtonPressed]} onPress={handleConfirmBuy} disabled={isLoading}>
							{isLoading ? <ActivityIndicator size="small" color={AppColors.buttonTextPrimary} /> : <Text style={styles.modalButtonText}>Confirm Purchase</Text>}
						</Pressable>
					</View>
				</View>
			</Modal>

			<Modal animationType="fade" transparent visible={bargainModalVisible} onRequestClose={closeAllModals}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalView, { width: modalWidth, height: windowHeight * 0.7, maxHeight: 600 }]}>
						<Pressable style={styles.modalCloseButton} onPress={closeAllModals}>
							<Ionicons name="close-circle" size={28} color={AppColors.textSecondary} />
						</Pressable>
						<Text style={styles.modalTitle}>Bargain for: {title}</Text>
						<FlatList
							data={chatMessages}
							renderItem={({ item }) => (
								<View style={[styles.chatBubble, item.isUser ? styles.userBubble : styles.sellerBubble]}>
									<Text style={styles.chatText}>{item.text}</Text>
								</View>
							)}
							keyExtractor={(item) => item.id}
							style={styles.chatWindow}
							contentContainerStyle={{ paddingBottom: 10 }}
							inverted 
						/>
						<View style={styles.messageInputContainer}>
							<TextInput style={styles.chatInput} value={message} onChangeText={setMessage} placeholder="Type your offer..." placeholderTextColor={AppColors.placeholderText} />
							<Pressable style={({ pressed }) => [styles.sendButton, pressed && styles.modalConfirmButtonPressed]} onPress={handleSendMessage}>
								<Ionicons name="send-outline" size={20} color={AppColors.buttonTextPrimary} />
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>

			<Modal animationType="fade" transparent visible={tradeModalVisible} onRequestClose={closeAllModals}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalView, { width: modalWidth }]}>
						<Pressable style={styles.modalCloseButton} onPress={closeAllModals}>
							<Ionicons name="close-circle" size={28} color={AppColors.textSecondary} />
						</Pressable>
						<Text style={styles.modalTitle}>Offer Trade for: {title}</Text>
						<ScrollView contentContainerStyle={styles.modalScrollViewContent}>
							{inventoryLoading ? (
								<ActivityIndicator size="large" color={AppColors.loadingIndicator} style={{ marginVertical: 20 }} />
							) : inventoryError ? (
								<Text style={styles.modalErrorText}>{inventoryError}</Text>
							) : userInventory.length === 0 ? (
								<Text style={styles.emptyInventoryText}>Your inventory is empty. Add items to trade!</Text>
							) : (
								<>
									<Text style={styles.modalLabel}>Select your item to offer:</Text>
									<View style={styles.pickerWrapper}>
										<Picker
											selectedValue={selectedTradeItem}
											onValueChange={(itemValue) => setSelectedTradeItem(itemValue)}
											style={styles.picker}
											itemStyle={styles.pickerItem} 
											dropdownIconColor={AppColors.textPrimary} 
										>
											{userInventory.map((item) => (
												<Picker.Item key={item.id} label={`${item.name || "Unnamed Item"} (Value: $${item.hidden_value?.toFixed(2) || "N/A"})`} value={item.id} />
											))}
										</Picker>
									</View>
								</>
							)}
						</ScrollView>
						{userInventory.length > 0 && !inventoryError && (
							<Pressable style={({ pressed }) => [styles.modalConfirmButton, (isLoading || !selectedTradeItem) && styles.modalButtonDisabled, pressed && styles.modalConfirmButtonPressed]} onPress={handleConfirmTrade} disabled={isLoading || !selectedTradeItem}>
								{isLoading ? <ActivityIndicator size="small" color={AppColors.buttonTextPrimary} /> : <Text style={styles.modalButtonText}>Send Trade Offer</Text>}
							</Pressable>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: AppColors.cardBackground,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: AppColors.cardBorder,
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 5, 
		overflow: "hidden", 
		width: "100%", 
	},
	cardWeb: {
		transition: "transform 0.2s ease-out, box-shadow 0.2s ease-out",
	},
	image: {
		width: "100%",
		aspectRatio: 1.5,
		backgroundColor: AppColors.backgroundSecondary, 
	},
	textContainer: {
		padding: 12,
		flexGrow: 1,
	},
	title: {
		fontSize: Platform.OS === "web" ? 15 : 14,
		fontWeight: "600",
		color: AppColors.textPrimary,
		marginBottom: 4,
		fontFamily: "sans-serif",
	},
	value: {
		fontSize: Platform.OS === "web" ? 14 : 13,
		fontWeight: "700",
		color: AppColors.accentGreen,
		marginBottom: 6,
		fontFamily: "sans-serif",
	},
	description: {
		fontSize: Platform.OS === "web" ? 13 : 12,
		color: AppColors.textSecondary,
		fontFamily: "sans-serif",
		lineHeight: Platform.OS === "web" ? 18 : 16,
	},
	buttonRow: {
		flexDirection: "row",
		paddingHorizontal: 8,
		paddingVertical: 8,
		borderTopWidth: 1,
		borderTopColor: AppColors.separator,
		backgroundColor: AppColors.cardBackground,
	},
	actionButton: {
		flex: 1, 
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 8,
		paddingHorizontal: 6,
		borderRadius: 8,
		marginHorizontal: 4,
		minHeight: 36, 
	},
	buttonIcon: {
		marginRight: 6,
	},
	actionButtonText: {
		color: AppColors.buttonTextPrimary,
		fontWeight: "500",
		fontSize: 12,
		fontFamily: "sans-serif",
	},
	buyButton: { backgroundColor: AppColors.accentGreen },
	buyButtonPressed: { backgroundColor: "#2A8C4A" }, 
	bargainButton: { backgroundColor: AppColors.accentBlue },
	bargainButtonPressed: { backgroundColor: "#005FCE" },
	tradeButton: { backgroundColor: AppColors.accentRed },
	tradeButtonPressed: { backgroundColor: "#C62828" },

	modalOverlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: AppColors.modalOverlayBackground,
	},
	modalView: {
		backgroundColor: AppColors.modalContentBackground,
		borderRadius: 14,
		padding: 0, 
		alignItems: "stretch",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 20,
		maxHeight: "85%", 
		overflow: "hidden",
	},
	modalCloseButton: {
		position: "absolute",
		top: Platform.OS === "ios" ? 14 : 10, 
		right: Platform.OS === "ios" ? 14 : 10,
		zIndex: 10, 
		padding: 6,
		borderRadius: 18,
		backgroundColor: "rgba(0,0,0,0.25)",
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: "600", 
		color: AppColors.modalTitleText,
		textAlign: "center",
		paddingVertical: 14,
		paddingHorizontal: 50,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: AppColors.separator,
		fontFamily: "sans-serif",
	},
	modalScrollViewContent: {
		paddingHorizontal: 20,
		paddingTop: 10, 
		paddingBottom: 15, 
	},
	modalLabel: {
		marginTop: 15,
		marginBottom: 8,
		fontSize: 13,
		fontWeight: "500",
		color: AppColors.textSecondary,
		fontFamily: "sans-serif",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	stepperContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginVertical: 8,
		backgroundColor: AppColors.modalInputBackground,
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	stepperButton: {
		padding: 10, 
	},
	priceText: {
		fontSize: 19,
		fontWeight: "600",
		color: AppColors.textPrimary,
		minWidth: 90, 
		textAlign: "center",
		fontFamily: "sans-serif",
	},
	modalConfirmButton: {
		backgroundColor: AppColors.accentBlue,
		paddingVertical: 15,
		borderRadius: 10,
		alignItems: "center",
		marginHorizontal: 20, 
		marginTop: 10, 
		marginBottom: Platform.OS === "ios" ? 25 : 20, 
		minHeight: 50, 
	},
	modalConfirmButtonPressed: {
		backgroundColor: "#005FCE",
	},
	modalButtonDisabled: {
		backgroundColor: AppColors.fillTertiary,
		opacity: 0.6,
	},
	modalButtonText: {
		color: AppColors.buttonTextPrimary,
		fontSize: 17,
		fontWeight: "600",
		fontFamily: "sans-serif",
	},
	// Picker styles
	pickerWrapper: {
		borderWidth: 1,
		borderColor: AppColors.modalInputBorder,
		borderRadius: 10,
		marginTop: 5,
		marginBottom: 20,
		backgroundColor: AppColors.modalInputBackground,
		overflow: "hidden",
		height: Platform.OS === "ios" ? 180 : 50, 
		justifyContent: "center",
	},
	picker: {
		width: "100%",
		color: AppColors.textPrimary, 
		height: Platform.OS === "android" ? 50 : undefined, 
	},
	pickerItem: {
		color: AppColors.textPrimary,
		fontSize: 17,
		height: 180, 
		fontFamily: "sans-serif",
	},

	chatWindow: {
		flex: 1, 
		width: "100%",
		marginVertical: 10,
		backgroundColor: AppColors.backgroundPrimary, 
		borderRadius: 10,
		padding: 10,
	},
	chatBubble: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 20, 
		marginVertical: 5,
		maxWidth: "80%", 
	},
	userBubble: {
		backgroundColor: AppColors.accentBlue,
		alignSelf: "flex-end",
		borderBottomRightRadius: 8, 
	},
	sellerBubble: {
		backgroundColor: AppColors.fillTertiary,
		alignSelf: "flex-start",
		borderBottomLeftRadius: 8,
	},
	chatText: {
		fontSize: 15,
		color: AppColors.textPrimary,
		fontFamily: "sans-serif",
		lineHeight: 20,
	},
	messageInputContainer: {
		flexDirection: "row",
		width: "100%",
		paddingHorizontal: 15,
		paddingVertical: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: AppColors.separator,
		alignItems: "center",
		backgroundColor: AppColors.modalContentBackground,
	},
	chatInput: {
		flex: 1,
		backgroundColor: AppColors.modalInputBackground,
		borderRadius: 22, 
		paddingVertical: Platform.OS === "ios" ? 12 : 10,
		paddingHorizontal: 18,
		marginRight: 10,
		color: AppColors.textPrimary,
		fontSize: 15,
		fontFamily: "sans-serif",
	},
	sendButton: {
		backgroundColor: AppColors.accentBlue,
		padding: 12,
		borderRadius: 22, 
		justifyContent: "center",
		alignItems: "center",
	},
	modalErrorText: {
		color: AppColors.accentRed,
		marginTop: 15,
		textAlign: "center",
		paddingHorizontal: 10,
		fontSize: 14,
		fontWeight: "500",
		fontFamily: "sans-serif",
	},
	emptyInventoryText: {
		color: AppColors.textSecondary,
		marginTop: 20,
		textAlign: "center",
		fontSize: 15,
		paddingHorizontal: 10,
		fontFamily: "sans-serif",
		lineHeight: 22,
	},
});
