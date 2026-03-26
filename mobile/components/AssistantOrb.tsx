import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const ORB_SIZE = 56;

export default function AssistantOrb({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.06,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable onPress={onPress} style={styles.pressable}>
        <LinearGradient
          colors={["#C7BFFF", "#AFA2FF", "#6C63FF"]}
          start={{ x: 0.3, y: 0.2 }}
          end={{ x: 0.8, y: 0.9 }}
          style={styles.gradient}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80, // thumb‑reach sweet spot
    right: 20,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",

    // subtle halo glow
    shadowColor: "#AFA2FF",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },

    elevation: 8, // Android glow
  },

  pressable: {
    width: "100%",
    height: "100%",
    borderRadius: ORB_SIZE / 2,
    overflow: "hidden",
  },

  gradient: {
    flex: 1,
    borderRadius: ORB_SIZE / 2,
  },
});