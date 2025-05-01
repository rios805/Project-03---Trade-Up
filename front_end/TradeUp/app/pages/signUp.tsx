import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import { createUserWithEmailAndPassword, getIdToken } from 'firebase/auth';
import { auth } from '../../utils/firebaseConfig';
import { useRouter } from 'expo-router';
import axios from 'axios';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const router = useRouter();

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    console.log('🔐 Signing up with:', { name, email });

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Firebase user created:', user.email);

      const token = await user.getIdToken();
      console.log('🔐 Got Firebase ID token');

      const backendUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`;
      console.log('Sending user data to:', backendUrl);

      const response = await axios.post(
        backendUrl,
        { username: name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ User saved to DB:', response.data);
      setSignUpSuccess(true);
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Error during sign-up:', error.message);
        Alert.alert('Error', 'Failed to sign up: ' + error.message);


        if (auth.currentUser) {
          try {
            await auth.currentUser.delete();
            console.log('🗑️ Rolled back Firebase user creation due to backend error');
          } catch (deleteError) {
            console.error('⚠️ Failed to delete Firebase user after backend error');
          }
        }
      } else {
        console.error('❌ Unexpected error during sign-up:', error);
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginNav = () => {
    router.push('/pages/login');
  };

  return (
    <View style={styles.container}>
      {signUpSuccess ? (
        <View style={[styles.formContainer, isWeb && styles.webForm]}>
          <Text style={styles.title}>Account Created Successfully!</Text>
          <Text style={styles.confirmationText}>Your account has been created. You can now log in.</Text>

          <Pressable style={styles.loginButton} onPress={handleLoginNav}>
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.formContainer, isWeb && styles.webForm]}>
          <Text style={styles.title}>Create Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#ccc"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#ccc"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#ccc"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable 
            style={[styles.signUpButton, isLoading && styles.buttonDisabled]} 
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  formContainer: {
    width: '100%',
  },
  webForm: {
    maxWidth: 400,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4CAF50',
    marginBottom: 36,
  },
  confirmationText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderColor: '#4CAF50',
    borderWidth: 1,
    marginBottom: 20,
    fontSize: 16,
    color: '#fff',
    width: '100%',
  },
  signUpButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#2E7D32', // Darker green when disabled
    opacity: 0.7,
  },
  loginButton: {
    backgroundColor: '#FF6347',  // Login button in a different color
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});