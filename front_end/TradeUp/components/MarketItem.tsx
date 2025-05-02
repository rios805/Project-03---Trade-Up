// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	Image,
	StyleSheet,
	Modal,
	Pressable,
	Alert,
	FlatList,
	TextInput,
	Dimensions,
	ActivityIndicator,
	Platform, 
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { auth } from "../utils/firebaseConfig";
import { useRouter } from "expo-router";

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
	console.log("Sending trade creation request:", numericTradeData);
	const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/trades/create`, numericTradeData, { headers: { Authorization: `Bearer ${token}` } });
	return response.data;
};

export default function MarketItem({ id, imageUrl, price, title, description, ownerFirebaseUid, onPurchaseComplete }) {
	// States for modals
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

	const [windowSize, setWindowSize] = useState(Dimensions.get("window"));
	const router = useRouter();

	useEffect(() => {
		const subscription = Dimensions.addEventListener("change", ({ window }) => {
			setWindowSize(window);
		});
		return () => subscription?.remove();
	}, []);

	const getClampedWidth = (percentage, min, max) => {
		const calculated = windowSize.width * percentage;
		return Math.min(Math.max(calculated, min), max);
	};

	const closeAll = () => {
		setInfoModalVisible(false);
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
				setBuyModalVisible(false);
				setIsLoading(false);
				return;
			}
			const token = await user.getIdToken();
			console.log(`Sending purchase request: itemId=${id}, offeredPrice=${inputPrice}`);
			const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/purchase`, { itemId: id, offeredPrice: inputPrice }, { headers: { Authorization: `Bearer ${token}` } });
			setBuyModalVisible(false);
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
			setChatMessages((msgs) => [...msgs, { text: message.trim(), isUser: true }]);
			setTimeout(() => {
				setChatMessages((msgs) => [...msgs, { text: `I can offer this item for $${(price * 0.9).toFixed(2)}`, isUser: false }]);
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
			console.error("ownerFirebaseUid is missing in MarketItem props for item ID:", id);
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
			setTradeModalVisible(false);
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

	return (
		<View style={styles.card}>
			<Image source={{ uri: imageUrl || "https://placehold.co/200x150/222/ccc?text=No+Image" }} style={styles.image} resizeMode="cover" />
			<View style={styles.textContainer}>
				<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
					{title || "No Title"}
				</Text>
				<Text style={styles.value}>${price?.toFixed(2) || "0.00"}</Text>
				<Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
					{description || "No description available."}
				</Text>
			</View>

			<View style={styles.buttonContainer}>
				<Pressable
					style={({ pressed }) => [styles.button, styles.buyButton, pressed && styles.buttonPressedBuy]}
					onPress={() => {
						setInputPrice(price);
						setBuyModalVisible(true);
					}}
				>
					<Text style={styles.buttonText}>Buy</Text>
				</Pressable>

				{ownerFirebaseUid && (
					<View style={styles.actionButtonsContainer}>
						<Pressable style={({ pressed }) => [styles.button, styles.bargainButton, pressed && styles.buttonPressedBargain]} onPress={() => setBargainModalVisible(true)}>
							<Text style={styles.buttonText}>Bargain</Text>
						</Pressable>
						<Pressable style={({ pressed }) => [styles.button, styles.tradeButton, pressed && styles.buttonPressedTrade]} onPress={openTradeModal}>
							<Text style={styles.buttonText}>Trade</Text>
						</Pressable>
					</View>
				)}
			</View>

			<Modal animationType="fade" transparent visible={buyModalVisible} onRequestClose={closeAll}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalView, { width: getClampedWidth(0.85, 300, 500), minHeight: windowSize.height * 0.45 }]}>
						<Pressable style={styles.closeButton} onPress={closeAll}>
							<Text style={styles.closeButtonText}>×</Text>
						</Pressable>
						<Text style={styles.modalTitle}>Purchase {title}</Text>
						<Text style={styles.label}>Set Your Price:</Text>
						<View style={styles.stepperContainer}>
							<Pressable style={styles.stepperButton} onPress={decrementPrice}>
								<Text style={styles.stepperText}>-</Text>
							</Pressable>
							<Text style={styles.priceText}>${inputPrice?.toFixed(2)}</Text>
							<Pressable style={styles.stepperButton} onPress={incrementPrice}>
								<Text style={styles.stepperText}>+</Text>
							</Pressable>
						</View>
						<Text style={styles.label}>Adjust By:</Text>
						<View style={styles.stepperContainer}>
							<Pressable style={styles.stepperButton} onPress={decrementMultiplier}>
								<Text style={styles.stepperText}>-</Text>
							</Pressable>
							<Text style={styles.priceText}>${multiplier}</Text>
							<Pressable style={styles.stepperButton} onPress={incrementMultiplier}>
								<Text style={styles.stepperText}>+</Text>
							</Pressable>
						</View>
						<Pressable style={({ pressed }) => [styles.confirmButton, isLoading && styles.buttonDisabled, pressed && styles.buttonPressedConfirm]} onPress={handleConfirmBuy} disabled={isLoading}>
							{isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Confirm Purchase</Text>}
						</Pressable>
					</View>
				</View>
			</Modal>

			{/* Bargain Modal */}
			<Modal animationType="fade" transparent visible={bargainModalVisible} onRequestClose={closeAll}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalView, { width: getClampedWidth(0.9, 320, 600), height: windowSize.height * 0.7 }]}>
						<Pressable style={styles.closeButton} onPress={closeAll}>
							<Text style={styles.closeButtonText}>×</Text>
						</Pressable>
						<Text style={styles.modalTitle}>Bargain with Seller</Text>
						<FlatList
							data={chatMessages}
							renderItem={({ item }) => (
								<View style={[styles.chatBubble, item.isUser ? styles.userBubble : styles.sellerBubble]}>
									<Text style={styles.chatText}>{item.text}</Text>
								</View>
							)}
							keyExtractor={(_, idx) => idx.toString()}
							style={styles.chatWindow}
							contentContainerStyle={{ paddingBottom: 10 }}
						/>
						<View style={styles.messageInputContainer}>
							<TextInput style={styles.chatInput} value={message} onChangeText={setMessage} placeholder="Make an offer..." placeholderTextColor="#999" />
							<Pressable style={styles.sendButton} onPress={handleSendMessage}>
								<Text style={styles.buttonText}>Send</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>

			<Modal animationType="fade" transparent visible={tradeModalVisible} onRequestClose={closeAll}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalView, { width: getClampedWidth(0.85, 320, 600), minHeight: windowSize.height * 0.45 }]}>
						<Pressable style={styles.closeButton} onPress={closeAll}>
							<Text style={styles.closeButtonText}>×</Text>
						</Pressable>
						<Text style={styles.modalTitle}>Offer Trade for {title}</Text>

						{inventoryLoading ? (
							<ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 20 }} />
						) : inventoryError ? (
							<Text style={styles.errorText}>{inventoryError}</Text>
						) : userInventory.length === 0 ? (
							<Text style={styles.emptyInventoryText}>You have no items in your inventory to trade.</Text>
						) : (
							<>
								<Text style={styles.label}>Select item to offer:</Text>
								<View style={styles.pickerContainer}>
									<Picker selectedValue={selectedTradeItem} onValueChange={(itemValue) => setSelectedTradeItem(itemValue)} style={styles.picker} itemStyle={styles.pickerItem}>
										{userInventory.map((item) => (
											<Picker.Item key={item.id} label={`${item.name || "Unnamed Item"} (Value: ${item.hidden_value || "?"})`} value={item.id} />
										))}
									</Picker>
								</View>
								<Pressable style={({ pressed }) => [styles.confirmButton, (isLoading || !selectedTradeItem) && styles.buttonDisabled, pressed && styles.buttonPressedConfirm]} onPress={handleConfirmTrade} disabled={isLoading || !selectedTradeItem}>
									{isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Send Trade Offer</Text>}
								</Pressable>
							</>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#222",
		borderRadius: 8,
		shadowColor: "#0f0",
		shadowOpacity: 0.2,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
		marginBottom: 15,
		alignItems: "center",
		width: "100%",
		overflow: "hidden",
		elevation: 4,
	},
	image: {
		width: "100%",
		aspectRatio: 16 / 10,
		backgroundColor: "#333",
	},
	textContainer: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		width: "100%",
		alignItems: "center",
	},
	title: {
		fontSize: 15,
		fontWeight: "600",
		color: "#E8E8E8",
		marginBottom: 3,
		textAlign: "center",
	},
	value: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#4CAF50",
		textAlign: "center",
		marginBottom: 5,
	},
	description: {
		fontSize: 12,
		color: "#B0B0B0",
		textAlign: "center",
		marginBottom: 8,
	},
	buttonContainer: {
		flexDirection: "row",
		width: "100%",
		paddingHorizontal: 10,
		paddingBottom: 10,
		paddingTop: 5,
		borderTopWidth: 1,
		borderTopColor: "#333",
	},
	button: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 32,
		elevation: 1,
		shadowOpacity: 0.15,
		shadowRadius: 1,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 12,
		textAlign: "center",
	},
	buyButton: {
		backgroundColor: "#2E7D32",
		flexGrow: 1,
		marginRight: 4,
	},
	buttonPressedBuy: {
		backgroundColor: "#1B5E20",
	},
	actionButtonsContainer: {
		flexDirection: "column",
		marginLeft: 4,
		flexShrink: 0,
		width: "38%",
	},
	bargainButton: {
		backgroundColor: "#0277BD",
		marginBottom: 4,
	},
	buttonPressedBargain: {
		backgroundColor: "#01579B",
	},
	tradeButton: {
		backgroundColor: "#C62828",
	},
	buttonPressedTrade: {
		backgroundColor: "#B71C1C",
	},
	buttonDisabled: {
		opacity: 0.6,
		backgroundColor: "#424242",
	},
	modalOverlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.7)",
	},
	modalView: {
		backgroundColor: "#f0f0f0",
		borderRadius: 15,
		padding: 20,
		alignItems: "center",
		position: "relative",
		elevation: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
		borderWidth: 1,
		borderColor: "#ccc",
	},
	closeButton: {
		position: "absolute",
		top: 8,
		right: 8,
		backgroundColor: "#e0e0e0",
		borderRadius: 15,
		width: 30,
		height: 30,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1,
		elevation: 6,
	},
	closeButtonText: {
		fontSize: 18,
		color: "#333",
		fontWeight: "bold",
		lineHeight: 20,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 20,
		marginTop: 15,
		color: "#333",
		textAlign: "center",
	},
	label: {
		marginTop: 15,
		fontWeight: "600",
		fontSize: 15,
		color: "#555",
		alignSelf: "flex-start",
		marginLeft: "5%",
		marginBottom: 5,
	},
	stepperContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginVertical: 8,
		width: "90%",
		backgroundColor: "#fff",
		padding: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	stepperButton: {
		backgroundColor: "#e0e0e0",
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 5,
		minWidth: 40,
		alignItems: "center",
	},
	stepperText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
	},
	priceText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#000",
		minWidth: 80,
		textAlign: "center",
	},
	confirmButton: {
		marginTop: 25,
		alignSelf: "center",
		backgroundColor: "#4CAF50",
		paddingVertical: 12,
		paddingHorizontal: 30,
		borderRadius: 8,
		minWidth: 180,
		alignItems: "center",
		elevation: 2,
	},
	buttonPressedConfirm: {
		backgroundColor: "#388E3C",
	},
	pickerContainer: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		marginTop: 5,
		width: "90%",
		marginBottom: 25,
		backgroundColor: "#fff",
		overflow: "hidden",
	},
	picker: {
		width: "100%",
		height: Platform.OS === "ios" ? 180 : 50,
		color: "#000",
	},
	pickerItem: {
		color: "#000",
		fontSize: 16,
		height: Platform.OS === "ios" ? 180 : undefined,
	},
	chatWindow: {
		width: "100%",
		flex: 1,
		marginVertical: 15,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		backgroundColor: "#fff",
		padding: 10,
	},
	chatBubble: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 15,
		marginVertical: 4,
		maxWidth: "80%",
		elevation: 1,
	},
	userBubble: {
		backgroundColor: "#d1e7ff",
		alignSelf: "flex-end",
		borderBottomRightRadius: 5,
	},
	sellerBubble: {
		backgroundColor: "#f1f1f1",
		alignSelf: "flex-start",
		borderBottomLeftRadius: 5,
	},
	chatText: {
		fontSize: 14,
		color: "#333",
	},
	messageInputContainer: {
		flexDirection: "row",
		width: "100%",
		marginTop: 10,
		paddingHorizontal: 10,
		alignItems: "center",
		borderTopWidth: 1,
		borderTopColor: "#eee",
		paddingTop: 10,
	},
	chatInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 20,
		paddingVertical: 8,
		paddingHorizontal: 15,
		marginRight: 10,
		backgroundColor: "#fff",
		height: 40,
	},
	sendButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 20,
		justifyContent: "center",
		height: 40,
	},
	errorText: {
		color: "#D32F2F",
		marginTop: 15,
		textAlign: "center",
		paddingHorizontal: 10,
		fontSize: 14,
		fontWeight: "500",
	},
	emptyInventoryText: {
		color: "#666",
		marginTop: 20,
		textAlign: "center",
		fontSize: 15,
		paddingHorizontal: 10,
	},
});
