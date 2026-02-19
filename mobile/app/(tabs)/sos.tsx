import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Vibration,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { locationService } from "@/services/locationService";
import { notificationService } from "@/services/notificationService";
import { getEmergencyNumber, EmergencyInfo } from "@/constants/emergencyNumbers";

export default function SOSScreen() {
  const { user } = useAuth();
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo>(getEmergencyNumber("US"));
  
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLocation();
    loadUserSettings();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    if (isAlertActive) {
      startAlertPulse();
    }
  }, [isAlertActive]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startAlertPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadLocation = async () => {
    const loc = await locationService.getCurrentLocation();
    if (loc) {
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    }
  };

  const loadUserSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (settings?.country_code) {
        setEmergencyInfo(getEmergencyNumber(settings.country_code));
      }
    } catch (error) {
      console.log("Using default emergency number");
    }
  };

  const handleHoldStart = () => {
    setIsHolding(true);
    setHoldProgress(0);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    progressIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          return 100;
        }
        return prev + 3.33;
      });
    }, 100);

    holdTimerRef.current = setTimeout(() => {
      triggerSOS();
    }, 3000);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    setHoldProgress(0);
    
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  const triggerSOS = async () => {
    setIsAlertActive(true);
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Vibration.vibrate([200, 100, 200, 100, 200]);

    // Show notification
    await notificationService.showSOSNotification();

    try {
      await api.triggerSOS(
        location?.latitude || 0,
        location?.longitude || 0,
        "Emergency SOS triggered from mobile app",
        "manual"
      );
      
      Alert.alert(
        "SOS ALERT SENT",
        "Your emergency contacts have been notified with your location.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert(
        "Alert Error",
        "Could not send SOS. Try calling emergency services directly.",
        [{ text: "OK" }]
      );
    }
  };

  const cancelAlert = () => {
    setIsAlertActive(false);
    handleHoldEnd();
    Vibration.cancel();
    Alert.alert("Alert Cancelled", "SOS alert has been cancelled.");
  };

  const callEmergency = () => {
    Linking.openURL(`tel:${emergencyInfo.universal}`);
  };

  // Active Alert Screen
  if (isAlertActive) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6" data-testid="sos-active-screen">
          {/* Pulsing Alert Icon */}
          <Animated.View
            style={{ transform: [{ scale: pulseAnim }] }}
            className="w-32 h-32 rounded-full bg-red-500 items-center justify-center mb-8"
          >
            <Ionicons name="warning" size={64} color="#fff" />
          </Animated.View>

          <Text className="text-3xl font-black text-red-500 mb-4">
            SOS ACTIVE
          </Text>
          <Text className="text-zinc-400 text-center mb-8 max-w-xs">
            Emergency contacts have been notified with your location
          </Text>

          {/* Emergency Call Button */}
          <Pressable
            onPress={callEmergency}
            className="flex-row items-center gap-3 px-6 py-4 bg-zinc-900 border border-zinc-700 rounded-xl mb-4 w-full"
            data-testid="call-emergency-btn"
          >
            <Ionicons name="call" size={24} color="#ef4444" />
            <Text className="text-white text-lg flex-1">
              Call Emergency ({emergencyInfo.universal})
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#71717a" />
          </Pressable>

          {/* Cancel Button */}
          <Pressable
            onPress={cancelAlert}
            className="flex-row items-center justify-center gap-2 px-6 py-4 border border-zinc-700 rounded-xl w-full"
            data-testid="cancel-sos-btn"
          >
            <Ionicons name="close" size={20} color="#a1a1aa" />
            <Text className="text-zinc-400">Cancel Alert (I'm Safe)</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Main SOS Screen
  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
      <View className="flex-1 items-center justify-center px-6" data-testid="sos-page">
        {/* Instructions */}
        <Text className="text-zinc-500 text-sm uppercase tracking-wider mb-8">
          Hold button for 3 seconds to activate
        </Text>

        {/* SOS Button with Progress Ring */}
        <View className="relative mb-8">
          {/* Progress Ring */}
          <View className="absolute inset-0 items-center justify-center">
            <View
              className="w-64 h-64 rounded-full border-2"
              style={{
                borderColor: isHolding ? '#ef4444' : 'rgba(239, 68, 68, 0.2)',
              }}
            />
            {isHolding && (
              <View
                className="absolute w-64 h-64 rounded-full border-4 border-red-500"
                style={{
                  transform: [{ rotate: '-90deg' }],
                  borderRightColor: 'transparent',
                  borderBottomColor: holdProgress > 50 ? '#ef4444' : 'transparent',
                  borderLeftColor: holdProgress > 75 ? '#ef4444' : 'transparent',
                }}
              />
            )}
          </View>

          {/* Main Button */}
          <Animated.View style={{ transform: [{ scale: isHolding ? 0.95 : pulseAnim }] }}>
            <Pressable
              onPressIn={handleHoldStart}
              onPressOut={handleHoldEnd}
              className="w-64 h-64 rounded-full items-center justify-center"
              style={{
                backgroundColor: isHolding ? '#dc2626' : '#ef4444',
                shadowColor: '#ef4444',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 30,
                elevation: 10,
              }}
              data-testid="sos-button"
            >
              <Ionicons name="shield" size={64} color="#fff" />
              <Text className="text-white text-4xl font-black mt-2">SOS</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Status Text */}
        <Text className="text-zinc-400 text-sm">
          {isHolding ? (
            <Text className="text-red-400 font-medium">
              {Math.ceil((100 - holdProgress) / 33.3)}s - Keep holding...
            </Text>
          ) : (
            "Press and hold to send emergency alert"
          )}
        </Text>

        {/* Location Badge */}
        {location && (
          <View className="absolute bottom-32 flex-row items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full">
            <Ionicons name="location" size={16} color="#8b5cf6" />
            <Text className="text-zinc-400 text-sm">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
          </View>
        )}

        {/* Bottom Info Cards */}
        <View className="absolute bottom-6 left-6 right-6 flex-row gap-3">
          <View className="flex-1 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <Text className="text-xs text-zinc-500 mb-1">Emergency ({emergencyInfo.flag})</Text>
            <Text className="text-lg font-bold text-white">
              {emergencyInfo.universal}
            </Text>
          </View>
          <View className="flex-1 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <Text className="text-xs text-zinc-500 mb-1">Status</Text>
            <Text className="text-lg font-bold text-emerald-500">Ready</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
