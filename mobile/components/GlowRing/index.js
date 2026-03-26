import React, { useRef, useEffect } from "react";
import { Animated, StyleSheet, View } from "react-native";
import colors from "../../theme/colors";

export default function GlowRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 220,
    height: 220,
    borderRadius: 220,
    borderWidth: 3,
    borderColor: colors.violet,
    backgroundColor: "transparent",
  },
});