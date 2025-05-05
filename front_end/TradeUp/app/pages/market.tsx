//@ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, Alert, RefreshControl, Pressable } from "react-native";
import MarketItem from "../../components/MarketItem"; 
import axios from "axios";
import { auth } from "../../utils/firebaseConfig";

export default function Market() {
	const [allItems, setAllItems] = useState([]); 
    const [viewMode, setViewMode] = useState('player'); 
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const { width: screenWidth } = useWindowDimensions();
	const ITEM_MARGIN = 10; 
    const currentUserUid = auth.currentUser?.uid;

	// This I left because in theory it should help for different size screens.
	let columns = 5;
	if (screenWidth < 600) { columns = 2; }
    else if (screenWidth < 900) { columns = 3; }
	const itemWidth = (screenWidth - ITEM_MARGIN * (columns + 1)) / columns;

	const fetchMarketItems = useCallback(async () => {
		console.log("[Market] Starting fetchMarketItems...");
        if (!refreshing) setLoading(true);
		try {
			const user = auth.currentUser;
			if (!user) {
       
                Alert.alert("Not logged in", "Please log in to view market items.");
                setLoading(false); setRefreshing(false);
                return;
            }
			const token = await user.getIdToken();
			console.log("[Market] Got ID token");
			const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/marketplace`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			console.log("[Market] Got all market items:", response.data.length);
			setAllItems(response.data || []); // Stores the raw list
		} catch (error) {
            console.error("Failed to fetch market items:", error);
			Alert.alert("Error", "Failed to load market items.");
            setAllItems([]); // Clear items on error
        }
        finally { setLoading(false); setRefreshing(false); }
	}, [refreshing]); 

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchMarketItems();
	}, [fetchMarketItems]);

	useEffect(() => {
		console.log("[Market] useEffect running...");
		fetchMarketItems();
	}, [fetchMarketItems]);


    const filteredMarketItems = useMemo(() => {
        if (viewMode === 'player') {
            // Show items owned by OTHERS (This is the default view)
            const playerItems = allItems.filter(item =>
                item.ownerFirebaseUid !== null && // Must have an owner
                item.ownerFirebaseUid !== currentUserUid // Owner must not be the current user
            );
            console.log(`[Market] Filtering for 'player' view: ${playerItems.length} items shown.`);
            return playerItems;
        } else { 
            const systemItems = allItems.filter(item => item.ownerFirebaseUid === null);
            console.log(`[Market] Filtering for 'system' view: ${systemItems.length} items shown.`);
            return systemItems;
        }
    }, [allItems, viewMode, currentUserUid]); 


	const handlePurchaseComplete = (purchasedItemId) => {
        console.log(`[Market] Item ${purchasedItemId} purchased, removing from allItems list.`);
        setAllItems((prevItems) => prevItems.filter((item) => item.id !== purchasedItemId));
	};

	return (
		// Using a Fragment <>...</> as the top-level element (This is to allow the return of multple elements)
		<>
			<View style={styles.bannerContainer}>
				<Text style={styles.bannerText}>Marketplace</Text>
			</View>
            <View style={styles.toggleContainer}>
                <Pressable
                    style={[styles.toggleButton, viewMode === 'player' && styles.toggleButtonActive]}
                    onPress={() => setViewMode('player')}
                >
                    <Text style={[styles.toggleButtonText, viewMode === 'player' && styles.toggleButtonTextActive]}>
                        Player Items (Trade/Buy)
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.toggleButton, viewMode === 'system' && styles.toggleButtonActive]}
                    onPress={() => setViewMode('system')}
                >
                     <Text style={[styles.toggleButtonText, viewMode === 'system' && styles.toggleButtonTextActive]}>
                        System Items (Buy Only)
                    </Text>
                </Pressable>
            </View>


            {loading && !refreshing ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#4CAF50" />
				</View>
			) : (
				<ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={["#4CAF50"]}
                            tintColor={"#4CAF50"} 
                        />
                    }
                >
					{filteredMarketItems.length === 0 && !loading ? (
						<View style={styles.emptyContainer}>
							<Text style={styles.emptyText}>
                                {viewMode === 'player'
                                    ? "No items available from other players right now."
                                    : "No system items available for purchase right now."}
                            </Text>
						</View>
					) : (
						<View style={[styles.itemsContainer, { maxWidth: screenWidth - ITEM_MARGIN * 2 }]}>
							{filteredMarketItems.map((item) => (
								<View key={item.id} style={[styles.marketItem, { width: itemWidth, margin: ITEM_MARGIN / 2 }]}>
									<MarketItem
                                        id={item.id}
                                        imageUrl={item.image_url}
                                        price={item.hidden_value}
                                        title={item.name}
                                        description={item.description}
                                        ownerFirebaseUid={item.ownerFirebaseUid} 
                                        onPurchaseComplete={handlePurchaseComplete} 
                                    />
								</View>
							))}
						</View>
					)}
				</ScrollView>
			)}
		</>
	);
}

const styles = StyleSheet.create({
	bannerContainer: {
		width: "100%",
		backgroundColor: "#4CAF50", 
		paddingVertical: 15,
		alignItems: "center",
	},
	bannerText: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#fff",
	},
    toggleContainer: {
        flexDirection: 'row', 
        justifyContent: 'center', 
        paddingVertical: 10,
        backgroundColor: '#111', 
        width: '100%',
    },
    toggleButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginHorizontal: 5,
        borderRadius: 20, 
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50', 
    },
    toggleButtonText: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    toggleButtonTextActive: {
        color: '#fff', 
    },
	scrollContainer: {
		flexGrow: 1,
		alignItems: "center",
		paddingBottom: 20,
        paddingTop: 20,
        backgroundColor: '#000',
	},
	itemsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		alignItems: "flex-start",
		width: "100%",
        paddingTop: 10,
	},
	marketItem: {
		marginBottom: 10,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
        backgroundColor: '#000',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
        minHeight: 200,
        paddingHorizontal: 20,
	},
	emptyText: {
		fontSize: 18,
		color: "#888",
		textAlign: "center",
	},
});
