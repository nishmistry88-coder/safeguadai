import React, { useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import GridBackground from "../components/GridBackground";
import GlowRing from "../components/GlowRing";
import PrimaryButton from "../components/PrimaryButton";
import AssistantOrb from "../components/AssistantOrb";
import colors from "../theme/colors";
import gradients from "../theme/gradients";

export default function HomeScreen({ navigation }) {
  const [alertTimer, setAlertTimer] = useState(5);

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      <GridBackground>
        <View style={styles.header}>
          <Image
            source={require("../assets/logo-white.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>SafeGuard AI</Text>
        </View>

        <View style={styles.center}>
          <GlowRing />
          <Text style={styles.status}>System Ready</Text>
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Alert Timer</Text>

          <View style={styles.timerButtons}>
            {[5, 10, 20, 30].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setAlertTimer(t)}
                style={[
                  styles.timerButton,
                  alertTimer === t && styles.timerButtonActive,
                ]}
              >
                <Text style={styles.timerButtonText}>{t}s</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.contactsButton}
          onPress={() => navigation.navigate("EmergencyContacts")}
        >
          <Text style={styles.contactsText}>Emergency Contacts</Text>
        </TouchableOpacity>

        <PrimaryButton
          title="GO TO ALERT"
          onPress={() => navigation.navigate("Alert", { timer: alertTimer })}
        />

        {/* Floating Assistant Orb */}
        <View style={styles.orbWrapper}>
          <AssistantOrb onPress={() => navigation.navigate("Assistant")} />
        </View>
      </GridBackground>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginTop: 100,
    alignItems: "center",
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 12,
    tintColor: colors.white,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  status: {
    color: colors.white,
    marginTop: 20,
    fontSize: 20,
    opacity: 0.8,
  },
  timerContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  timerLabel: {
    color: colors.white,
    fontSize: 18,
    marginBottom: 10,
  },
  timerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  timerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#333",
    borderRadius: 10,
  },
  timerButtonActive: {
    backgroundColor: "#6c47ff",
  },
  timerButtonText: {
    color: colors.white,
    fontSize: 16,
  },
  contactsButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: "center",
  },
  contactsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  // Orb positioning
  orbWrapper: {
    position: "absolute",
    bottom: 40,
    right: 30,
  },
});