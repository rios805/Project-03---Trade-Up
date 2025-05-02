//@ts-nocheck
import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, Modal, Pressable, Alert, FlatList, TextInput, Dimensions, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { auth } from "../utils/firebaseConfig";

export default function MarketItem({ id, imageUrl, price, title, description, onPurchaseComplete }) {
	// States for modals
	const [infoModalVisible, setInfoModalVisible] = useState(false);
	const [buyModalVisible, setBuyModalVisible] = useState(false);
	const [bargainModalVisible, setBargainModalVisible] = useState(false);
	const [tradeModalVisible, setTradeModalVisible] = useState(false);

	// States for user interactions
	const [inputPrice, setInputPrice] = useState(price);
	const [multiplier, setMultiplier] = useState(1);
	const [chatMessages, setChatMessages] = useState([]);
	const [message, setMessage] = useState("");
	const [selectedTradeItem, setSelectedTradeItem] = useState("");

	// Loading state
	const [isLoading, setIsLoading] = useState(false);

	// Window size for responsive design
	const [windowSize, setWindowSize] = useState(Dimensions.get("window"));

	useEffect(() => {
		const subscription = Dimensions.addEventListener("change", ({ window }) => {
			setWindowSize(window);
		});
		return () => subscription?.remove();
	}, []);

	// Dummy trade options - in a real app, these would come from the user's inventory
	const tradeOptions = ["bike", "chair", "car", "Mystery Box"];

	const getClampedWidth = (percentage, min, max) => {
		const calculated = windowSize.width * percentage;
		return Math.min(Math.max(calculated, min), max);
	};

	const closeAll = () => {
		setInfoModalVisible(false);
		setBuyModalVisible(false);
		setBargainModalVisible(false);
		setTradeModalVisible(false);
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

			console.log(`Frontend auth.currentUser.uid before getting token: ${user.uid}`);


			const token = await user.getIdToken();

			console.log(`Sending purchase request: itemId=${id}, offeredPrice=${inputPrice}`);

			// Make API call to purchase the item
			const response = await axios.post(
				`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/purchase`,
				{
					itemId: id,
					offeredPrice: inputPrice,
				},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			// Close the modal and show success message
			setBuyModalVisible(false);
			Alert.alert("Purchase Successful", `You bought ${title} for $${inputPrice.toFixed(2)}`);

			// Notify parent component about the purchase
			if (onPurchaseComplete) {
				onPurchaseComplete(id);
			}
		} catch (error) {
			console.error("Error purchasing item:", error);
			Alert.alert("Purchase Failed", error.response?.data?.error || "There was an error processing your purchase");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSendMessage = () => {
		if (message.trim()) {
			// Add the user's message
			setChatMessages((msgs) => [
				...msgs,
				{
					text: message.trim(),
					isUser: true,
				},
			]);

			// Simulate a response (in a real app, this would be an API call)
			setTimeout(() => {
				setChatMessages((msgs) => [
					...msgs,
					{
						text: `I can offer this item for $${(price * 0.9).toFixed(2)}`,
						isUser: false,
					},
				]);
			}, 1000);

			setMessage("");
		}
	};

	const handleConfirmTrade = () => {
		setTradeModalVisible(false);
		Alert.alert("Trade Offer Sent", `You offered: ${selectedTradeItem} for ${title}`);
	};

	const incrementPrice = () => setInputPrice((prev) => parseFloat((prev + multiplier).toFixed(2)));
	const decrementPrice = () => setInputPrice((prev) => Math.max(0, parseFloat((prev - multiplier).toFixed(2))));
	const incrementMultiplier = () => setMultiplier((prev) => prev + 1);
	const decrementMultiplier = () => setMultiplier((prev) => Math.max(1, prev - 1));

	return (
		<View style={styles.card}>
			<Image source={{ uri: imageUrl }} style={styles.image} />
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.value}>${price.toFixed(2)}</Text>
			<Text style={styles.description}>{description}</Text>

			<View style={{ height: 20 }} />

			<View style={styles.infoRow}>
				<Pressable
					style={[styles.button, styles.buyButton]}
					onPress={() => {
						setInputPrice(price);
						setBuyModalVisible(true);
					}}
				>
					<Text style={styles.buttonText}>Buy</Text>
				</Pressable>

				<View>
					<Pressable style={[styles.button, styles.bargainButton]} onPress={() => setBargainModalVisible(true)}>
						<Text style={styles.buttonText}>Bargain</Text>
					</Pressable>
					<Pressable
						style={[styles.button, styles.tradeButton]}
						onPress={() => {
							setSelectedTradeItem(tradeOptions[0]);
							setTradeModalVisible(true);
						}}
					>
						<Text style={styles.buttonText}>Trade</Text>
					</Pressable>
				</View>
			</View>

			{/* Buy Modal */}
			<Modal animationType="fade" transparent visible={buyModalVisible} onRequestClose={closeAll}>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.modalView,
							{
								width: getClampedWidth(0.8, 300, 500),
								height: windowSize.height * 0.4,
							},
						]}
					>
						<Pressable style={styles.topRightX} onPress={closeAll}>
							<Text style={styles.xText}>×</Text>
						</Pressable>
						<Text style={styles.modalTitle}>Purchase {title}</Text>

						<Text style={styles.label}>Price</Text>
						<View style={styles.stepperContainer}>
							<Pressable style={styles.stepperButton} onPress={decrementPrice}>
								<Text style={styles.stepperText}>-</Text>
							</Pressable>
							<Text style={styles.priceText}>${inputPrice.toFixed(2)}</Text>
							<Pressable style={styles.stepperButton} onPress={incrementPrice}>
								<Text style={styles.stepperText}>+</Text>
							</Pressable>
						</View>

						<Text style={styles.label}>Adjust By</Text>
						<View style={styles.stepperContainer}>
							<Pressable style={styles.stepperButton} onPress={decrementMultiplier}>
								<Text style={styles.stepperText}>-</Text>
							</Pressable>
							<Text style={styles.priceText}>${multiplier}</Text>
							<Pressable style={styles.stepperButton} onPress={incrementMultiplier}>
								<Text style={styles.stepperText}>+</Text>
							</Pressable>
						</View>

						<Pressable style={[styles.confirmButton, isLoading && styles.buttonDisabled]} onPress={handleConfirmBuy} disabled={isLoading}>
							{isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Confirm Purchase</Text>}
						</Pressable>
					</View>
				</View>
			</Modal>

			{/* Bargain Modal */}
			<Modal animationType="fade" transparent visible={bargainModalVisible} onRequestClose={closeAll}>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.modalView,
							{
								width: getClampedWidth(0.8, 320, 600),
								height: windowSize.height * 0.6,
							},
						]}
					>
						<Pressable style={styles.topRightX} onPress={closeAll}>
							<Text style={styles.xText}>×</Text>
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

			{/* Trade Modal */}
			<Modal animationType="fade" transparent visible={tradeModalVisible} onRequestClose={closeAll}>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.modalView,
							{
								width: getClampedWidth(0.8, 320, 600),
								height: windowSize.height * 0.4,
							},
						]}
					>
						<Pressable style={styles.topRightX} onPress={closeAll}>
							<Text style={styles.xText}>×</Text>
						</Pressable>
						<Text style={styles.modalTitle}>Trade</Text>
						<Text style={styles.label}>Offer an item to trade:</Text>
						<View style={styles.pickerContainer}>
							<Picker selectedValue={selectedTradeItem} onValueChange={(itemValue) => setSelectedTradeItem(itemValue)} style={styles.picker}>
								{tradeOptions.map((item) => (
									<Picker.Item key={item} label={item} value={item} />
								))}
							</Picker>
						</View>
						<Pressable style={styles.confirmButton} onPress={handleConfirmTrade}>
							<Text style={styles.buttonText}>Send Trade</Text>
						</Pressable>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#fff",
		borderRadius: 10,
		padding: 16,
		shadowColor: "#000",
		shadowOpacity: 0.1,
		shadowRadius: 5,
		shadowOffset: { width: 0, height: 3 },
		marginBottom: 20,
		alignItems: "center",
	},
	image: {
		width: "100%",
		height: 150,
		borderRadius: 8,
		marginBottom: 12,
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 6,
	},
	value: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#4CAF50",
	},
	description: {
		fontSize: 14,
		color: "#777",
		marginVertical: 10,
		textAlign: "center",
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		width: "100%",
		maxWidth: 600,
		alignSelf: "center",
		paddingHorizontal: 10,
		marginBottom: 20,
	},
	button: {
		marginTop: 10,
		backgroundColor: "#4CAF50",
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 5,
	},
	buyButton: {
		backgroundColor: "#28ff00",
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: "center",
		alignItems: "center",
	},
	bargainButton: {
		backgroundColor: "#00d9ff",
		marginBottom: 10,
	},
	tradeButton: {
		backgroundColor: "#ff0013",
	},
	buttonText: {
		color: "#fff",
		fontWeight: "bold",
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	modalOverlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	modalView: {
		backgroundColor: "#fff",
		borderRadius: 10,
		padding: 20,
		alignItems: "center",
		position: "relative",
		elevation: 5,
	},
	topRightX: {
		position: "absolute",
		top: 10,
		right: 10,
		padding: 10,
	},
	xText: {
		fontSize: 24,
		color: "#000",
		fontWeight: "bold",
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 20,
		marginTop: 10,
	},
	label: {
		marginTop: 10,
		fontWeight: "bold",
		fontSize: 16,
	},
	stepperContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginVertical: 10,
	},
	stepperButton: {
		backgroundColor: "#eee",
		padding: 10,
		borderRadius: 5,
		marginHorizontal: 15,
		width: 40,
		alignItems: "center",
	},
	stepperText: {
		fontSize: 18,
		fontWeight: "bold",
	},
	priceText: {
		fontSize: 20,
		fontWeight: "bold",
		width: 100,
		textAlign: "center",
	},
	confirmButton: {
		position: "absolute",
		bottom: 20,
		right: 20,
		backgroundColor: "#4CAF50",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
		minWidth: 150,
		alignItems: "center",
	},
	pickerContainer: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 5,
		marginTop: 10,
		width: "100%",
		marginBottom: 30,
	},
	picker: {
		width: "100%",
		height: 50,
	},
	chatWindow: {
		width: "100%",
		height: "60%",
		marginVertical: 15,
	},
	chatBubble: {
		padding: 10,
		borderRadius: 10,
		marginVertical: 5,
		maxWidth: "80%",
	},
	userBubble: {
		backgroundColor: "#E3F2FD",
		alignSelf: "flex-end",
	},
	sellerBubble: {
		backgroundColor: "#F1F1F1",
		alignSelf: "flex-start",
	},
	chatText: {
		fontSize: 14,
	},
	messageInputContainer: {
		flexDirection: "row",
		width: "100%",
		marginTop: 10,
	},
	chatInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 5,
		padding: 10,
		marginRight: 10,
	},
	sendButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 5,
		justifyContent: "center",
	},
});
