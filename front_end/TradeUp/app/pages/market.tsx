import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, useWindowDimensions } from 'react-native';
import StarRating from '../../components/StarRating';
import MarketItem from '../../components/MarketItem';

const images = {
    noStar: require('../../assets/images/noStars.png'),
    oneStar: require('../../assets/images/oneStars.png'),
    twoStar: require('../../assets/images/twoStars.png'),
    threeStar: require('../../assets/images/threeStars.png'),
    fourStar: require('../../assets/images/fourStars.png'),
    fiveStar: require('../../assets/images/fiveStars.png'),
}


export default function Profile() {
    const [rating, setRating] = useState(3.5);
    const imageUrl = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
    const accountBalance = 1200.50;
    const { width: screenWidth } = useWindowDimensions();

    const ITEM_MARGIN = 10;

    // Calculate how many items fit per row based on screen width
    let columns = 5;
    if (screenWidth < 600) {
        columns = 2; // For small screens, show 2 items per row
    } else if (screenWidth < 900) {
        columns = 3; // For medium screens, show 3 items per row
    }

    const itemWidth = (screenWidth - ITEM_MARGIN * (columns + 1)) / columns;

    const userItems = [
        { imageUrl: "https://cdn.pixabay.com/photo/2018/03/30/16/58/cactus-3275859_960_720.jpg", value: "99.99", title: "cactus" },
        { imageUrl: "https://example.com/another-image.jpg", value: "49.99", title: "Another Item" },
        { imageUrl: "https://example.com/image.jpg", value: "99.99", title: "Sample Item" },
        { imageUrl: "https://example.com/another-image.jpg", value: "49.99", title: "Another Item" },
        { imageUrl: "https://example.com/image.jpg", value: "99.99", title: "Sample Item" },
        { imageUrl: "https://example.com/another-image.jpg", value: "49.99", title: "Another Item" },
        { imageUrl: "https://example.com/image.jpg", value: "99.99", title: "Sample Item" },
        { imageUrl: "https://example.com/another-image.jpg", value: "49.99", title: "Another Item" },
    ];

    return (
        <>
            {/* Banner */}
            <View style={styles.bannerContainer}>
                <Text style={styles.bannerText}>Market</Text>
            </View>

            {/* Scrollable user items grid */}
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={[styles.userItemsContainer, { maxWidth: screenWidth - ITEM_MARGIN * 2 }]}>
                    {userItems.map((item, index) => (
                        <View key={index} style={[styles.userItem, { width: itemWidth, margin: ITEM_MARGIN / 2 }]}>
                            <MarketItem
                                imageUrl={item.imageUrl}
                                value={item.value}
                                title={item.title}
                            />
                        </View>
                    ))}
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    image: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    text: {
        fontSize: 24,
        color: '#4CAF50',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center', // vertically align text and image
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',

        // limit how wide the row can grow
        width: '100%',
        maxWidth: 600,          // <-- caps the row at 600px
        alignSelf: 'center',    // <-- centers that 600px block in the screen

        // optional padding inside that block
        paddingHorizontal: 5,

        marginBottom: 20,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    profileContainer: {
        alignItems: 'center',   // centers children horizontally
        marginBottom: 20,       // optional spacing
    },
    nameText: {
        marginTop: 8,           // space between image and text
        fontSize: 18,
        color: 'black',
        textAlign: 'center',    // ensures multi-line text would be centered
    },
    balanceBox: {
        // backgroundColor: '#4CAF50',
        padding: 10,
        alignItems: 'center',
        marginHorizontal: 5,
        minWidth: 120,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'black',
    },
    balanceBoxSub: {
        // backgroundColor: 'white',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'black',
        padding: 10,
        width: '100%',
        alignItems: 'center',
        marginHorizontal: 5,
        minWidth: 120,
    },
    balanceText: {
        fontSize: 14,
        color: 'black',
    },
    balanceAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'green',
    },
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
        justifyContent: 'center', // Centers the items horizontally
        alignItems: 'flex-start', // Aligns the items to the top of the container
        width: '100%',
    },
    userItem: {
        marginBottom: 20,
    },
});

