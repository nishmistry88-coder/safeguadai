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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Battery from "expo-battery";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { locationService } from "@/services/locationService";
import { shakeService } from "@/services/shakeService";
import { notificationService } from "@/services/notificationService";

const presets = [
  { id: "club", name: "Club", icon: "musical-notes", color: "#ec4899" },
  { id: "festival", name: "Festival", icon: "megaphone", color: "#f97316" },
  { id: "date", name: "Date", icon: "heart", color: "#ef4444" },
  { id: "walking", name: "Walking Home", icon: "moon", color: "#8b5cf6" },
  { id: "travel", name: "Travel", icon: "airplane", color: "#06b6d4" },
];

const checkinIntervals = [
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
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
    return () => {
      cleanup();
    };
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
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
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
    Alert.alert(
      "Shake Detected!",
      "Do you want to trigger SOS?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, SOS!", style: "destructive", onPress: () => router.push("/(tabs)/sos") },
      ]
    );
  };

  const startCheckinTimer = () => {
    if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    
    const intervalMs = (activeSession?.checkin_interval || 30) * 60 * 1000;
    
    checkinTimerRef.current = setInterval(() => {
      triggerCheckinPrompt();
    }, intervalMs);
  };

  const triggerCheckinPrompt = async () => {
    setShowCheckinModal(true);
    setCheckinCountdown(60);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await notificationService.showLocalNotification(
      "Safety Check-in",
      "Are you safe? Please respond."
    );

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
      
      // Start background location tracking
      await locationService.startBackgroundTracking();
      
      Alert.alert("Going Out Mode Active", `${presets.find(p => p.id === selectedPreset)?.name} preset enabled.`);
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
      const response = await api.startJourney(
        activeSession?.preset || selectedPreset,
        shareDuration,
        location?.latitude,
        location?.longitude
      );

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

  const copyShareLink = async () => {
    const link = getShareLink();
    await Clipboard.setStringAsync(link);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied!", "Link copied to clipboard");
  };

  const shareLink = async () => {
    const link = getShareLink();
    try {
      await Share.share({
        message: `Track my journey for safety: ${link}`,
        title: "SafeGuard AI - Track My Journey",
      });
    } catch (error) {
      copyShareLink();
    }
  };

  // Active Session View
  if (activeSession) {
    const preset = presets.find((p) => p.id === activeSession.preset);

    return (
      <SafeAreaView className="flex-1 bg-zinc-950" edges={["top"]}>
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Active Header */}
          <View className="items-center py-8" data-testid="going-out-active">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${preset?.color}20` }}
            >
              <Ionicons name={preset?.icon as any} size={40} color={preset?.color} />
            </View>
            <Text className="text-2xl font-black text-white">Going Out Mode Active</Text>
            <Text className="text-zinc-400">{preset?.name}</Text>
          </View>

          {/* Status Cards */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl items-center">
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              <Text className="text-emerald-500 font-bold mt-2">Protected</Text>
            </View>
            <View className="flex-1 p-4 bg-zinc-900 border border-zinc-800 rounded-xl items-center">
              <Ionicons
                name="battery-half"
                size={24}
                color={batteryLevel < 20 ? "#ef4444" : batteryLevel < 50 ? "#f59e0b" : "#10b981"}
              />
              <Text className="text-white font-bold mt-2">{batteryLevel}%</Text>
            </View>
          </View>

          {/* Features Status */}
          <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
            <FeatureRow
              label="Voice Activation"
              enabled={activeSession.voice_activation_enabled}
            />
            <FeatureRow
              label="Shake Detection"
              enabled={activeSession.shake_detection_enabled}
            />
            <FeatureRow
              label="Auto-Record"
              enabled={activeSession.auto_record_enabled}
            />
            <FeatureRow
              label="Check-ins"
              enabled={activeSession.checkin_enabled}
              detail={activeSession.checkin_enabled ? `Every ${activeSession.checkin_interval}min` : undefined}
            />
          </View>

          {/* Journey Sharing Card */}
          <View
            className={`border rounded-xl p-4 mb-6 ${
              journeyShare?.is_active
                ? "bg-cyan-500/10 border-cyan-500/30"
                : "bg-zinc-900 border-zinc-800"
            }`}
          >
            {journeyShare?.is_active ? (
              <View>
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-cyan-500/20 items-center justify-center">
                      <Ionicons name="share-social" size={20} color="#06b6d4" />
                    </View>
                    <View>
                      <Text className="text-cyan-400 font-bold">Sharing Location</Text>
                      <Text className="text-zinc-500 text-xs">Contacts can track you</Text>
                    </View>
                  </View>
                  <View className="w-2 h-2 rounded-full bg-cyan-500" />
                </View>

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={shareLink}
                    className="flex-1 flex-row items-center justify-center gap-2 py-3 bg-cyan-500/20 rounded-xl"
                    data-testid="share-btn"
                  >
                    <Ionicons name="share-outline" size={18} color="#06b6d4" />
                    <Text className="text-cyan-400 font-medium">Share Link</Text>
                  </Pressable>
                  <Pressable
                    onPress={stopJourneyShare}
                    className="px-4 py-3 border border-zinc-700 rounded-xl"
                    data-testid="stop-share-btn"
                  >
                    <Text className="text-zinc-400">Stop</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center">
                    <Ionicons name="link" size={20} color="#71717a" />
                  </View>
                  <View>
                    <Text className="text-white font-medium">Journey Sharing</Text>
                    <Text className="text-zinc-500 text-xs">Share live location</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-cyan-500 rounded-lg"
                  data-testid="start-share-btn"
                >
                  <Text className="text-white font-medium">Share</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <Pressable
            onPress={() => setShowEndModal(true)}
            className="flex-row items-center justify-center gap-2 py-4 border border-red-500/30 rounded-xl mb-4"
            data-testid="end-session-btn"
          >
            <Ionicons name="stop" size={20} color="#f87171" />
            <Text className="text-red-400 font-bold">End Going Out Mode</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/sos")}
            className="flex-row items-center justify-center gap-2 py-4 bg-red-500 rounded-xl"
            data-testid="quick-sos-btn"
          >
            <Ionicons name="warning" size={20} color="#fff" />
            <Text className="text-white font-bold">SOS Emergency</Text>
          </Pressable>
        </ScrollView>

        {/* Check-in Modal */}
        <Modal visible={showCheckinModal} transparent animationType="fade">
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-amber-500/20 items-center justify-center mb-4">
                  <Ionicons name="time" size={40} color="#f59e0b" />
                </View>
                <Text className="text-xl font-bold text-white">Are You Safe?</Text>
                <Text className="text-zinc-400 mt-2">Please confirm you're okay</Text>
                <View className="w-full h-2 bg-zinc-800 rounded-full mt-4">
                  <View
                    className="h-2 bg-amber-500 rounded-full"
                    style={{ width: `${(checkinCountdown / 60) * 100}%` }}
                  />
                </View>
                <Text className="text-zinc-500 text-sm mt-2">{checkinCountdown}s remaining</Text>
              </View>

              <View className="flex-row gap-4">
                <Pressable
                  onPress={() => handleCheckinResponse(true)}
                  className="flex-1 flex-row items-center justify-center gap-2 py-4 bg-emerald-500 rounded-xl"
                  data-testid="im-safe-btn"
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text className="text-white font-bold">I'm Safe</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleCheckinResponse(false)}
                  className="flex-1 flex-row items-center justify-center gap-2 py-4 bg-red-500 rounded-xl"
                  data-testid="not-safe-btn"
                >
                  <Ionicons name="warning" size={20} color="#fff" />
                  <Text className="text-white font-bold">Not Safe</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* End Session Modal */}
        <Modal visible={showEndModal} transparent animationType="fade">
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
              <Text className="text-xl font-bold text-white mb-2">End Going Out Mode</Text>
              <Text className="text-zinc-400 mb-6">
                Are you sure you want to end the session?
              </Text>

              <View className="gap-3">
                <Pressable
                  onPress={endSession}
                  disabled={loading}
                  className="py-4 bg-red-500 rounded-xl items-center"
                  data-testid="confirm-end-btn"
                >
                  <Text className="text-white font-bold">
                    {loading ? "Ending..." : "End Session"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowEndModal(false)}
                  className="py-4 border border-zinc-700 rounded-xl items-center"
                >
                  <Text className="text-zinc-400">Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Share Journey Modal */}
        <Modal visible={showShareModal} transparent animationType="fade">
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
              <Text className="text-xl font-bold text-white mb-2">Share Your Journey</Text>
              <Text className="text-zinc-400 mb-6">
                Share a tracking link with trusted contacts.
              </Text>

              <Text className="text-zinc-300 mb-2">Link expires in</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {[1, 2, 4, 8, 12, 24].map((hours) => (
                  <Pressable
                    key={hours}
                    onPress={() => setShareDuration(hours)}
                    className={`px-4 py-2 rounded-lg ${
                      shareDuration === hours
                        ? "bg-cyan-500"
                        : "bg-zinc-800 border border-zinc-700"
                    }`}
                  >
                    <Text
                      className={shareDuration === hours ? "text-white" : "text-zinc-400"}
                    >
                      {hours}h
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={startJourneyShare}
                disabled={loading}
                className="py-4 bg-cyan-500 rounded-xl items-center mb-3"
                data-testid="confirm-share-btn"
              >
                <Text className="text-white font-bold">
                  {loading ? "Starting..." : "Start Sharing"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowShareModal(false)}
                className="py-4 border border-zinc-700 rounded-xl items-center"
              >
                <Text className="text-zinc-400">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Setup View
  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top"]}>
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="py-4" data-testid="going-out-setup">
          <Text className="text-2xl font-black text-white">Going Out Mode</Text>
          <Text className="text-zinc-500 text-sm">
            Extra protection for clubs, dates, and travel
          </Text>
        </View>

        {/* Battery Warning */}
        {batteryLevel < 20 && (
          <View className="flex-row items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
            <Ionicons name="battery-dead" size={20} color="#f59e0b" />
            <Text className="text-amber-400 text-sm flex-1">
              Low battery ({batteryLevel}%). Consider charging before going out.
            </Text>
          </View>
        )}

        {/* Preset Selection */}
        <View className="mb-6">
          <Text className="text-zinc-300 mb-3">Select Preset</Text>
          <View className="flex-row flex-wrap gap-3">
            {presets.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => {
                  setSelectedPreset(preset.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className={`w-[48%] p-4 rounded-xl border items-center ${
                  selectedPreset === preset.id
                    ? "border-current"
                    : "bg-zinc-900 border-zinc-800"
                }`}
                style={selectedPreset === preset.id ? { backgroundColor: `${preset.color}15`, borderColor: preset.color } : {}}
                data-testid={`preset-${preset.id}`}
              >
                <Ionicons
                  name={preset.icon as any}
                  size={32}
                  color={selectedPreset === preset.id ? preset.color : "#71717a"}
                />
                <Text
                  className={`mt-2 font-medium ${
                    selectedPreset === preset.id ? "" : "text-zinc-400"
                  }`}
                  style={selectedPreset === preset.id ? { color: preset.color } : {}}
                >
                  {preset.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Safety Options */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <Text className="text-white font-bold mb-4">Safety Options</Text>

          <SettingToggle
            icon="mic"
            iconColor="#8b5cf6"
            title="Voice Activation"
            description="Trigger SOS with voice"
            value={settings.voiceActivation}
            onValueChange={(val) => setSettings((s) => ({ ...s, voiceActivation: val }))}
            testId="voice-toggle"
          />

          <SettingToggle
            icon="phone-portrait"
            iconColor="#8b5cf6"
            title="Shake Detection"
            description="Shake phone to trigger SOS"
            value={settings.shakeDetection}
            onValueChange={(val) => setSettings((s) => ({ ...s, shakeDetection: val }))}
            testId="shake-toggle"
          />

          <SettingToggle
            icon="mic"
            iconColor="#ef4444"
            title="Auto-Record on Trigger"
            description="Record audio when SOS triggers"
            value={settings.autoRecord}
            onValueChange={(val) => setSettings((s) => ({ ...s, autoRecord: val }))}
            testId="autorecord-toggle"
          />
        </View>

        {/* Check-in Settings */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <SettingToggle
            icon="time"
            iconColor="#f59e0b"
            title="Check-in Timer"
            description="Get reminded to confirm you're safe"
            value={settings.checkinEnabled}
            onValueChange={(val) => setSettings((s) => ({ ...s, checkinEnabled: val }))}
            testId="checkin-toggle"
          />

          {settings.checkinEnabled && (
            <View className="mt-4">
              <Text className="text-zinc-400 text-sm mb-2">Check-in Interval</Text>
              <View className="flex-row flex-wrap gap-2">
                {checkinIntervals.map((interval) => (
                  <Pressable
                    key={interval.value}
                    onPress={() => setSettings((s) => ({ ...s, checkinInterval: interval.value }))}
                    className={`px-4 py-2 rounded-lg ${
                      settings.checkinInterval === interval.value
                        ? "bg-amber-500"
                        : "bg-zinc-800 border border-zinc-700"
                    }`}
                  >
                    <Text
                      className={
                        settings.checkinInterval === interval.value
                          ? "text-white"
                          : "text-zinc-400"
                      }
                    >
                      {interval.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Start Button */}
        <Pressable
          onPress={startGoingOutMode}
          disabled={loading}
          className="flex-row items-center justify-center gap-2 py-5 bg-violet-500 rounded-xl"
          style={{ opacity: loading ? 0.7 : 1 }}
          data-testid="start-going-out-btn"
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text className="text-white font-bold text-lg">
            {loading ? "Starting..." : "Start Going Out Mode"}
          </Text>
        </Pressable>

        <Text className="text-center text-zinc-500 text-xs mt-4">
          No audio will be recorded until a trigger occurs
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
function FeatureRow({
  label,
  enabled,
  detail,
}: {
  label: string;
  enabled: boolean;
  detail?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-zinc-400 text-sm">{label}</Text>
      <Text className={enabled ? "text-emerald-500" : "text-zinc-600"}>
        {enabled ? detail || "ON" : "OFF"}
      </Text>
    </View>
  );
}

function SettingToggle({
  icon,
  iconColor,
  title,
  description,
  value,
  onValueChange,
  testId,
}: {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  testId: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center gap-3 flex-1">
        <View
          className="w-10 h-10 rounded-lg items-center justify-center"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-white text-sm">{title}</Text>
          <Text className="text-zinc-500 text-xs">{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
        thumbColor="#fff"
        testID={testId}
      />
    </View>
  );
}
