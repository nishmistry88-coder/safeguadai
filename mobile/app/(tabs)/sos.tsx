import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Vibration,
  Linking,
  Alert,
  Image,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { locationService } from "@/services/locationService";
import { notificationService } from "@/services/notificationService";
import { getEmergencyNumber, EmergencyInfo } from "@/constants/emergencyNumbers";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f5939225-27b2-488c-ba98-856ce900c22c/artifacts/u4rcyto1_real%20logo.png";
const CITY_BG = "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80";

export default function SOSScreen() {
  const { user } = useAuth();
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo>(getEmergencyNumber("US"));
  
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    loadLocation();
    loadUserSettings();
    startPulseAnimation();
    startGlowAnimation();
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
          toValue: 1.03,
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

  const startGlowAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.7,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
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
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
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
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

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
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Vibration.vibrate([200, 100, 200, 100, 200]);

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
      <View className="flex-1 bg-zinc-950">
        <LinearGradient
          colors={['rgba(220, 38, 38, 0.3)', 'rgba(9, 9, 11, 0.98)']}
          className="flex-1"
        >
          <SafeAreaView className="flex-1" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6" data-testid="sos-active-screen">
              <Animated.View
                style={{ transform: [{ scale: pulseAnim }] }}
                className="w-36 h-36 rounded-full items-center justify-center mb-8"
                data-testid="sos-active-indicator"
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  className="w-full h-full rounded-full items-center justify-center"
                >
                  <Ionicons name="warning" size={64} color="#fff" />
                </LinearGradient>
              </Animated.View>

              <Text 
                className="text-4xl mb-4"
                style={{ color: '#f43f5e', fontWeight: '900', fontStyle: 'italic' }}
              >
                SOS ACTIVE
              </Text>
              <Text className="text-zinc-400 text-center mb-10 text-lg max-w-xs">
                Emergency contacts have been notified with your location
              </Text>

              <Pressable
                onPress={callEmergency}
                className="flex-row items-center gap-4 px-6 py-5 bg-zinc-900/80 border border-zinc-700/50 rounded-2xl mb-4 w-full"
                data-testid="call-emergency-btn"
              >
                <View className="w-12 h-12 rounded-xl bg-red-500/20 items-center justify-center">
                  <Ionicons name="call" size={24} color="#f43f5e" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg">Call Emergency</Text>
                  <Text className="text-zinc-500">{emergencyInfo.name} - {emergencyInfo.universal}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#71717a" />
              </Pressable>

              <Pressable
                onPress={cancelAlert}
                className="flex-row items-center justify-center gap-2 px-6 py-5 border border-zinc-700/50 rounded-2xl w-full"
                data-testid="cancel-sos-btn"
              >
                <Ionicons name="close-circle" size={22} color="#a1a1aa" />
                <Text className="text-zinc-400 font-medium text-lg">Cancel Alert (I'm Safe)</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  // Main SOS Screen
  return (
    <View className="flex-1 bg-zinc-950">
      <ImageBackground
        source={{ uri: CITY_BG }}
        className="flex-1"
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(88, 28, 135, 0.6)', 'rgba(15, 23, 42, 0.85)', 'rgba(9, 9, 11, 0.98)']}
          locations={[0, 0.3, 0.6]}
          className="flex-1"
        >
          <SafeAreaView className="flex-1" edges={['top']}>
            <View className="flex-1 items-center justify-center px-6" data-testid="sos-page">
              {/* Logo */}
              <View className="absolute top-4 left-6 flex-row items-center gap-3">
                <Image
                  source={{ uri: LOGO_URL }}
                  className="w-10 h-10"
                  resizeMode="contain"
                />
                <Text className="text-violet-400 font-bold text-lg">SOS</Text>
              </View>

              {/* Instructions */}
              <Text className="text-violet-300/70 text-sm uppercase tracking-widest mb-10">
                Hold button for 3 seconds to activate
              </Text>

              {/* SOS Button */}
              <View className="relative mb-10">
                {/* Glow Effect */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: -20,
                    left: -20,
                    right: -20,
                    bottom: -20,
                    borderRadius: 160,
                    backgroundColor: '#f43f5e',
                    opacity: isHolding ? 0.6 : glowAnim,
                  }}
                />

                {/* Progress Ring */}
                <View 
                  className="absolute -inset-4 rounded-full border-4"
                  style={{
                    borderColor: isHolding ? '#f43f5e' : 'rgba(244, 63, 94, 0.3)',
                  }}
                />

                {/* Main Button */}
                <Animated.View style={{ transform: [{ scale: isHolding ? 0.95 : pulseAnim }] }}>
                  <Pressable
                    onPressIn={handleHoldStart}
                    onPressOut={handleHoldEnd}
                    className="w-56 h-56 rounded-full items-center justify-center"
                    style={{
                      shadowColor: '#f43f5e',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 40,
                      elevation: 20,
                    }}
                    data-testid="sos-button"
                  >
                    <LinearGradient
                      colors={isHolding ? ['#dc2626', '#b91c1c'] : ['#f43f5e', '#e11d48']}
                      className="w-full h-full rounded-full items-center justify-center"
                    >
                      <Ionicons name="shield" size={56} color="#fff" />
                      <Text 
                        className="text-white mt-2"
                        style={{ fontSize: 36, fontWeight: '900', letterSpacing: 4 }}
                      >
                        SOS
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>

              {/* Status Text */}
              <Text className="text-zinc-400 text-base">
                {isHolding ? (
                  <Text style={{ color: '#f43f5e', fontWeight: '700' }}>
                    {Math.ceil((100 - holdProgress) / 33.3)}s - Keep holding...
                  </Text>
                ) : (
                  "Press and hold to send emergency alert"
                )}
              </Text>

              {/* Location Badge */}
              {location && (
                <View className="absolute bottom-36 flex-row items-center gap-2 px-5 py-3 bg-zinc-900/80 border border-zinc-700/50 rounded-2xl">
                  <Ionicons name="location" size={18} color="#a78bfa" />
                  <Text className="text-zinc-400 text-sm">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Text>
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                </View>
              )}

              {/* Bottom Info Cards */}
              <View className="absolute bottom-6 left-6 right-6 flex-row gap-4">
                <View className="flex-1 p-4 bg-zinc-900/80 border border-zinc-700/50 rounded-2xl">
                  <Text className="text-xs text-zinc-500 mb-1">Emergency ({emergencyInfo.flag})</Text>
                  <Text className="text-xl text-white" style={{ fontWeight: '900' }}>
                    {emergencyInfo.universal}
                  </Text>
                </View>
                <View className="flex-1 p-4 bg-zinc-900/80 border border-emerald-500/30 rounded-2xl">
                  <Text className="text-xs text-zinc-500 mb-1">Status</Text>
                  <Text className="text-xl text-emerald-500" style={{ fontWeight: '900' }}>Ready</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
