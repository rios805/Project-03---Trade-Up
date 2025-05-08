// front_end/TradeUp/app/pages/addItem.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { auth } from '../../utils/firebaseConfig';
import { useRouter } from 'expo-router';
import axios from 'axios';

export default function AddItemPage() {
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [itemType, setItemType] = useState('');
  const [hiddenValue, setHiddenValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { width } = useWindowDimensions();
  const isWeb = width >= 768;
  const router = useRouter();

  const handleSubmit = async () => {
    if (!itemName || !description || !itemType || !hiddenValue) {
      Alert.alert('Missing fields', 'Please fill out all fields.');
      return;
    }

    try {
      setIsLoading(true);
      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const token = await user.getIdToken();
      const backendUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/items/create`;

      const itemData = {
        name: itemName,
        description,
        image_url: imageUrl || null,
        item_type: itemType,
        hidden_value: hiddenValue,
      };

      const response = await axios.post(backendUrl, itemData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Item added:', response.data);
      Alert.alert('Success', 'Item added successfully!');
      router.push('/pages/profile');
    } catch (error: any) {
      console.error('❌ Error adding item:', error.message);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.formContainer, isWeb && styles.webForm]}>
        <Text style={styles.title}>Add New Item</Text>

        <TextInput
          style={styles.input}
          placeholder="Item Name"
          placeholderTextColor="#ccc"
          value={itemName}
          onChangeText={setItemName}
        />

        <TextInput
          style={styles.input}
          placeholder="Description"
          placeholderTextColor="#ccc"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TextInput
          style={styles.input}
          placeholder="Image URL (optional)"
          placeholderTextColor="#ccc"
          value={imageUrl}
          onChangeText={setImageUrl}
        />

        <TextInput
          style={styles.input}
          placeholder="Item Type"
          placeholderTextColor="#ccc"
          value={itemType}
          onChangeText={setItemType}
        />

        <TextInput
          style={styles.input}
          placeholder="Hidden Value"
          placeholderTextColor="#ccc"
          value={hiddenValue}
          onChangeText={setHiddenValue}
        />

        <Pressable
          style={[styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Submitting...' : 'Add Item'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#2E7D32',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
