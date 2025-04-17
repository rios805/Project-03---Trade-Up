import { Image, StyleSheet, Platform, View, Text, Button, Pressable } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <>
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Home Page</Text>
        <br></br>
        <br></br>
        <br></br>
        <br></br>
        <View style={styles.buttonRow}>
          <Pressable style={styles.buttonSignIn} onPress={() => console.log('Sign in pressed')}>
            <Text style={styles.buttonTextSignIn}>Sign in</Text>
          </Pressable>
          <Pressable style={styles.buttonSignUp} onPress={() => console.log('Sign up pressed')}>
            <Text style={styles.buttonTextSignUp}>Sign up</Text>
          </Pressable>
        </View>
        <br></br>
        <br></br>
        <Text style={styles.rulesText}>How to Play</Text>

        <View>
          <View style={styles.listItem}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.itemText}>... 1</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.itemText}>... 2</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.itemText}>... 3</Text>
          </View>
        </View>

      </View>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: 'center', // center horizontally
    paddingTop: 40, // or use marginTop
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  rulesText: {
    fontSize: 24,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 2, // Only works on newer React Native versions; see below for fallback
  },
  buttonSignIn: {
    backgroundColor: 'green',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'black'
  },
  buttonSignUp: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'black'
  },
  buttonTextSignIn: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextSignUp: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
  container: {
    padding: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    fontSize: 24,
    color: 'black',
    marginRight: 8,
  },
  itemText: {
    fontSize: 16,
    color: 'black',
  },
});
