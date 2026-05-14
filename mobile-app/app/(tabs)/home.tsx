import { useEffect, useRef, useState } from "react"; // Added useState
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function HomeScreen() {
  const [selectedTime, setSelectedTime] = useState(5); // Default to 5
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <LinearGradient colors={["#020617", "#050814", "#020617"]} style={styles.container}>
      <Text style={styles.appTitle}>SafeGuard AI</Text>
      <Text style={styles.statusText}>System Ready</Text>

      <View style={styles.centerWrapper}>
        <Animated.View
          style={[
            styles.pulseCircle,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        />
      </View>

      <View style={styles.timerRow}>
        {[5, 10, 20, 30].map((t) => (
          <TouchableOpacity 
            key={t} 
            style={[styles.timerChip, selectedTime === t && styles.activeTimerChip]} 
            onPress={() => setSelectedTime(t)} // Updates the selected time
          >
            <Text style={styles.timerChipText}>{t}s</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/(tabs)/contacts")}
      >
        <Text style={styles.secondaryButtonText}>Emergency Contacts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push({
            pathname: "/(tabs)/emergency",
            params: { initialCount: selectedTime } // Sends the time to the alert screen
        })}
      >
        <Text style={styles.primaryButtonText}>GO TO ALERT ({selectedTime}s)</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  appTitle: { fontSize: 22, fontWeight: "700", color: "#F9FAFB", textAlign: "center" },
  statusText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 4 },
  centerWrapper: { flex: 1, alignItems: "center", justifyContent: "center" },
  pulseCircle: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 2, borderColor: "#4C1D95", backgroundColor: "rgba(76,29,149,0.15)" },
  timerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  timerChip: { flex: 1, marginHorizontal: 4, paddingVertical: 8, borderRadius: 999, backgroundColor: "#0B1020", borderWidth: 1, borderColor: "#4C1D95", alignItems: "center" },
  activeTimerChip: { backgroundColor: "#7C3AED", borderColor: "#A78BFA" }, // Highlight selected
  timerChipText: { color: "#E5E7EB", fontSize: 13, fontWeight: "600" },
  secondaryButton: { marginTop: 4, paddingVertical: 10, borderRadius: 999, backgroundColor: "#020617", borderWidth: 1, borderColor: "#374151", alignItems: "center" },
  secondaryButtonText: { color: "#E5E7EB", fontSize: 13 },
  primaryButton: { backgroundColor: "#7C3AED", borderRadius: 999, paddingVertical: 14, alignItems: "center", shadowColor: "#7C3AED", shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, marginTop: 12 },
  primaryButtonText: { color: "#F9FAFB", fontWeight: "700", fontSize: 16, letterSpacing: 1 },
});