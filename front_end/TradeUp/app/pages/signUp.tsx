// works but doenst store user in database just authenticates them
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';  // Import Firebase function
import { auth } from '../../utils/firebaseConfig';  // Your Firebase config
import { useNavigation } from '@react-navigation/native';  // For navigation
import { useRouter } from 'expo-router';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(false);  // State to show success message and login button
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const router = useRouter();

  // Handle sign up logic
  // just verifies the firebase token

  const handleSignUp = async () => {
    console.log('Signing up with:', name, email, password);

    try {
      // Create a new user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Account created successfully:', user);

      // Update state to show success message
      setSignUpSuccess(true);
    } catch (error: any) {
      // Handle errors (e.g., weak password, existing account)
      console.error('Error creating account:', error.message);
      alert('Error creating account: ' + error.message);
    }
  };



  // verifies firebase token and tries to add user to the database

  // const handleSignUp = async () => {
  //   console.log('🔐 Signing up with:', { name, email });

  //   try {
  //     // 1. Sign up with Firebase Authentication
  //     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  //     const user = userCredential.user;
  //     console.log('✅ Firebase user created:', user.email);

  //     // 2. Get Firebase ID token
  //     const token = await user.getIdToken();
  //     console.log('🔐 Got Firebase ID token:', token);

  //     // 3. Send POST request to backend to create user in DB
  //     const backendUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`;
  //     console.log('Backend URL:', backendUrl);

  //     const response = await axios.post(
  //       backendUrl,
  //       { username: name },  // Include the username in the request body
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           'Content-Type': 'application/json',  // Make sure to specify JSON content type
  //         },
  //       }
  //     );

  //     console.log('✅ User saved to DB:', response.data);
  //     setSignUpSuccess(true);

  //   } catch (error: unknown) {
  //     // Type assertion to 'Error' so that we can access 'message'
  //     if (error instanceof Error) {
  //       console.error('❌ Error during sign-up:', error.message);

  //       // If Firebase user was created, delete them
  //       const user = auth.currentUser;
  //       if (user) {
  //         try {
  //           await deleteUser(user);
  //           console.log('🗑️ Rolled back Firebase user creation');
  //         } catch (deleteError) {
  //           console.error('⚠️ Failed to delete Firebase user after DB error:', deleteError);
  //         }
  //       }

  //       Alert.alert('Error', 'Failed to sign up: ' + error.message);
  //     } else {
  //       console.error('❌ Unexpected error during sign-up:', error);
  //       Alert.alert('Error', 'An unexpected error occurred');
  //     }
  //   }
  // };



  const handleLoginNav = async () => {
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

          <Pressable style={styles.signUpButton} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Sign Up</Text>
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