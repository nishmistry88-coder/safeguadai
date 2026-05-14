import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView, // Added for scrolling
  SafeAreaView, // Added for notch spacing
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const MODE_LABELS: Record<string, string> = {
  walking_alone: "Walking Alone",
  night_out: "Night Out",
  running: "Running / Jogging",
  gym: "Gym / Workout",
  public_transport: "Public Transport",
  driving: "Driving",
  cycling: "Cycling",
  hiking: "Hiking",
  travel_abroad: "Travel Abroad",
  custom: "Custom Mode",
  date: "Date",
};

export default function SettingsScreen() {
  const router = useRouter();

  const [haptics, setHaptics] = useState(false);
  const [sound, setSound] = useState(false);
  const [journeyMode, setJourneyMode] = useState<"manual" | "auto" | "smart">("manual");
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [emergencyTriggers, setEmergencyTriggers] = useState(false);
  const [liveSharing, setLiveSharing] = useState(false);
  const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");
  const [defaultMode, setDefaultMode] = useState<string>("walking_alone");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const h = await AsyncStorage.getItem("enableHaptics");
      const s = await AsyncStorage.getItem("enableSound");
      const jm = await AsyncStorage.getItem("journeyMode");
      const bg = await AsyncStorage.getItem("backgroundTracking");
      const et = await AsyncStorage.getItem("emergencyTriggers");
      const ls = await AsyncStorage.getItem("liveSharing");
      const sen = await AsyncStorage.getItem("emergencySensitivity");
      const dm = await AsyncStorage.getItem("goingOutMode");

      if (h !== null) setHaptics(h === "true");
      if (s !== null) setSound(s === "true");
      if (jm !== null) setJourneyMode(jm as any);
      if (bg !== null) setBackgroundTracking(bg === "true");
      if (et !== null) setEmergencyTriggers(et === "true");
      if (ls !== null) setLiveSharing(ls === "true");
      if (sen === "low" || sen === "medium" || sen === "high") setSensitivity(sen);
      if (dm) setDefaultMode(dm);
    } catch {}
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch {}
  };

  const selectJourneyMode = async (mode: "manual" | "auto" | "smart") => {
    setJourneyMode(mode);
    await AsyncStorage.setItem("journeyMode", mode);
  };

  const selectSensitivity = async (level: "low" | "medium" | "high") => {
    setSensitivity(level);
    await AsyncStorage.setItem("emergencySensitivity", level);
  };

  return (
    <LinearGradient colors={["#030512", "#050814", "#030512"]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* 🔥 FIXED: Everything wrapped in ScrollView */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Settings</Text>

          {/* Haptics */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>⚡</Text>
              <Text style={styles.panelTitle}>Haptics</Text>
            </View>
            <Text style={styles.panelDescription}>Vibrate during countdown ticks and alerts.</Text>
            <Switch
              value={haptics}
              onValueChange={(v) => { setHaptics(v); saveSetting("enableHaptics", v); }}
              thumbColor={haptics ? "#A855F7" : "#6B7280"}
              trackColor={{ false: "#1F2937", true: "#4C1D95" }}
            />
          </View>

          {/* Sound */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>🔊</Text>
              <Text style={styles.panelTitle}>Alert Sound</Text>
            </View>
            <Text style={styles.panelDescription}>Play a short beep during countdown ticks.</Text>
            <Switch
              value={sound}
              onValueChange={(v) => { setSound(v); saveSetting("enableSound", v); }}
              thumbColor={sound ? "#A855F7" : "#6B7280"}
              trackColor={{ false: "#1F2937", true: "#4C1D95" }}
            />
          </View>

          {/* Journey Mode */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>🧭</Text>
              <Text style={styles.panelTitle}>Journey Mode</Text>
            </View>
            <Text style={styles.panelDescription}>Choose how SafeGuard AI tracks your journeys.</Text>
            <View style={styles.modeButtons}>
              {["manual", "auto", "smart"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeButton, journeyMode === m && styles.modeButtonActive]}
                  onPress={() => selectJourneyMode(m as any)}
                >
                  <Text style={[styles.modeButtonText, journeyMode === m && styles.modeButtonTextActive]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sensitivity */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>🎚️</Text>
              <Text style={styles.panelTitle}>Emergency Sensitivity</Text>
            </View>
            <Text style={styles.panelDescription}>How easily falls and danger triggers are detected.</Text>
            <View style={styles.modeButtons}>
              {(["low", "medium", "high"] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.modeButton, sensitivity === l && styles.modeButtonActive]}
                  onPress={() => selectSensitivity(l)}
                >
                  <Text style={[styles.modeButtonText, sensitivity === l && styles.modeButtonTextActive]}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Default Going Out Mode */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>🛡️</Text>
              <Text style={styles.panelTitle}>Default Going Out Mode</Text>
            </View>
            <Text style={styles.panelDescription}>Preset used when you start a journey.</Text>
            <View style={styles.defaultRow}>
              <Text style={styles.defaultText}>{MODE_LABELS[defaultMode] ?? "Walking Alone"}</Text>
              <TouchableOpacity style={styles.testButton} onPress={() => router.push("/(tabs)/going-out-mode")}>
                <Text style={styles.testButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Background Tracking */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>📡</Text>
              <Text style={styles.panelTitle}>Background Tracking</Text>
            </View>
            <Text style={styles.panelDescription}>Track location even when the app is closed.</Text>
            <Switch
              value={backgroundTracking}
              onValueChange={(v) => { setBackgroundTracking(v); saveSetting("backgroundTracking", v); }}
              thumbColor={backgroundTracking ? "#A855F7" : "#6B7280"}
              trackColor={{ false: "#1F2937", true: "#4C1D95" }}
            />
          </View>

          {/* Emergency Triggers */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>🚨</Text>
              <Text style={styles.panelTitle}>Emergency Triggers</Text>
            </View>
            <Text style={styles.panelDescription}>Enable automatic alerts for falls or danger signals.</Text>
            <Switch
              value={emergencyTriggers}
              onValueChange={(v) => { setEmergencyTriggers(v); saveSetting("emergencyTriggers", v); }}
              thumbColor={emergencyTriggers ? "#A855F7" : "#6B7280"}
              trackColor={{ false: "#1F2937", true: "#4C1D95" }}
            />
          </View>

          {/* Test Alert */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>🧪</Text>
              <Text style={styles.panelTitle}>Test Alert</Text>
            </View>
            <Text style={styles.panelDescription}>Simulate the countdown without sending anything.</Text>
            <TouchableOpacity style={styles.testButton} onPress={() => router.push("/(tabs)/test-emergency")}>
              <Text style={styles.testButtonText}>Start Test</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120, // Space so it doesn't hide behind tabs
  },
  title: { color: "#F9FAFB", fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 30 },
  panel: { backgroundColor: "rgba(76,29,149,0.12)", borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: "rgba(124,58,237,0.3)" },
  panelHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  panelIcon: { fontSize: 20, marginRight: 8, color: "#A855F7" },
  panelTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "600" },
  panelDescription: { color: "#9CA3AF", fontSize: 13, marginBottom: 12 },
  modeButtons: { flexDirection: "row", justifyContent: "space-between" },
  modeButton: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 10, backgroundColor: "rgba(124,58,237,0.15)", alignItems: "center" },
  modeButtonActive: { backgroundColor: "#7C3AED" },
  modeButtonText: { color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
  modeButtonTextActive: { color: "#F9FAFB" },
  defaultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  defaultText: { color: "#E5E7EB", fontSize: 14, fontWeight: "500" },
  testButton: { marginTop: 4, backgroundColor: "#7C3AED", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  testButtonText: { color: "#F9FAFB", fontSize: 14, fontWeight: "600" },
});