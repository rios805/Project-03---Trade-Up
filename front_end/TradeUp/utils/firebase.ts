import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Authentication functions
export const registerUser = async (email: string, password: string, username: string) => {
  try {
    // First, register with Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Then, send the user data to your backend
    const response = await fetch(`${BACKEND_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        username,
        firebase_uid: firebaseUser.uid
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to register user in backend');
    }
    
    return firebaseUser;
  } catch (error: any) {
    console.error("Registration error:", error.message);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error("Login error:", error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (error: any) {
    console.error("Logout error:", error.message);
    throw error;
  }
};

export const getUserInfo = async (firebaseUid: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/user-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebase_uid: firebaseUid
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    const data = await response.json();
    return data.user;
  } catch (error: any) {
    console.error("Get user info error:", error.message);
    throw error;
  }
};

export { auth, database };