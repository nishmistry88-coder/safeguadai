import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Vibration,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import * as Location from "expo-location";

type Phase = "countdown" | "sending" | "cancelled";

export default function EmergencyScreen({ testMode = false }) {
  const params = useLocalSearchParams();
  const initialTime = params.initialCount ? parseInt(params.initialCount as string) : 5;

  const [countdown, setCountdown] = useState<number | "Cancelled">(initialTime);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [enableHaptics, setEnableHaptics] = useState(false);
  const [enableSound, setEnableSound] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const enableSoundRef = useRef(enableSound);
  const enableHapticsRef = useRef(enableHaptics);

  // 🔄 THE RESET FIX: This clears the screen state when you navigate away
  useEffect(() => {
    return () => {
      setPhase("countdown");
      setCountdown(initialTime);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => { enableSoundRef.current = enableSound; }, [enableSound]);
  useEffect(() => { enableHapticsRef.current = enableHaptics; }, [enableHaptics]);

  useEffect(() => {
    const load = async () => {
      const h = await AsyncStorage.getItem("enableHaptics");
      const s = await AsyncStorage.getItem("enableSound");
      if (h !== null) setEnableHaptics(h === "true");
      if (s !== null) setEnableSound(s === "true");
    };
    load();

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const SLIDE_WIDTH = 260;

  const playBeep = async () => {
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/beep.mp3"),
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
    } catch (e) { console.log("Sound error:", e); }
  };

  const startEmergencyLocationSharing = async () => {
    if (testMode) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const token = await AsyncStorage.getItem("userToken");
      await fetch("https://safeguadai.onrender.com/location/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ latitude: location.coords.latitude, longitude: location.coords.longitude, timestamp: new Date().toISOString() }),
      });
    } catch (err) { console.error("Location Error:", err); }
  };

  useEffect(() => {
    if (phase !== "countdown" || countdown === "Cancelled") return;
    if (countdown === 0) {
      setPhase("sending");
      triggerFlash();
      startEmergencyLocationSharing();
      return;
    }
    const interval = setInterval(() => {
      setCountdown((prev) => (typeof prev === "number" ? prev - 1 : prev));
      if (enableHapticsRef.current) Vibration.vibrate(300);
      if (enableSoundRef.current) playBeep();
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown, phase]);

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.22, duration: 650, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.25, duration: 650, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: 650, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => phase === "countdown" && gesture.dx > 5,
      onPanResponderMove: (_, gesture) => {
        if (phase !== "countdown") return;
        if (gesture.dx >= 0 && gesture.dx <= SLIDE_WIDTH) slideX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (phase !== "countdown") return;
        if (gesture.dx > SLIDE_WIDTH * 0.7) {
          cancelAlert();
        } else {
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const triggerFlash = () => {
    flashOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const cancelAlert = () => {
    setCountdown("Cancelled");
    setPhase("cancelled");
    if (soundRef.current) {
      soundRef.current.stopAsync().then(() => {
        soundRef.current?.unloadAsync();
        soundRef.current = null;
      });
    }
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
    runShake();
  };

  const runShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // 🔥 HANDLES RESET BEFORE LEAVING
  const handleReturnHome = () => {
    setPhase("countdown");
    setCountdown(initialTime);
    router.replace("/(tabs)/home");
  };

  const renderCenter = () => {
    if (phase === "sending") {
      return (
        <View style={styles.sendingWrapper}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.sendingText}>{testMode ? "Simulating alert…" : "Sending alert…"}</Text>
          <View style={styles.contactList}>
             <View style={styles.contactChip}><Text style={styles.chipText}>Location Shared</Text></View>
             <View style={styles.contactChip}><Text style={styles.chipText}>Contacts Notified</Text></View>
          </View>
          <TouchableOpacity style={styles.doneButton} onPress={handleReturnHome}>
            <Text style={styles.doneButtonText}>Return Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (phase === "cancelled") {
      return (
        <View style={styles.sendingWrapper}>
          <Text style={styles.cancelledText}>Alert cancelled</Text>
          <Text style={styles.sendingSub}>No messages were sent.</Text>
          <TouchableOpacity style={styles.doneButton} onPress={handleReturnHome}>
            <Text style={styles.doneButtonText}>Return Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]} />
        <BlurView intensity={40} tint="dark" style={styles.innerCircle}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </BlurView>
      </>
    );
  };

  return (
    <LinearGradient colors={["#030512", "#050814", "#030512"]} style={styles.container}>
      {testMode && <Text style={styles.testBadge}>TEST MODE</Text>}
      <Text style={styles.title}>Emergency Alert</Text>
      <Text style={styles.subtitle}>{phase === "countdown" ? "Sending alert in..." : "Alert Status"}</Text>
      <Animated.View style={[styles.centerWrapper, { transform: [{ translateX: shakeAnim }] }]}>
        {renderCenter()}
      </Animated.View>
      {phase === "countdown" && (
        <View style={styles.sliderContainer}>
          <Text style={styles.slideLabel}>Slide to cancel</Text>
          <View style={styles.sliderTrack}>
            <Animated.View {...panResponder.panHandlers} style={[styles.sliderThumb, { transform: [{ translateX: slideX }] }]}>
              <Text style={styles.sliderThumbText}>❱</Text>
            </Animated.View>
          </View>
        </View>
      )}
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashOpacity }]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 },
  testBadge: { color: "#A855F7", fontSize: 12, textAlign: "center", marginBottom: 10 },
  title: { color: "#F9FAFB", fontSize: 24, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#9CA3AF", textAlign: "center", marginTop: 4, marginBottom: 20 },
  centerWrapper: { flex: 1, alignItems: "center", justifyContent: "center" },
  pulseCircle: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 2, borderColor: "#3b1a6e", backgroundColor: "rgba(59,26,110,0.22)" },
  innerCircle: { width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: "#4c1d95" },
  countdownText: { color: "#F9FAFB", fontSize: 64, fontWeight: "700" },
  sliderContainer: { marginBottom: 40 },
  slideLabel: { color: "#9CA3AF", textAlign: "center", marginBottom: 10 },
  sliderTrack: { width: "100%", height: 50, backgroundColor: "#1f2937", borderRadius: 999, justifyContent: "center" },
  sliderThumb: { width: 50, height: 50, borderRadius: 999, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" },
  sliderThumbText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  sendingWrapper: { alignItems: "center", paddingHorizontal: 16 },
  sendingText: { color: "#F9FAFB", fontSize: 18, fontWeight: "600", marginTop: 16 },
  sendingSub: { color: "#9CA3AF", fontSize: 13, textAlign: "center", marginTop: 6 },
  contactList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 },
  contactChip: { backgroundColor: '#1E1B4B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#7C3AED' },
  chipText: { color: '#F9FAFB', fontSize: 12, fontWeight: '600' },
  cancelledText: { color: "#F97373", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  doneButton: { marginTop: 30, backgroundColor: '#1f2937', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 999 },
  doneButtonText: { color: '#FFF', fontWeight: '700' },
  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFF" },
});