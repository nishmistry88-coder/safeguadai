import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Share,
  Modal,
  Image,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Battery from "expo-battery";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { locationService } from "@/services/locationService";
import { shakeService } from "@/services/shakeService";
import { notificationService } from "@/services/notificationService";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f5939225-27b2-488c-ba98-856ce900c22c/artifacts/u4rcyto1_real%20logo.png";
const CITY_BG = "https://images.unsplash.com/photo-1655340401877-121a5a2784b4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxMb25kb24lMjBza3lsaW5lJTIwbmlnaHQlMjBjaXR5c2NhcGUlMjByaXZlciUyMFRoYW1lcyUyMGFlcmlhbCUyMHZpZXclMjBwdXJwbGUlMjBibHVlfGVufDB8fHx8MTc3MTU0NDQwN3ww&ixlib=rb-4.1.0&q=85";

const presets = [
  { id: "club", name: "Club", icon: "musical-notes", color: "#ec4899" },
  { id: "festival", name: "Festival", icon: "megaphone", color: "#f97316" },
  { id: "date", name: "Date", icon: "heart", color: "#ef4444" },
  { id: "walking", name: "Walking", icon: "moon", color: "#8b5cf6" },
  { id: "travel", name: "Travel", icon: "airplane", color: "#06b6d4" },
];

const checkinIntervals = [
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
];

export default function GoingOutScreen() {
  const { token } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState("club");
  const [settings, setSettings] = useState({
    voiceActivation: false,
    shakeDetection: false,
    autoRecord: false,
    checkinEnabled: true,
    checkinInterval: 30,
  });
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [journeyShare, setJourneyShare] = useState<any>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [checkinCountdown, setCheckinCountdown] = useState(60);
  const [shareDuration, setShareDuration] = useState(4);
  const [loading, setLoading] = useState(false);

  const checkinTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (activeSession?.checkin_enabled) {
      startCheckinTimer();
    }
    if (activeSession?.shake_detection_enabled) {
      shakeService.start(handleShakeDetected);
    }
    return () => {
      if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
      shakeService.stop();
    };
  }, [activeSession]);

  const loadData = async () => {
    try {
      const [session, journey, loc, battery] = await Promise.all([
        api.getActiveGoingOut().catch(() => null),
        api.getActiveJourney().catch(() => null),
        locationService.getCurrentLocation(),
        Battery.getBatteryLevelAsync(),
      ]);
      setActiveSession(session);
      setJourneyShare(journey);
      setBatteryLevel(Math.round(battery * 100));
      if (loc) {
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const cleanup = () => {
    if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    shakeService.stop();
  };

  const handleShakeDetected = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Shake Detected!", "Do you want to trigger SOS?", [
      { text: "No", style: "cancel" },
      { text: "Yes, SOS!", style: "destructive", onPress: () => router.push("/(tabs)/sos") },
    ]);
  };

  const startCheckinTimer = () => {
    if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    const intervalMs = (activeSession?.checkin_interval || 30) * 60 * 1000;
    checkinTimerRef.current = setInterval(() => triggerCheckinPrompt(), intervalMs);
  };

  const triggerCheckinPrompt = async () => {
    setShowCheckinModal(true);
    setCheckinCountdown(60);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await notificationService.showLocalNotification("Safety Check-in", "Are you safe? Please respond.");
    countdownRef.current = setInterval(() => {
      setCheckinCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          handleMissedCheckin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCheckinResponse = async (isSafe: boolean) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowCheckinModal(false);
    try {
      await api.checkin(isSafe, location?.latitude, location?.longitude);
      if (isSafe) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Check-in recorded", "Stay safe!");
      } else {
        router.push("/(tabs)/sos");
      }
    } catch (error) {
      Alert.alert("Error", "Check-in failed");
    }
  };

  const handleMissedCheckin = async () => {
    setShowCheckinModal(false);
    Alert.alert("Missed Check-in", "Triggering SOS alert...");
    try {
      await api.missedCheckin();
      router.push("/(tabs)/sos");
    } catch (error) {
      console.error("Failed to handle missed checkin:", error);
    }
  };

  const startGoingOutMode = async () => {
    setLoading(true);
    try {
      const response = await api.startGoingOutMode({
        preset: selectedPreset,
        voice_activation_enabled: settings.voiceActivation,
        shake_detection_enabled: settings.shakeDetection,
        auto_record_enabled: settings.autoRecord,
        checkin_enabled: settings.checkinEnabled,
        checkin_interval: settings.checkinInterval,
      });
      setActiveSession(response);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await locationService.startBackgroundTracking();
      Alert.alert("Going Out Mode Active", `${presets.find((p) => p.id === selectedPreset)?.name} preset enabled.`);
    } catch (error) {
      Alert.alert("Error", "Failed to start Going Out Mode");
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    setLoading(true);
    try {
      await api.endGoingOut();
      await locationService.stopBackgroundTracking();
      shakeService.stop();
      setActiveSession(null);
      setShowEndModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Session Ended", "Going Out Mode has been disabled.");
    } catch (error) {
      Alert.alert("Error", "Failed to end session");
    } finally {
      setLoading(false);
    }
  };

  const startJourneyShare = async () => {
    setLoading(true);
    try {
      const response = await api.startJourney(activeSession?.preset || selectedPreset, shareDuration, location?.latitude, location?.longitude);
      setJourneyShare(response);
      setShowShareModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Journey Sharing Started", "Your contacts can now track you.");
    } catch (error) {
      Alert.alert("Error", "Failed to start journey sharing");
    } finally {
      setLoading(false);
    }
  };

  const stopJourneyShare = async () => {
    try {
      await api.endJourney();
      setJourneyShare(null);
      Alert.alert("Sharing Stopped", "Journey sharing has been disabled.");
    } catch (error) {
      Alert.alert("Error", "Failed to stop sharing");
    }
  };

  const getShareLink = () => {
    if (!journeyShare) return "";
    return `https://sos-mobile-1.preview.emergentagent.com/track/${journeyShare.share_token}`;
  };

  const shareLink = async () => {
    const link = getShareLink();
    try {
      await Share.share({ message: `Track my journey for safety: ${link}`, title: "SafeGuard AI - Track My Journey" });
    } catch (error) {
      await Clipboard.setStringAsync(link);
      Alert.alert("Copied!", "Link copied to clipboard");
    }
  };

  // Active Session View
  if (activeSession) {
    const preset = presets.find((p) => p.id === activeSession.preset);
    return (
      <View className="flex-1 bg-zinc-950">
        <ImageBackground source={{ uri: CITY_BG }} className="flex-1" resizeMode="cover">
          <LinearGradient colors={['rgba(88, 28, 135, 0.7)', 'rgba(15, 23, 42, 0.92)', 'rgba(9, 9, 11, 0.98)']} locations={[0, 0.25, 0.5]} className="flex-1">
            <SafeAreaView className="flex-1" edges={["top"]}>
              <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Header */}
                <View className="items-center py-8" data-testid="going-out-active">
                  <View className="w-24 h-24 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: `${preset?.color}30` }}>
                    <Ionicons name={preset?.icon as any} size={48} color={preset?.color} />
                  </View>
                  <Text className="text-3xl text-white" style={{ fontWeight: '900', fontStyle: 'italic' }}>Going Out Active</Text>
                  <Text className="text-zinc-400 capitalize mt-1">{preset?.name} Mode</Text>
                </View>

                {/* Status Cards */}
                <View className="flex-row gap-4 mb-6">
                  <View className="flex-1 p-5 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl items-center">
                    <Ionicons name="shield-checkmark" size={28} color="#10b981" />
                    <Text className="text-emerald-500 font-bold mt-2 text-lg">Protected</Text>
                  </View>
                  <View className="flex-1 p-5 bg-zinc-900/70 border border-zinc-700/50 rounded-2xl items-center">
                    <Ionicons name="battery-half" size={28} color={batteryLevel < 20 ? "#ef4444" : batteryLevel < 50 ? "#f59e0b" : "#10b981"} />
                    <Text className="text-white font-bold mt-2 text-lg">{batteryLevel}%</Text>
                  </View>
                </View>

                {/* Features Status */}
                <View className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-5 mb-6">
                  <Text className="text-white font-bold text-lg mb-4">Active Features</Text>
                  <FeatureRow label="Voice Activation" enabled={activeSession.voice_activation_enabled} />
                  <FeatureRow label="Shake Detection" enabled={activeSession.shake_detection_enabled} />
                  <FeatureRow label="Auto-Record" enabled={activeSession.auto_record_enabled} />
                  <FeatureRow label="Check-ins" enabled={activeSession.checkin_enabled} detail={activeSession.checkin_enabled ? `Every ${activeSession.checkin_interval}min` : undefined} />
                </View>

                {/* Journey Sharing */}
                <View className={`border rounded-2xl p-5 mb-6 ${journeyShare?.is_active ? "bg-cyan-500/15 border-cyan-500/40" : "bg-zinc-900/70 border-zinc-700/50"}`}>
                  {journeyShare?.is_active ? (
                    <View>
                      <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-3">
                          <View className="w-12 h-12 rounded-xl bg-cyan-500/25 items-center justify-center">
                            <Ionicons name="share-social" size={24} color="#06b6d4" />
                          </View>
                          <View>
                            <Text className="text-cyan-400 font-bold text-lg">Sharing Location</Text>
                            <Text className="text-zinc-500 text-sm">Contacts can track you</Text>
                          </View>
                        </View>
                        <View className="w-3 h-3 rounded-full bg-cyan-500" />
                      </View>
                      <View className="flex-row gap-3">
                        <Pressable onPress={shareLink} className="flex-1 flex-row items-center justify-center gap-2 py-4 bg-cyan-500/20 rounded-xl" data-testid="share-btn">
                          <Ionicons name="share-outline" size={20} color="#06b6d4" />
                          <Text className="text-cyan-400 font-bold">Share Link</Text>
                        </Pressable>
                        <Pressable onPress={stopJourneyShare} className="px-5 py-4 border border-zinc-700/50 rounded-xl" data-testid="stop-share-btn">
                          <Text className="text-zinc-400 font-medium">Stop</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <View className="w-12 h-12 rounded-xl bg-zinc-800 items-center justify-center">
                          <Ionicons name="link" size={24} color="#71717a" />
                        </View>
                        <View>
                          <Text className="text-white font-bold">Journey Sharing</Text>
                          <Text className="text-zinc-500 text-sm">Share live location</Text>
                        </View>
                      </View>
                      <Pressable onPress={() => setShowShareModal(true)} className="px-5 py-3 bg-cyan-500 rounded-xl" data-testid="start-share-btn">
                        <Text className="text-white font-bold">Share</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <Pressable onPress={() => setShowEndModal(true)} className="flex-row items-center justify-center gap-2 py-5 border border-red-500/40 rounded-2xl mb-4" data-testid="end-session-btn">
                  <Ionicons name="stop" size={22} color="#f87171" />
                  <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 16 }}>End Going Out Mode</Text>
                </Pressable>

                <Pressable onPress={() => router.push("/(tabs)/sos")} className="flex-row items-center justify-center gap-2 py-5 rounded-2xl" style={{ backgroundColor: '#f43f5e' }} data-testid="quick-sos-btn">
                  <Ionicons name="warning" size={22} color="#fff" />
                  <Text className="text-white font-bold text-lg">SOS Emergency</Text>
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </LinearGradient>
        </ImageBackground>

        {/* Check-in Modal */}
        <Modal visible={showCheckinModal} transparent animationType="fade">
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="bg-zinc-900 border border-zinc-700/50 rounded-3xl p-8 w-full max-w-sm">
              <View className="items-center mb-6">
                <View className="w-24 h-24 rounded-3xl bg-amber-500/20 items-center justify-center mb-4">
                  <Ionicons name="time" size={48} color="#f59e0b" />
                </View>
                <Text className="text-2xl text-white" style={{ fontWeight: '900' }}>Are You Safe?</Text>
                <Text className="text-zinc-400 mt-2">Please confirm you're okay</Text>
                <View className="w-full h-3 bg-zinc-800 rounded-full mt-5">
                  <View className="h-3 bg-amber-500 rounded-full" style={{ width: `${(checkinCountdown / 60) * 100}%` }} />
                </View>
                <Text className="text-zinc-500 mt-2">{checkinCountdown}s remaining</Text>
              </View>
              <View className="flex-row gap-4">
                <Pressable onPress={() => handleCheckinResponse(true)} className="flex-1 flex-row items-center justify-center gap-2 py-5 bg-emerald-500 rounded-2xl" data-testid="im-safe-btn">
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text className="text-white font-bold">I'm Safe</Text>
                </Pressable>
                <Pressable onPress={() => handleCheckinResponse(false)} className="flex-1 flex-row items-center justify-center gap-2 py-5 rounded-2xl" style={{ backgroundColor: '#f43f5e' }} data-testid="not-safe-btn">
                  <Ionicons name="warning" size={22} color="#fff" />
                  <Text className="text-white font-bold">Not Safe</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* End Session Modal */}
        <Modal visible={showEndModal} transparent animationType="fade">
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="bg-zinc-900 border border-zinc-700/50 rounded-3xl p-8 w-full max-w-sm">
              <Text className="text-2xl text-white mb-2" style={{ fontWeight: '900' }}>End Session</Text>
              <Text className="text-zinc-400 mb-6">Are you sure you want to end Going Out Mode?</Text>
              <Pressable onPress={endSession} disabled={loading} className="py-5 rounded-2xl items-center mb-3" style={{ backgroundColor: '#f43f5e', opacity: loading ? 0.7 : 1 }} data-testid="confirm-end-btn">
                <Text className="text-white font-bold text-lg">{loading ? "Ending..." : "End Session"}</Text>
              </Pressable>
              <Pressable onPress={() => setShowEndModal(false)} className="py-5 border border-zinc-700/50 rounded-2xl items-center">
                <Text className="text-zinc-400 font-medium">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Share Journey Modal */}
        <Modal visible={showShareModal} transparent animationType="fade">
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="bg-zinc-900 border border-zinc-700/50 rounded-3xl p-8 w-full max-w-sm">
              <Text className="text-2xl text-white mb-2" style={{ fontWeight: '900' }}>Share Journey</Text>
              <Text className="text-zinc-400 mb-6">Share a tracking link with trusted contacts.</Text>
              <Text className="text-zinc-300 mb-3 font-medium">Link expires in</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {[1, 2, 4, 8, 12, 24].map((hours) => (
                  <Pressable key={hours} onPress={() => setShareDuration(hours)} className={`px-5 py-3 rounded-xl ${shareDuration === hours ? "bg-cyan-500" : "bg-zinc-800 border border-zinc-700/50"}`}>
                    <Text className={shareDuration === hours ? "text-white font-bold" : "text-zinc-400"}>{hours}h</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={startJourneyShare} disabled={loading} className="py-5 bg-cyan-500 rounded-2xl items-center mb-3" style={{ opacity: loading ? 0.7 : 1 }} data-testid="confirm-share-btn">
                <Text className="text-white font-bold text-lg">{loading ? "Starting..." : "Start Sharing"}</Text>
              </Pressable>
              <Pressable onPress={() => setShowShareModal(false)} className="py-5 border border-zinc-700/50 rounded-2xl items-center">
                <Text className="text-zinc-400 font-medium">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Setup View
  return (
    <View className="flex-1 bg-zinc-950">
      <ImageBackground source={{ uri: CITY_BG }} className="flex-1" resizeMode="cover">
        <LinearGradient colors={['rgba(88, 28, 135, 0.7)', 'rgba(15, 23, 42, 0.92)', 'rgba(9, 9, 11, 0.98)']} locations={[0, 0.25, 0.5]} className="flex-1">
          <SafeAreaView className="flex-1" edges={["top"]}>
            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 120 }}>
              {/* Header */}
              <View className="flex-row items-center gap-3 py-4" data-testid="going-out-setup">
                <Image source={{ uri: LOGO_URL }} className="w-10 h-10" resizeMode="contain" />
                <View>
                  <Text className="text-2xl text-white" style={{ fontWeight: '900' }}>Going Out Mode</Text>
                  <Text className="text-violet-300/70 text-sm">Extra protection for your night out</Text>
                </View>
              </View>

              {/* Battery Warning */}
              {batteryLevel < 20 && (
                <View className="flex-row items-center gap-3 p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl mb-6">
                  <Ionicons name="battery-dead" size={22} color="#f59e0b" />
                  <Text className="text-amber-400 text-sm flex-1">Low battery ({batteryLevel}%). Consider charging before going out.</Text>
                </View>
              )}

              {/* Preset Selection */}
              <View className="mb-6">
                <Text className="text-zinc-300 mb-4 font-bold">Select Preset</Text>
                <View className="flex-row flex-wrap gap-3">
                  {presets.map((preset) => (
                    <Pressable
                      key={preset.id}
                      onPress={() => { setSelectedPreset(preset.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className="w-[31%] p-4 rounded-2xl border items-center"
                      style={selectedPreset === preset.id ? { backgroundColor: `${preset.color}20`, borderColor: preset.color } : { backgroundColor: 'rgba(24, 24, 27, 0.7)', borderColor: 'rgba(63, 63, 70, 0.5)' }}
                      data-testid={`preset-${preset.id}`}
                    >
                      <Ionicons name={preset.icon as any} size={28} color={selectedPreset === preset.id ? preset.color : "#71717a"} />
                      <Text className="mt-2 font-medium text-sm" style={{ color: selectedPreset === preset.id ? preset.color : "#a1a1aa" }}>{preset.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Safety Options */}
              <View className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-5 mb-6">
                <Text className="text-white font-bold text-lg mb-4">Safety Options</Text>
                <SettingToggle icon="mic" iconColor="#8b5cf6" title="Voice Activation" description="Trigger SOS with voice" value={settings.voiceActivation} onValueChange={(val) => setSettings((s) => ({ ...s, voiceActivation: val }))} testId="voice-toggle" />
                <SettingToggle icon="phone-portrait" iconColor="#8b5cf6" title="Shake Detection" description="Shake phone to trigger SOS" value={settings.shakeDetection} onValueChange={(val) => setSettings((s) => ({ ...s, shakeDetection: val }))} testId="shake-toggle" />
                <SettingToggle icon="mic" iconColor="#f43f5e" title="Auto-Record on Trigger" description="Record audio when SOS triggers" value={settings.autoRecord} onValueChange={(val) => setSettings((s) => ({ ...s, autoRecord: val }))} testId="autorecord-toggle" />
              </View>

              {/* Check-in Settings */}
              <View className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-5 mb-6">
                <SettingToggle icon="time" iconColor="#f59e0b" title="Check-in Timer" description="Get reminded to confirm you're safe" value={settings.checkinEnabled} onValueChange={(val) => setSettings((s) => ({ ...s, checkinEnabled: val }))} testId="checkin-toggle" />
                {settings.checkinEnabled && (
                  <View className="mt-4">
                    <Text className="text-zinc-400 text-sm mb-3">Check-in Interval</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {checkinIntervals.map((interval) => (
                        <Pressable key={interval.value} onPress={() => setSettings((s) => ({ ...s, checkinInterval: interval.value }))} className={`px-4 py-3 rounded-xl ${settings.checkinInterval === interval.value ? "bg-amber-500" : "bg-zinc-800 border border-zinc-700/50"}`}>
                          <Text className={settings.checkinInterval === interval.value ? "text-white font-bold" : "text-zinc-400"}>{interval.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Start Button */}
              <Pressable onPress={startGoingOutMode} disabled={loading} className="flex-row items-center justify-center gap-2 py-5 rounded-2xl" style={{ backgroundColor: '#8b5cf6', opacity: loading ? 0.7 : 1, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 }} data-testid="start-going-out-btn">
                <Ionicons name="play" size={22} color="#fff" />
                <Text className="text-white font-bold text-lg">{loading ? "Starting..." : "Start Going Out Mode"}</Text>
              </Pressable>
              <Text className="text-center text-zinc-500 text-xs mt-4">No audio will be recorded until a trigger occurs</Text>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

function FeatureRow({ label, enabled, detail }: { label: string; enabled: boolean; detail?: string }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-zinc-800/50">
      <Text className="text-zinc-400">{label}</Text>
      <Text className={enabled ? "text-emerald-500 font-medium" : "text-zinc-600"}>{enabled ? detail || "ON" : "OFF"}</Text>
    </View>
  );
}

function SettingToggle({ icon, iconColor, title, description, value, onValueChange, testId }: { icon: string; iconColor: string; title: string; description: string; value: boolean; onValueChange: (val: boolean) => void; testId: string }) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-zinc-800/50">
      <View className="flex-row items-center gap-4 flex-1">
        <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: `${iconColor}20` }}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-medium">{title}</Text>
          <Text className="text-zinc-500 text-xs">{description}</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#3f3f46", true: "#8b5cf6" }} thumbColor="#fff" testID={testId} />
    </View>
  );
}
