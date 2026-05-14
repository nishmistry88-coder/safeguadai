import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { GOING_OUT_MODES, ModeConfig } from "../../utils/presets";

type Coords = { latitude: number; longitude: number };

export default function JourneysScreen() {
  const router = useRouter();

  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState<Coords | null>(null);
  const [route, setRoute] = useState<Coords[]>([]);
  const [selectedMode, setSelectedMode] = useState<ModeConfig | null>(
  GOING_OUT_MODES[0]
);
  const [journeyMode, setJourneyMode] = useState<"manual" | "auto" | "smart">(
    "manual"
  );

  const accelerometerSub = useRef<any>(null);
  const gpsInterval = useRef<NodeJS.Timer | null>(null);
  const smartInterval = useRef<NodeJS.Timer | null>(null);

  const thresholdsRef = useRef({
    freeFall: 0.5,
    impact: 2.5,
    stillness: 0.2,
    fallWindow: 2000,
  });

  const fallState = useRef({
    freeFall: false,
    impact: false,
    lastEventTime: 0,
  });

  const BACKEND_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    loadMode();
    startSmartWatcher();
  }, []);

  const loadMode = async () => {
    const modeId = await AsyncStorage.getItem("goingOutMode");
    const jm = await AsyncStorage.getItem("journeyMode");

    if (jm) setJourneyMode(jm as any);

    const mode = GOING_OUT_MODES.find((m) => m.id === modeId);
    if (mode) setSelectedMode(mode);
  };

  const startSmartWatcher = () => {
    smartInterval.current = setInterval(async () => {
      if (journeyMode !== "smart" || tracking) return;

      const accel = await Accelerometer.getCurrentAccelerationAsync();
      if (!accel) return;

      const magnitude = Math.sqrt(
        accel.x * accel.x + accel.y * accel.y + accel.z * accel.z
      );

      if (magnitude > 1.2) {
        startJourney();
      }
    }, 1500);
  };

  const applySensitivity = async () => {
    let sensitivity = await AsyncStorage.getItem("emergencySensitivity");

    if (!sensitivity) sensitivity = "medium";

    let freeFall = 0.5;
    let impact = 2.5;
    let stillness = 0.2;

    if (sensitivity === "low") {
      freeFall = 0.4;
      impact = 3.0;
      stillness = 0.15;
    } else if (sensitivity === "high") {
      freeFall = 0.7;
      impact = 2.0;
      stillness = 0.25;
    }

    if (journeyMode === "smart") {
      freeFall = 0.7;
      impact = 2.0;
      stillness = 0.25;
    }

    thresholdsRef.current = {
      freeFall,
      impact,
      stillness,
      fallWindow: 2000,
    };
  };

  const triggerEmergency = async () => {
    const enabled = await AsyncStorage.getItem("emergencyTriggers");
    if (enabled !== "true") return;

    router.push("/(tabs)/test-emergency");
  };

  const sendLocationToBackend = async (coords: Coords) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      await fetch(`${BACKEND_URL}/tracking/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(coords),
      });
    } catch {}
  };

  const startJourney = async () => {
    if (tracking) return;
    setTracking(true);

    await applySensitivity();

    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== "granted") {
      alert("Location permission required.");
      setTracking(false);
      return;
    }

    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== "granted") {
      alert("Background location required.");
      setTracking(false);
      return;
    }

    await Location.startLocationUpdatesAsync("background-location-task", {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 1,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Journey Active",
        notificationBody: "Tracking your location for safety.",
      },
    });

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (loc) => {
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setLocation(coords);
        setRoute((prev) => [...prev, coords]);
      }
    );

    gpsInterval.current = setInterval(() => {
      if (location) sendLocationToBackend(location);
    }, 5000);

    accelerometerSub.current = Accelerometer.addListener((accel) => {
      const magnitude = Math.sqrt(
        accel.x * accel.x + accel.y * accel.y + accel.z * accel.z
      );

      const now = Date.now();
      const { freeFall, impact, stillness, fallWindow } = thresholdsRef.current;

      if (magnitude < freeFall) {
        fallState.current.freeFall = true;
        fallState.current.lastEventTime = now;
      }

      if (magnitude > impact) {
        fallState.current.impact = true;
        fallState.current.lastEventTime = now;
      }

      if (
        fallState.current.freeFall &&
        fallState.current.impact &&
        magnitude < stillness &&
        now - fallState.current.lastEventTime < fallWindow
      ) {
        triggerEmergency();
        fallState.current = {
          freeFall: false,
          impact: false,
          lastEventTime: 0,
        };
      }

      if (now - fallState.current.lastEventTime > fallWindow) {
        fallState.current = {
          freeFall: false,
          impact: false,
          lastEventTime: 0,
        };
      }
    });
  };

  const endJourney = async () => {
    setTracking(false);

    accelerometerSub.current?.remove();
    accelerometerSub.current = null;

    if (gpsInterval.current) clearInterval(gpsInterval.current);
    gpsInterval.current = null;

    try {
      await Location.stopLocationUpdatesAsync("background-location-task");
    } catch {}

    fallState.current = {
      freeFall: false,
      impact: false,
      lastEventTime: 0,
    };
  };

  
  return (
    <LinearGradient
      colors={["#030512", "#050814", "#030512"]}
      style={styles.container}
    >
      {!tracking ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.title}>Journey Dashboard</Text>

          {/* Mode Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{selectedMode.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{selectedMode.label}</Text>
                <Text style={styles.cardDescription}>
                  {selectedMode.description}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Sensitivity: {selectedMode.sensitivity.toUpperCase()}
              </Text>
              <Text style={styles.metaText}>
                {selectedMode.backgroundTracking
                  ? "BG Tracking: ON"
                  : "BG Tracking: OFF"}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Emergency Triggers:{" "}
                {selectedMode.emergencyTriggers ? "ON" : "OFF"}
              </Text>
              <Text style={styles.metaText}>
                Live Sharing: {selectedMode.liveSharing ? "ON" : "OFF"}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={startJourney}>
            <Text style={styles.startText}>Start Journey</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            showsUserLocation={true}
            region={
              location
                ? {
                    ...location,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }
                : undefined
            }
          >
            {route.length > 1 && (
              <Polyline
                coordinates={route}
                strokeColor="#00E5FF"
                strokeWidth={4}
              />
            )}

            {location && <Marker coordinate={location} />}
          </MapView>

          <TouchableOpacity style={styles.endBtn} onPress={endJourney}>
            <Text style={styles.endText}>End Journey</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#050814",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#9CA3AF", fontSize: 16 },
  title: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 20,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    marginHorizontal: 20,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  cardIcon: { fontSize: 28, marginRight: 12 },
  cardTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "600" },
  cardDescription: { color: "#9CA3AF", fontSize: 13, marginTop: 4 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  metaText: { color: "#E5E7EB", fontSize: 12 },
  startBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 10,
  },
  startText: { color: "white", fontSize: 16, fontWeight: "600" },
  endBtn: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  endText: { color: "white", fontSize: 16, fontWeight: "600" },
});
