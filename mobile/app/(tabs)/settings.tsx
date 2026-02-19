import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { getCountryList, getEmergencyNumber, EmergencyInfo } from "@/constants/emergencyNumbers";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showPhraseModal, setShowPhraseModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [tempPhrase, setTempPhrase] = useState("");
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo>(getEmergencyNumber("US"));
  const countries = getCountryList();

  const [settings, setSettings] = useState({
    country_code: "US",
    voice_activation_enabled: false,
    activation_phrase: "Help me",
    checkin_interval: 30,
    checkin_enabled: true,
    shake_detection_enabled: false,
    auto_record_on_trigger: false,
    trigger_fake_call: false,
    low_battery_warning: true,
    send_location_on_low_battery: true,
    low_battery_threshold: 20,
    critical_battery_threshold: 5,
    shutdown_alert_enabled: true,
    send_location_on_shutdown: true,
    voice_verify_to_disable: true,
    notifications: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings((prev) => ({ ...prev, ...data }));
      if (data?.country_code) {
        setEmergencyInfo(getEmergencyNumber(data.country_code));
      }
    } catch (error) {
      console.log("Using default settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    if (key === "country_code") {
      setEmergencyInfo(getEmergencyNumber(value));
    }

    try {
      await api.updateSettings({ [key]: value });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Failed to save setting:", error);
    }
  };

  const savePhrase = () => {
    if (tempPhrase.trim()) {
      updateSetting("activation_phrase", tempPhrase.trim());
      setShowPhraseModal(false);
      setTempPhrase("");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/landing");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center">
        <View className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top"]}>
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="py-4" data-testid="settings-page">
          <Text className="text-2xl font-black text-white">Settings</Text>
          <Text className="text-zinc-500 text-sm">Manage your safety preferences</Text>
        </View>

        {/* Profile Card */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6" data-testid="profile-card">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-violet-500/20 items-center justify-center">
              <Ionicons name="person" size={28} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{user?.name}</Text>
              <Text className="text-zinc-500 text-sm">{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Country & Emergency */}
        <SectionHeader title="Location & Emergency" />
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl mb-6 overflow-hidden">
          <Pressable
            onPress={() => setShowCountryModal(true)}
            className="p-4 border-b border-zinc-800"
          >
            <View className="flex-row items-center gap-3 mb-2">
              <View className="w-10 h-10 rounded-lg bg-red-500/10 items-center justify-center">
                <Ionicons name="globe" size={20} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Country</Text>
                <Text className="text-zinc-500 text-xs">Sets your emergency number</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-white">{emergencyInfo.flag}</Text>
                <Ionicons name="chevron-forward" size={20} color="#71717a" />
              </View>
            </View>
          </Pressable>

          <View className="p-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-lg bg-red-500/10 items-center justify-center">
                <Ionicons name="call" size={20} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Emergency Number</Text>
                <Text className="text-zinc-500 text-xs">
                  Police: {emergencyInfo.police} • Ambulance: {emergencyInfo.ambulance}
                </Text>
              </View>
              <Text className="text-2xl font-bold text-red-500">{emergencyInfo.universal}</Text>
            </View>
          </View>
        </View>

        {/* Voice Activation */}
        <SectionHeader title="Voice Activation" />
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl mb-6 overflow-hidden">
          <SettingRow
            icon="mic"
            iconBg="bg-violet-500/10"
            iconColor="#8b5cf6"
            title="Voice Activation Mode"
            description="Listen for activation phrase"
            trailing={
              <Switch
                value={settings.voice_activation_enabled}
                onValueChange={(val) => updateSetting("voice_activation_enabled", val)}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            }
          />

          <Pressable
            onPress={() => {
              setTempPhrase(settings.activation_phrase);
              setShowPhraseModal(true);
            }}
            className="p-4 border-t border-zinc-800"
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-zinc-400 text-sm">Activation Phrase</Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="create-outline" size={16} color="#8b5cf6" />
                <Text className="text-violet-400 text-sm">Edit</Text>
              </View>
            </View>
            <Text className="text-white font-medium">"{settings.activation_phrase}"</Text>
          </Pressable>

          <SettingRow
            icon="volume-high"
            iconBg="bg-zinc-800"
            iconColor="#a1a1aa"
            title="Voice Verify to Disable"
            description="Require phrase to end Going Out Mode"
            trailing={
              <Switch
                value={settings.voice_verify_to_disable}
                onValueChange={(val) => updateSetting("voice_verify_to_disable", val)}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Triggers */}
        <SectionHeader title="Triggers" />
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl mb-6 overflow-hidden">
          <SettingRow
            icon="phone-portrait"
            iconBg="bg-zinc-800"
            iconColor="#a1a1aa"
            title="Shake Detection"
            description="Shake phone to trigger SOS"
            trailing={
              <Switch
                value={settings.shake_detection_enabled}
                onValueChange={(val) => updateSetting("shake_detection_enabled", val)}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            }
          />

          <SettingRow
            icon="mic"
            iconBg="bg-red-500/10"
            iconColor="#ef4444"
            title="Auto-Record on Trigger"
            description="Record audio when SOS triggers"
            trailing={
              <Switch
                value={settings.auto_record_on_trigger}
                onValueChange={(val) => updateSetting("auto_record_on_trigger", val)}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            }
          />

          <SettingRow
            icon="call"
            iconBg="bg-zinc-800"
            iconColor="#a1a1aa"
            title="Trigger Fake Call"
            description="Fake call on missed check-in"
            trailing={
              <Switch
                value={settings.trigger_fake_call}
                onValueChange={(val) => updateSetting("trigger_fake_call", val)}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Battery & Power */}
        <SectionHeader title="Battery & Power" />
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl mb-6 overflow-hidden">
          <SettingRow
            icon="battery-half"
            iconBg="bg-amber-500/10"
            iconColor="#f59e0b"
            title="Low Battery Warning"
            description="Alert when battery is low"
            trailing={
              <Switch
                value={settings.low_battery_warning}
                onValueChange={(val) => updateSetting("low_battery_warning", val)}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            }
          />

          <SettingRow
            icon="location"
            iconBg="bg-zinc-800"
            iconColor="#a1a1aa"
            title="Send Location on Low Battery"
            description="Send final location when critical"
            trailing={
              <Switch
                value={settings.send_location_on_low_battery}
                onValueChange={(val) => updateSetting("send_location_on_low_battery", val)}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            }
          />

          <SettingRow
            icon="power"
            iconBg="bg-red-500/10"
            iconColor="#ef4444"
            title="Shutdown Alert"
            description="Alert if phone shuts down during Going Out"
            trailing={
              <Switch
                value={settings.shutdown_alert_enabled}
                onValueChange={(val) => updateSetting("shutdown_alert_enabled", val)}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Emergency Contacts Link */}
        <SectionHeader title="Emergency Contacts" />
        <Pressable
          onPress={() => router.push("/(tabs)/contacts" as any)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex-row items-center"
        >
          <View className="w-10 h-10 rounded-lg bg-violet-500/10 items-center justify-center mr-3">
            <Ionicons name="people" size={20} color="#8b5cf6" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-medium">Manage Contacts</Text>
            <Text className="text-zinc-500 text-xs">Add or edit emergency contacts</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#71717a" />
        </Pressable>

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 py-4 border border-red-500/30 rounded-xl mb-6"
          data-testid="logout-btn"
        >
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text className="text-red-400 font-bold">Sign Out</Text>
        </Pressable>

        {/* App Info */}
        <View className="items-center pb-8">
          <Text className="text-zinc-600 text-xs">SafeGuard AI v2.1.0</Text>
          <Text className="text-zinc-700 text-xs mt-1">Your Voice. Your Safety. Your Control.</Text>
        </View>
      </ScrollView>

      {/* Country Selection Modal */}
      <Modal visible={showCountryModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80">
          <SafeAreaView className="flex-1">
            <View className="flex-1 bg-zinc-900 mt-20 rounded-t-3xl">
              <View className="flex-row items-center justify-between p-6 border-b border-zinc-800">
                <Text className="text-xl font-bold text-white">Select Country</Text>
                <Pressable onPress={() => setShowCountryModal(false)}>
                  <Ionicons name="close" size={24} color="#a1a1aa" />
                </Pressable>
              </View>

              <ScrollView className="flex-1 px-6">
                {countries.map((country) => (
                  <Pressable
                    key={country.code}
                    onPress={() => {
                      updateSetting("country_code", country.code);
                      setShowCountryModal(false);
                    }}
                    className={`flex-row items-center py-4 border-b border-zinc-800 ${
                      settings.country_code === country.code ? "bg-violet-500/10" : ""
                    }`}
                  >
                    <Text className="text-2xl mr-3">{country.flag}</Text>
                    <Text className="text-white flex-1">{country.name}</Text>
                    <Text className="text-zinc-500">{country.universal}</Text>
                    {settings.country_code === country.code && (
                      <Ionicons name="checkmark" size={20} color="#8b5cf6" className="ml-2" />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Edit Phrase Modal */}
      <Modal visible={showPhraseModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-white mb-2">Set Activation Phrase</Text>
            <Text className="text-zinc-400 text-sm mb-6">
              This phrase will trigger SOS when Voice Activation Mode is enabled.
            </Text>

            <Text className="text-zinc-300 mb-2">Type your phrase</Text>
            <TextInput
              placeholder="Help me"
              placeholderTextColor="#52525b"
              value={tempPhrase}
              onChangeText={setTempPhrase}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white mb-6"
              data-testid="phrase-input"
            />

            <Pressable
              onPress={savePhrase}
              disabled={!tempPhrase.trim()}
              className="py-4 bg-violet-500 rounded-xl items-center mb-3"
              style={{ opacity: !tempPhrase.trim() ? 0.5 : 1 }}
              data-testid="save-phrase-btn"
            >
              <Text className="text-white font-bold">Save Phrase</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowPhraseModal(false);
                setTempPhrase("");
              }}
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

// Helper Components
function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
      {title}
    </Text>
  );
}

function SettingRow({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  trailing,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center p-4 border-b border-zinc-800">
      <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${iconBg}`}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium">{title}</Text>
        <Text className="text-zinc-500 text-xs">{description}</Text>
      </View>
      {trailing}
    </View>
  );
}
