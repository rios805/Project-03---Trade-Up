import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface UserItemProps {
    imageUrl: string;
    value: string;
    title: string;
}

const UserItem = ({ imageUrl, value, title }: UserItemProps) => {
    return (
        <View style={styles.card}>
            {/* Image at the top */}
            <Image source={{ uri: imageUrl }} style={styles.image} />

            {/* Title and Value */}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.value}>${value}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
        marginBottom: 20,
        width: 200, // You can adjust the width of the card as per your needs
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50', // Green for the value
    },
});

export default UserItem;
