import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function AddItemScreen() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    hidden_value: '',
    item_type: '',
    owner_id: ''
  });

  const { width } = useWindowDimensions();
  const isWeb = width >= 768;
  const router = useRouter();

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('https://your-api.com/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to add item');
      alert('Item added successfully!');
      router.push('/pages/profile');
    } catch (err) {
      console.error(err);
      alert('Error adding item');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={[styles.formContainer, isWeb && styles.webForm]}>
          <Text style={styles.title}>Add New Item</Text>

          {Object.keys(formData).map((field) => (
            <TextInput
              key={field}
              style={[styles.input, isWeb && styles.inputWeb]}
              placeholder={field.replace('_', ' ')}
              placeholderTextColor="#ccc"
              value={formData[field as keyof typeof formData]}
              onChangeText={(value) => handleChange(field as keyof typeof formData, value)}
            />
          ))}

          <Pressable
            style={[styles.submitButton, isWeb && styles.buttonWeb]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
  },
  webForm: {
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4CAF50',
    marginBottom: 36,
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
  inputWeb: {
    alignSelf: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonWeb: {
    alignSelf: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
