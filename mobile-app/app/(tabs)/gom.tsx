import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { GOING_OUT_MODES, ModeConfig } from "../../utils/presets";

export default function GoingOutModeScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("walking_alone");

  useEffect(() => {
    (async () => {
      const current = await AsyncStorage.getItem("goingOutMode");
      if (current) setSelectedId(current);
    })();
  }, []);

  const selectMode = async (mode: ModeConfig) => {
    // 1. Check if we are clicking the mode that is ALREADY active
    const isCurrentlyActive = mode.id === selectedId;

    if (isCurrentlyActive) {
      // --- DEACTIVATE MODE ---
      setSelectedId(""); // Clear the UI selection
      
      await AsyncStorage.multiSet([
        ["goingOutMode", ""],
        ["emergencySensitivity", "medium"], // Reset to default
        ["backgroundTracking", "false"],    // Stop the background pings
        ["emergencyTriggers", "false"],     // Turn off auto-alerts
        ["liveSharing", "false"],
      ]);
      
      // Optional: You can stay on the screen or go back
      // router.back(); 
    } else {
      // --- ACTIVATE NEW MODE ---
      setSelectedId(mode.id);

      await AsyncStorage.multiSet([
        ["goingOutMode", mode.id],
        ["emergencySensitivity", mode.sensitivity],
        ["backgroundTracking", String(mode.backgroundTracking)],
        ["emergencyTriggers", String(mode.emergencyTriggers)],
        ["liveSharing", String(mode.liveSharing)],
      ]);

      router.back(); // Go back only when a new mode is selected
    }
  };

  return (
    <LinearGradient
      colors={["#030512", "#050814", "#030512"]}
      style={styles.container}
    >
      <Text style={styles.title}>Going Out Modes</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {GOING_OUT_MODES.map((mode) => {
          const active = mode.id === selectedId;
          return (
            <TouchableOpacity
              key={mode.id}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => selectMode(mode)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{mode.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{mode.label}</Text>
                  <Text style={styles.cardDescription}>
                    {mode.description}
                  </Text>
                </View>
                {active && <Text style={styles.activeBadge}>Active</Text>}
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  Sensitivity: {mode.sensitivity.toUpperCase()}
                </Text>
                <Text style={styles.metaText}>
                  {mode.backgroundTracking ? "BG Tracking" : "Foreground Only"}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {mode.emergencyTriggers ? "Triggers On" : "Triggers Off"}
                </Text>
                <Text style={styles.metaText}>
                  {mode.liveSharing ? "Live Sharing On" : "Live Sharing Off"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  cardActive: {
    borderColor: "#7C3AED",
    backgroundColor: "rgba(76,29,149,0.35)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "600",
  },
  cardDescription: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
  },
  activeBadge: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  metaText: {
    color: "#E5E7EB",
    fontSize: 12,
  },
});
