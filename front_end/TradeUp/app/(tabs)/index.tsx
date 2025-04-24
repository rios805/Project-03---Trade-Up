import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../utils/firebase';

export default function LandingScreen() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    
    return unsubscribe;
  }, []);

  if (isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to TradeUp</Text>
        <Text style={styles.subtitle}>You are logged in!</Text>
        
        <View style={styles.buttonContainer}>
          <Pressable style={styles.actionButton} onPress={() => {}}>
            <Text style={styles.actionText}>Start Trading</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4CAF50',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  signupButton: {
    backgroundColor: '#fff',
    borderColor: '#4CAF50',
    borderWidth: 2,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});