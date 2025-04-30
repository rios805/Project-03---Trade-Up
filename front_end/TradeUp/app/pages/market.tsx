import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
import MarketItem from '../../components/MarketItem';
import axios from 'axios';
import { auth } from '../../utils/firebaseConfig';

interface MarketItemType {
    id: number;
    image_url: string;
    hidden_value: number;
    name: string;
    description: string;
}

export default function Profile() {
    const [marketItems, setMarketItems] = useState<MarketItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const { width: screenWidth } = useWindowDimensions();
    const ITEM_MARGIN = 10;

    let columns = 5;
    if (screenWidth < 600) {
        columns = 2;
    } else if (screenWidth < 900) {
        columns = 3;
    }

    const itemWidth = (screenWidth - ITEM_MARGIN * (columns + 1)) / columns;

    const fetchMarketItems = useCallback(async () => {
        console.log("🔄 Starting fetchMarketItems...");

        try {
            const user = auth.currentUser;
            console.log("👤 Current user:", user);

            if (!user) {
                Alert.alert("Not logged in", "Please log in to view market items.");
                return;
            }

            const token = await user.getIdToken().catch(e => {
                console.error("❌ Error getting token:", e);
                throw e;
            });
            console.log("🔐 Got ID token:", token);

            const response = await axios.get<MarketItemType[]>(
                `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/marketplace`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log("✅ Market items response from backend:", response.data);
            setMarketItems(response.data);
        } catch (error) {
            console.error("❌ Failed to fetch market items:", error);
            Alert.alert("Error", "Failed to load market items.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log("📦 useEffect running...");
        fetchMarketItems();
    }, [fetchMarketItems]);

    return (
        <>
            <View style={styles.bannerContainer}>
                <Text style={styles.bannerText}>Market</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={[styles.userItemsContainer, { maxWidth: screenWidth - ITEM_MARGIN * 2 }]}>
                        {marketItems.map((item) => (
                            <View key={item.id} style={[styles.userItem, { width: itemWidth, margin: ITEM_MARGIN / 2 }]}>
                                <MarketItem
                                    imageUrl={item.image_url}
                                    price={item.hidden_value}
                                    title={item.name}
                                    description={item.description}
                                />
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    bannerContainer: {
        width: '100%',
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    bannerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 20,
    },
    userItemsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '100%',
    },
    userItem: {
        marginBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
});
