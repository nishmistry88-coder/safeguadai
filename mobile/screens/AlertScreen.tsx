import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../theme/colors";
import gradients from "../theme/gradients";
import * as Haptics from "expo-haptics";

export default function AlertScreen({ navigation, route }) {
  const { timer = 5 } = route.params || {};
  const [countdown, setCountdown] = useState(timer);
  const [isSending, setIsSending] = useState(false);

  const pulse = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;
  const sendingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleEmergencyTrigger = () => {
    Animated.timing(countdownOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsSending(true);

      Animated.timing(sendingOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    });
  };

  useEffect(() => {
    if (countdown === 0) {
      handleEmergencyTrigger();
      return;
    }

    const t = setTimeout(() => {
      if (countdown <= 2) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [countdown]);

  const slideX = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dx > 10,

      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0) {
          if (slideX._value === 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            Animated.timing(glowOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }

          slideX.setValue(gesture.dx);
        }
      },

      onPanResponderRelease: (_, gesture) => {
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();

        if (gesture.dx > 150) {
          Animated.timing(countdownOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            navigation.goBack();
          });
        } else {
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      {!isSending && (
        <Animated.View style={{ opacity: countdownOpacity, width: "100%", alignItems: "center" }}>
          <Text style={styles.title}>Emergency Alert</Text>
          <Text style={styles.subtitle}>
            Alert will send in {timer} seconds unless cancelled
          </Text>

          <Animated.View
            style={[
              styles.countdownCircle,
              { transform: [{ scale: pulse }] },
            ]}
          >
            <Text style={styles.countdownText}>{countdown}</Text>
          </Animated.View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Contact:</Text>
            <Text style={styles.infoValue}>Mum</Text>

            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>+44 7123 456789</Text>

            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>Enabled</Text>
          </View>

          <View style={styles.slideTrack}>
            <Animated.View
              style={[
                styles.glow,
                { opacity: glowOpacity }
              ]}
            />

            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.slideHandle,
                {
                  transform: [
                    {
                      translateX: slideX.interpolate({
                        inputRange: [0, 150],
                        outputRange: [0, 150],
                        easing: Easing.out(Easing.ease),
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.cancelText}>SLIDE TO CANCEL</Text>
            </Animated.View>
          </View>
        </Animated.View>
      )}

      {isSending && (
        <Animated.View style={{ opacity: sendingOpacity, marginTop: 120 }}>
          <Text style={styles.sendingText}>Sending alert...</Text>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.white,
    opacity: 0.8,
    marginTop: 6,
    marginBottom: 40,
  },
  countdownCircle: {
    width: 180,
    height: 180,
    borderRadius: 180,
    borderWidth: 4,
    borderColor: colors.violet,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  countdownText: {
    color: colors.white,
    fontSize: 64,
    fontWeight: "700",
  },
  infoBox: {
    alignItems: "center",
    marginBottom: 60,
  },
  infoLabel: {
    color: colors.white,
    opacity: 0.6,
    fontSize: 14,
  },
  infoValue: {
    color: colors.white,
    fontSize: 18,
    marginBottom: 10,
  },
  slideTrack: {
    width: "80%",
    height: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    justifyContent: "center",
    overflow: "hidden",
    alignSelf: "center",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
  },
  slideHandle: {
    backgroundColor: "#ff3b30",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    position: "absolute",
    left: 0,
  },
  cancelText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  sendingText: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "600",
  },
});
