// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";

export default function Leaderboard() {
  const [viewMode, setViewMode] = useState("top"); // 'top' or 'recent'
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch the top scores from the backend
  const loadScores = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === "top") {
        // Fetch the leaderboard data from the backend API
        const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/leaderboard`);
        const data = await res.json();

        // Format the data as needed for the UI
        const formatted = data.map((user) => ({
          id: user.user_id,
          username: user.username,
          score: user.total_score, // Backend gives us the sum of items' value and trade credits
        }));

        setScores(formatted);
      } else {
        // Optionally load recent scores from another endpoint if you have one
        setScores([]); // Placeholder for recent scores if needed
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setScores([]); // Clear scores in case of error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewMode]);

  // Load scores when component mounts or viewMode changes
  useEffect(() => {
    loadScores();
  }, [loadScores]);

  // Refresh the leaderboard when user pulls to refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadScores();
  };

  return (
    <>
      <View style={styles.bannerContainer}>
        <Text style={styles.bannerText}>Leaderboard</Text>
      </View>

      <View style={styles.toggleContainer}>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === "top" && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode("top")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === "top" && styles.toggleButtonTextActive,
            ]}
          >
            Top Players
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === "recent" && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode("recent")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === "recent" && styles.toggleButtonTextActive,
            ]}
          >
            Recent Scores
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4CAF50"]}
              tintColor="#4CAF50"
            />
          }
        >
          {scores.map((entry, index) => (
            <View key={entry.id} style={styles.scoreItem}>
              <Text style={styles.rank}>{index + 1}.</Text>
              <Text style={styles.name}>{entry.username}</Text>
              <Text style={styles.points}>{entry.score} pts</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    width: "100%",
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    alignItems: "center",
  },
  bannerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#111",
    width: "100%",
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  toggleButtonActive: {
    backgroundColor: "#4CAF50",
  },
  toggleButtonText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  scrollContainer: {
    paddingVertical: 20,
    backgroundColor: "#000",
    paddingHorizontal: 16,
  },
  scoreItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#222",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  rank: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  name: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
    marginLeft: 10,
  },
  points: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
});
