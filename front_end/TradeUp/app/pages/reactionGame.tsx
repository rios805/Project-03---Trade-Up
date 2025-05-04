// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import axios from 'axios';
import { auth } from '../../utils/firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing, runOnJS, cancelAnimation } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GAME_AREA_PADDING = 40;
const TARGET_SIZE = 70;
const INITIAL_APPEAR_DURATION = 1500;
const MIN_APPEAR_DURATION = 400;
const DURATION_DECREMENT = 75;
const FADE_DURATION = 150;
const SUCCESS_SCALE = 1.1;
const SUCCESS_DURATION = 200;

export default function ReactionGameScreen() {
  const [gameState, setGameState] = useState('checking');
  const [canPlay, setCanPlay] = useState(false);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [reward, setReward] = useState(0);
  const [currentAppearDuration, setCurrentAppearDuration] = useState(INITIAL_APPEAR_DURATION);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [gameAreaLayout, setGameAreaLayout] = useState(null);

  const router = useRouter();
  const targetAppearTimeout = useRef(null);
  const isMounted = useRef(true);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
    console.log("[ReactionGame] gameState updated:", gameState);
  }, [gameState]);

  const targetOpacity = useSharedValue(0);
  const targetScale = useSharedValue(1);
  const targetX = useSharedValue(0);
  const targetY = useSharedValue(0);

  const targetAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: targetOpacity.value,
      transform: [
        { translateX: targetX.value },
        { translateY: targetY.value },
        { scale: targetScale.value },
      ],
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 10,
    };
  });

  const checkGameStatus = useCallback(async () => {
    if (!isMounted.current) return;
    console.log("[ReactionGame] Checking status...");
    setIsCheckingStatus(true);
    setError(null);
    setGameState('checking');
    gameStateRef.current = 'checking';


    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in.");
      const token = await user.getIdToken(true);

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/reaction-game/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!isMounted.current) return;

      console.log("[ReactionGame] Status check response:", response.data);
      if (response.data?.canPlay === false) {
        setGameState('claimed');
        gameStateRef.current = 'claimed';
        setCanPlay(false);
        setFinalScore(response.data?.score || 0);
        setReward(response.data?.reward || 0);
      } else {
        setGameState('ready');
        gameStateRef.current = 'ready';
        setCanPlay(true);
        setScore(0);
        setFinalScore(0);
        setReward(0);
        setCurrentAppearDuration(INITIAL_APPEAR_DURATION);
      }
    } catch (err) {
       if (!isMounted.current) return;
      console.error("[ReactionGame] Error checking status:", err);
      setError(err.response?.data?.error || err.message || "Failed to check game status.");
      setGameState('error');
      gameStateRef.current = 'error';
      if (err.response?.status === 401 || err.response?.status === 403) {
        Alert.alert("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
      }
    } finally {
       if (isMounted.current) setIsCheckingStatus(false);
    }
  }, [router]);

  const saveScoreAndClaimReward = useCallback(async (finalScoreValue) => {
     if (!isMounted.current) return;
    console.log(`[ReactionGame] Saving score and claiming reward for score: ${finalScoreValue}`);
    setIsLoading(true); 

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not logged in to claim.");
        const token = await user.getIdToken(true);

        const response = await axios.post(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/reaction-game/claim`,
            { score: finalScoreValue },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!isMounted.current) return;

        console.log("[ReactionGame] Claim API successful. Response data:", response.data);
        const receivedReward = response.data?.reward || 0;

        runOnJS(setReward)(receivedReward);
        runOnJS(setGameState)('claimed'); 
        runOnJS(Alert.alert)("Game Over!", response.data?.message || `You scored ${finalScoreValue}!`);

    } catch (err) {
         if (!isMounted.current) return;
        console.error("[ReactionGame] Error claiming reward:", err);
        const errorMsg = err.response?.data?.error || err.message || "Failed to save score.";
        runOnJS(setError)(errorMsg);
        runOnJS(setGameState)('gameover');
        runOnJS(Alert.alert)("Save Error", errorMsg);
         if (err.response?.status === 401 || err.response?.status === 403) {
             runOnJS(Alert.alert)("Session Expired", "Please log in again.", [{ text: "OK", onPress: () => router.replace("/pages/login") }]);
         }
    } finally {
        if (isMounted.current) runOnJS(setIsLoading)(false);
    }
  }, [router]);



  const handleMiss = useCallback(() => {
      if (!isMounted.current || gameStateRef.current !== 'playing') {
           console.log(`[ReactionGame] Miss timeout fired but state was not 'playing' (State: ${gameStateRef.current}) or component unmounted.`);
           return;
      }
      console.log("[ReactionGame] Target missed (timeout)!");
      targetOpacity.value = withTiming(0, { duration: FADE_DURATION });
      runOnJS(setGameState)('gameover');
      runOnJS(setFinalScore)(score);
      runOnJS(saveScoreAndClaimReward)(score);
  }, [saveScoreAndClaimReward, targetOpacity, score]);


  const spawnTarget = useCallback(() => {
    if (!gameAreaLayout || !isMounted.current || gameStateRef.current !== 'playing') {
        console.log(`[ReactionGame] spawnTarget called but conditions not met. Mounted: ${isMounted.current}, Layout: ${!!gameAreaLayout}, State: ${gameStateRef.current}`);
        return;
    }

    clearTimeout(targetAppearTimeout.current);
    targetAppearTimeout.current = null;

    const availableWidth = gameAreaLayout.width - TARGET_SIZE;
    const availableHeight = gameAreaLayout.height - TARGET_SIZE;
    const randomX = Math.max(0, Math.random() * availableWidth);
    const randomY = Math.max(0, Math.random() * availableHeight);

    console.log(`[ReactionGame] Spawning target at X:${randomX.toFixed(0)}, Y:${randomY.toFixed(0)} with duration ${currentAppearDuration}ms`);

    targetScale.value = 1;
    targetX.value = randomX;
    targetY.value = randomY;
    targetOpacity.value = withTiming(1, { duration: FADE_DURATION });

    targetAppearTimeout.current = setTimeout(handleMiss, currentAppearDuration);

  }, [gameAreaLayout, currentAppearDuration, handleMiss, targetX, targetY, targetScale, targetOpacity]);


  const handleTargetPress = () => {
    if (gameStateRef.current !== 'playing') {
        console.log("[ReactionGame] Target pressed but not in 'playing' state.");
        return;
    }
    console.log(`[ReactionGame] Target hit! Score: ${score + 1}`);

    clearTimeout(targetAppearTimeout.current);
    targetAppearTimeout.current = null;

    const newScore = score + 1;
    const newDuration = Math.max(MIN_APPEAR_DURATION, currentAppearDuration - DURATION_DECREMENT);
    setScore(newScore);
    setCurrentAppearDuration(newDuration);

    targetScale.value = withSequence(
      withTiming(SUCCESS_SCALE, { duration: SUCCESS_DURATION / 2, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: SUCCESS_DURATION / 2 })
    );
    targetOpacity.value = withTiming(0, { duration: FADE_DURATION }, (finished) => {
         if (!finished) {
              console.log("[ReactionGame] Hit animation cancelled or state changed, not spawning next target from callback.");
         }
    });
  };

  const startGame = () => {
    if (!gameAreaLayout || gameStateRef.current !== 'ready' || isLoading) return;
    console.log("[ReactionGame] Starting game...");
    setScore(0);
    setFinalScore(0);
    setReward(0);
    setCurrentAppearDuration(INITIAL_APPEAR_DURATION);
    setGameState('playing');
  };


  useEffect(() => {
    if (gameState === 'playing' && isMounted.current) {
        console.log(`[ReactionGame] useEffect[gameState, score]: State is 'playing', score is ${score}. Spawning target.`);
        spawnTarget();
    }
    return () => {
        if (gameStateRef.current !== 'playing') {
            console.log(`[ReactionGame] Cleanup effect for gameState: ${gameStateRef.current}. Clearing timer.`);
            clearTimeout(targetAppearTimeout.current);
            targetAppearTimeout.current = null;
        }
    };
  }, [gameState, score, spawnTarget]);

  useEffect(() => {
    isMounted.current = true;
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        if (!isMounted.current) return;
        if (user) {
            console.log("[ReactionGame] Auth state: User logged in. Checking status.");
            checkGameStatus();
        } else {
            console.log("[ReactionGame] Auth state: User logged out.");
            setGameState('error');
            setError('Please log in to play the reaction game.');
            setCanPlay(false);
            setIsLoading(false);
             setIsCheckingStatus(false);
        }
    });

     if (auth.currentUser) {
        checkGameStatus();
     } else {
        setGameState('error');
        setError('Please log in to play the reaction game.');
        setCanPlay(false);
        setIsLoading(false);
        setIsCheckingStatus(false);
     }

    return () => {
      console.log("[ReactionGame] Component unmounting.");
      isMounted.current = false;
      clearTimeout(targetAppearTimeout.current);
      cancelAnimation(targetOpacity);
      cancelAnimation(targetScale);
      cancelAnimation(targetX);
      cancelAnimation(targetY);
      unsubscribeAuth();
    };
  }, [checkGameStatus]);


  const renderGameContent = () => {
    if (isCheckingStatus) {
         return <ActivityIndicator size="large" color="#4CAF50" />;
    }

    switch (gameState) {
      case 'error':
        return (
          <>
            <Ionicons name="alert-circle-outline" size={60} color="#ff6347" style={styles.icon} />
            <Text style={styles.errorText}>{error || 'An error occurred.'}</Text>
            <Pressable style={styles.button} onPress={checkGameStatus} disabled={isLoading || isCheckingStatus}>
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          </>
        );
      case 'ready':
        return (
          <>
            <Ionicons name="game-controller-outline" size={60} color="#4CAF50" style={styles.icon} />
            <Text style={styles.infoText}>Get ready to tap!</Text>
            <Pressable style={[styles.button, styles.startButton, !gameAreaLayout && styles.buttonDisabled]} onPress={startGame} disabled={!gameAreaLayout || isLoading}>
              <Text style={styles.buttonText}>Start Game</Text>
            </Pressable>
             {!gameAreaLayout && <Text style={styles.waitText}>(Waiting for layout...)</Text>}
          </>
        );
      case 'playing':
        return <Text style={styles.scoreDisplay}>Score: {score}</Text>;
      case 'gameover':
         return (
           <>
             <Ionicons name="close-circle-outline" size={60} color="#ff6347" style={styles.icon} />
             <Text style={styles.infoText}>Game Over!</Text>
             <Text style={styles.finalScoreText}>Final Score: {finalScore}</Text>
             {isLoading ? (
                 <ActivityIndicator size="large" color="#4CAF50" style={{marginTop: 20}}/>
             ) : (
                 error ? <Text style={styles.errorText}>{error}</Text>
                 : <Pressable style={styles.button} onPress={() => router.back()}>
                     <Text style={styles.buttonText}>Back to Profile</Text>
                 </Pressable>
             )}
           </>
         );
      case 'claimed':
        return (
            <>
             <Ionicons name="checkmark-circle-outline" size={60} color="#4CAF50" style={styles.icon} />
             <Text style={styles.infoText}>Played today!</Text>
             <Text style={styles.finalScoreText}>Score: {finalScore}</Text>
             <Text style={styles.rewardText}>Reward: {reward} Credits</Text>
              <Pressable style={[styles.button, styles.buttonDisabled]} disabled={true}>
                <Text style={styles.buttonText}>Come Back Tomorrow</Text>
            </Pressable>
            </>
        );
      default:
        return <ActivityIndicator size="large" color="#4CAF50" />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reaction Challenge</Text>
      <View
        style={styles.gameArea}
        onLayout={(event) => {
          if (!gameAreaLayout || gameAreaLayout.width !== event.nativeEvent.layout.width || gameAreaLayout.height !== event.nativeEvent.layout.height ) {
             setGameAreaLayout(event.nativeEvent.layout);
             console.log("[ReactionGame] Game Area Layout Updated:", event.nativeEvent.layout);
          }
        }}
      >
        <AnimatedPressable
            style={[
                styles.target,
                targetAnimatedStyle,
                gameState !== 'playing' && { opacity: 0 }
            ]}
            onPress={handleTargetPress}
            pointerEvents={gameState === 'playing' ? 'auto' : 'none'}
            >
          <Ionicons name="flash-outline" size={TARGET_SIZE * 0.6} color="#fff" />
        </AnimatedPressable>
         <View style={[styles.statusContainer, gameState === 'playing' && styles.statusContainerPlaying]}>
             {renderGameContent()}
         </View>
      </View>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={24} color="#ccc" />
        <Text style={styles.backButtonText}>Back to Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00BCD4',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 188, 212, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  gameArea: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  statusContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
  },
  statusContainerPlaying: {
     backgroundColor: 'transparent', 
     justifyContent: 'flex-start',
     paddingTop: 20,
     alignItems: 'center', 
  },
  target: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    borderRadius: TARGET_SIZE / 2,
    backgroundColor: 'rgba(0, 188, 212, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 12,
    position: 'absolute',
  },
  infoText: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 25,
    textAlign: 'center',
  },
  infoTextFaded: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  scoreDisplay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFC107',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 193, 7, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  finalScoreText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#E0E0E0',
      marginTop: 10,
      marginBottom: 5,
  },
  rewardText: {
      fontSize: 18,
      color: '#4CAF50',
      marginBottom: 20,
  },
  button: {
    backgroundColor: '#00BCD4',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    minWidth: 180,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
   startButton: {
      backgroundColor: '#4CAF50',
   },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#555',
    opacity: 0.7,
  },
  errorText: {
    color: '#ff6347',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  icon: {
    marginBottom: 15,
  },
   waitText: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  backButton: {
     position: 'absolute',
     bottom: 20,
     left: 20,
     flexDirection: 'row',
     alignItems: 'center',
     padding: 10,
  },
   backButtonText: {
      color: '#ccc',
      fontSize: 16,
      marginLeft: 5,
  },
});
