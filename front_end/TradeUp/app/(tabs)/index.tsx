import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function LandingScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to TradeUp</Text>
            <Text style={styles.subtitle}>Let's get started</Text>

            <View style={styles.buttonContainer}>
                <Pressable style={styles.loginButton} onPress={() => router.push('/pages/login')}>
                    <Text style={styles.loginText}>Log In</Text>
                </Pressable>

                <Pressable style={styles.signupButton} onPress={() => router.push('/pages/signUp')}>
                    <Text style={styles.signupText}>Sign Up</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',  // Black background
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#4CAF50',  // Green title text
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 40,
        color: '#666',  // Light gray subtitle text
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 400,       // limit width on web
        alignSelf: 'center', // center within parent
    },
    loginButton: {
        backgroundColor: '#4CAF50',  // Green button background
        paddingVertical: 14,
        borderRadius: 8,
        marginBottom: 16,
        alignItems: 'center',
    },
    signupButton: {
        backgroundColor: '#fff',  // White background for sign-up button
        borderColor: '#4CAF50',  // Green border
        borderWidth: 2,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    loginText: {
        color: '#fff',  // White text on the login button
        fontSize: 16,
        fontWeight: 'bold',
    },
    signupText: {
        color: '#4CAF50',  // Green text on the sign-up button
        fontSize: 16,
        fontWeight: 'bold',
    },
});
