import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Vibration,
  Animated,
  Image,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f5939225-27b2-488c-ba98-856ce900c22c/artifacts/u4rcyto1_real%20logo.png";
const CITY_BG = "https://images.unsplash.com/photo-1655340401877-121a5a2784b4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxMb25kb24lMjBza3lsaW5lJTIwbmlnaHQlMjBjaXR5c2NhcGUlMjByaXZlciUyMFRoYW1lcyUyMGFlcmlhbCUyMHZpZXclMjBwdXJwbGUlMjBibHVlfGVufDB8fHx8MTc3MTU0NDQwN3ww&ixlib=rb-4.1.0&q=85";

interface FakeContact {
  id: string;
  name: string;
  phone: string;
}

export default function FakeCallScreen() {
  const { token } = useAuth();
  const [callState, setCallState] = useState<"idle" | "incoming" | "active">("idle");
  const [timer, setTimer] = useState(0);
  const [contacts, setContacts] = useState<FakeContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<FakeContact | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchContacts();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  useEffect(() => {
    if (callState === "incoming") {
      startPulseAnimation();
      const pattern = [500, 200, 500, 200, 500, 200, 500, 200];
      Vibration.vibrate(pattern, true);
    } else {
      Vibration.cancel();
    }
  }, [callState]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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

  const fetchContacts = async () => {
    try {
      const data = await api.getFakeCallContacts();
      setContacts(data);
      if (data.length > 0 && !selectedContact) {
        setSelectedContact(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    setLoading(true);
    try {
      await api.createFakeCallContact(newContact.name, newContact.phone);
      setNewContact({ name: "", phone: "" });
      setShowAddDialog(false);
      fetchContacts();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to add contact:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      await api.deleteFakeCallContact(id);
      fetchContacts();
      if (selectedContact?.id === id) setSelectedContact(null);
    } catch (error) {
      console.error("Failed to delete contact:", error);
    }
  };

  const triggerIncomingCall = () => {
    setCallState("incoming");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const answerCall = () => {
    setCallState("active");
    Vibration.cancel();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const endCall = () => {
    setCallState("idle");
    Vibration.cancel();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Incoming Call Screen
  if (callState === "incoming") {
    return (
      <View className="flex-1 bg-zinc-950" data-testid="incoming-call-screen">
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.2)', 'rgba(9, 9, 11, 0.98)']}
          className="flex-1"
        >
          <SafeAreaView className="flex-1">
            <View className="flex-1 items-center justify-center">
              <Animated.View
                style={{ transform: [{ scale: pulseAnim }] }}
                className="w-32 h-32 rounded-full bg-zinc-800 items-center justify-center mb-6"
              >
                <Ionicons name="person" size={64} color="#71717a" />
              </Animated.View>

              <Text className="text-zinc-500 text-sm mb-2">Incoming call</Text>
              <Text className="text-3xl text-white mb-1" style={{ fontWeight: '900' }}>
                {selectedContact?.name || "Unknown"}
              </Text>
              <Text className="text-zinc-400">{selectedContact?.phone || ""}</Text>
            </View>

            <View className="px-8 pb-12 flex-row justify-around items-center">
              <Pressable
                onPress={endCall}
                className="w-18 h-18 rounded-full items-center justify-center"
                style={{ backgroundColor: '#ef4444', width: 72, height: 72 }}
                data-testid="decline-call-btn"
              >
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
              </Pressable>

              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Pressable
                  onPress={answerCall}
                  className="rounded-full items-center justify-center"
                  style={{ backgroundColor: '#10b981', width: 72, height: 72 }}
                  data-testid="answer-call-btn"
                >
                  <Ionicons name="call" size={32} color="#fff" />
                </Pressable>
              </Animated.View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  // Active Call Screen
  if (callState === "active") {
    return (
      <View className="flex-1 bg-zinc-950" data-testid="active-call-screen">
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.15)', 'rgba(9, 9, 11, 0.98)']}
          className="flex-1"
        >
          <SafeAreaView className="flex-1">
            <View className="flex-1 items-center justify-center">
              <View className="w-32 h-32 rounded-full bg-zinc-800 items-center justify-center mb-6">
                <Ionicons name="person" size={64} color="#71717a" />
              </View>

              <Text className="text-3xl text-white mb-1" style={{ fontWeight: '900' }}>
                {selectedContact?.name || "Unknown"}
              </Text>
              <Text className="text-emerald-500 text-xl font-medium">{formatTime(timer)}</Text>
            </View>

            <View className="px-8 pb-12">
              <View className="flex-row justify-around mb-8">
                {[
                  { icon: "volume-high", label: "Speaker" },
                  { icon: "keypad", label: "Keypad" },
                  { icon: "people", label: "Contacts" },
                ].map((item) => (
                  <View key={item.label} className="items-center">
                    <View className="w-16 h-16 rounded-full bg-zinc-800 items-center justify-center mb-2">
                      <Ionicons name={item.icon as any} size={26} color="#fff" />
                    </View>
                    <Text className="text-xs text-zinc-400">{item.label}</Text>
                  </View>
                ))}
              </View>

              <View className="items-center">
                <Pressable
                  onPress={endCall}
                  className="rounded-full items-center justify-center"
                  style={{ backgroundColor: '#ef4444', width: 72, height: 72 }}
                  data-testid="end-call-btn"
                >
                  <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  // Setup Screen (Idle State)
  return (
    <View className="flex-1 bg-zinc-950">
      <ImageBackground source={{ uri: CITY_BG }} className="flex-1" resizeMode="cover">
        <LinearGradient
          colors={['rgba(88, 28, 135, 0.7)', 'rgba(15, 23, 42, 0.92)', 'rgba(9, 9, 11, 0.98)']}
          locations={[0, 0.25, 0.5]}
          className="flex-1"
        >
          <SafeAreaView className="flex-1" edges={["top"]}>
            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 120 }}>
              {/* Header */}
              <View className="flex-row items-center gap-3 py-4" data-testid="fake-call-setup">
                <Image source={{ uri: LOGO_URL }} className="w-10 h-10" resizeMode="contain" />
                <View>
                  <Text className="text-2xl text-white" style={{ fontWeight: '900' }}>Fake Call</Text>
                  <Text className="text-violet-300/70 text-sm">Escape uncomfortable situations</Text>
                </View>
              </View>

              {/* Caller Selection */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-zinc-300 font-bold">Select Caller</Text>
                  <Pressable
                    onPress={() => setShowAddDialog(true)}
                    className="flex-row items-center gap-2 px-4 py-2 border border-zinc-700/50 rounded-xl bg-zinc-900/50"
                    data-testid="add-caller-btn"
                  >
                    <Ionicons name="add" size={18} color="#a78bfa" />
                    <Text className="text-violet-400 font-medium">Add</Text>
                  </Pressable>
                </View>

                {contacts.length === 0 ? (
                  <View className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-8 items-center">
                    <Ionicons name="person" size={56} color="#52525b" />
                    <Text className="text-zinc-500 mt-4 mb-1 font-medium">No callers added yet</Text>
                    <Text className="text-zinc-600 text-xs">Add a fake caller to get started</Text>
                  </View>
                ) : (
                  <View className="gap-3">
                    {contacts.map((contact) => (
                      <Pressable
                        key={contact.id}
                        onPress={() => {
                          setSelectedContact(contact);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className={`flex-row items-center p-4 rounded-2xl border ${
                          selectedContact?.id === contact.id
                            ? "border-violet-500/50 bg-violet-500/15"
                            : "border-zinc-700/50 bg-zinc-900/70"
                        }`}
                        data-testid={`caller-${contact.id}`}
                      >
                        <View className={`w-14 h-14 rounded-xl items-center justify-center mr-4 ${
                          selectedContact?.id === contact.id ? "bg-violet-500/25" : "bg-zinc-800"
                        }`}>
                          <Ionicons name="person" size={28} color={selectedContact?.id === contact.id ? "#a78bfa" : "#71717a"} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-bold text-lg">{contact.name}</Text>
                          <Text className="text-zinc-500">{contact.phone}</Text>
                        </View>
                        <Pressable onPress={() => deleteContact(contact.id)} className="p-2" hitSlop={10}>
                          <Ionicons name="trash-outline" size={22} color="#ef4444" />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Trigger Call Button */}
              <Pressable
                onPress={triggerIncomingCall}
                disabled={!selectedContact && contacts.length === 0}
                className={`flex-row items-center justify-center gap-3 p-6 rounded-2xl ${
                  !selectedContact && contacts.length === 0
                    ? "bg-zinc-800/50"
                    : "bg-emerald-500/15 border border-emerald-500/40"
                }`}
                style={{ opacity: !selectedContact && contacts.length === 0 ? 0.5 : 1 }}
                data-testid="trigger-call-btn"
              >
                <Ionicons
                  name="call"
                  size={28}
                  color={!selectedContact && contacts.length === 0 ? "#52525b" : "#10b981"}
                />
                <Text
                  className={`text-xl ${
                    !selectedContact && contacts.length === 0 ? "text-zinc-600" : "text-emerald-400"
                  }`}
                  style={{ fontWeight: '900' }}
                >
                  Trigger Incoming Call
                </Text>
              </Pressable>

              <Text className="text-center text-zinc-500 text-sm mt-4">
                The fake call will appear like a real incoming call
              </Text>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>

      {/* Add Contact Modal */}
      <Modal visible={showAddDialog} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View className="bg-zinc-900 border border-zinc-700/50 rounded-3xl p-8 w-full max-w-sm">
            <Text className="text-2xl text-white mb-6" style={{ fontWeight: '900' }}>Add Fake Caller</Text>

            <View className="mb-4">
              <Text className="text-zinc-300 mb-2 font-medium">Name</Text>
              <TextInput
                placeholder="Mom"
                placeholderTextColor="#52525b"
                value={newContact.name}
                onChangeText={(text) => setNewContact((c) => ({ ...c, name: text }))}
                className="bg-zinc-800 border border-zinc-700/50 rounded-xl px-4 py-4 text-white text-base"
                data-testid="caller-name-input"
              />
            </View>

            <View className="mb-6">
              <Text className="text-zinc-300 mb-2 font-medium">Phone Number</Text>
              <TextInput
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#52525b"
                value={newContact.phone}
                onChangeText={(text) => setNewContact((c) => ({ ...c, phone: text }))}
                className="bg-zinc-800 border border-zinc-700/50 rounded-xl px-4 py-4 text-white text-base"
                keyboardType="phone-pad"
                data-testid="caller-phone-input"
              />
            </View>

            <Pressable
              onPress={addContact}
              disabled={loading || !newContact.name || !newContact.phone}
              className="py-5 rounded-2xl items-center mb-3"
              style={{ backgroundColor: '#8b5cf6', opacity: loading || !newContact.name || !newContact.phone ? 0.5 : 1 }}
              data-testid="save-caller-btn"
            >
              <Text className="text-white font-bold text-lg">{loading ? "Saving..." : "Save Contact"}</Text>
            </Pressable>

            <Pressable
              onPress={() => { setShowAddDialog(false); setNewContact({ name: "", phone: "" }); }}
              className="py-5 border border-zinc-700/50 rounded-2xl items-center"
            >
              <Text className="text-zinc-400 font-medium">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
