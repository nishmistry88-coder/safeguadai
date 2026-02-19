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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

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
      // Vibration pattern for incoming call
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
    if (!newContact.name || !newContact.phone) {
      return;
    }

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
      if (selectedContact?.id === id) {
        setSelectedContact(null);
      }
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
        <SafeAreaView className="flex-1">
          {/* Caller Info */}
          <View className="flex-1 items-center justify-center">
            <Animated.View
              style={{ transform: [{ scale: pulseAnim }] }}
              className="w-28 h-28 rounded-full bg-zinc-800 items-center justify-center mb-6"
            >
              <Ionicons name="person" size={56} color="#71717a" />
            </Animated.View>

            <Text className="text-zinc-500 text-sm mb-2">Incoming call</Text>
            <Text className="text-3xl font-bold text-white mb-1">
              {selectedContact?.name || "Unknown"}
            </Text>
            <Text className="text-zinc-400">
              {selectedContact?.phone || ""}
            </Text>
          </View>

          {/* Call Actions */}
          <View className="px-8 pb-12 flex-row justify-around items-center">
            <Pressable
              onPress={endCall}
              className="w-16 h-16 rounded-full bg-red-500 items-center justify-center"
              data-testid="decline-call-btn"
            >
              <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
            </Pressable>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                onPress={answerCall}
                className="w-16 h-16 rounded-full bg-emerald-500 items-center justify-center"
                data-testid="answer-call-btn"
              >
                <Ionicons name="call" size={28} color="#fff" />
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Active Call Screen
  if (callState === "active") {
    return (
      <View className="flex-1 bg-zinc-950" data-testid="active-call-screen">
        <SafeAreaView className="flex-1">
          {/* Caller Info */}
          <View className="flex-1 items-center justify-center">
            <View className="w-28 h-28 rounded-full bg-zinc-800 items-center justify-center mb-6">
              <Ionicons name="person" size={56} color="#71717a" />
            </View>

            <Text className="text-3xl font-bold text-white mb-1">
              {selectedContact?.name || "Unknown"}
            </Text>
            <Text className="text-emerald-500 text-lg font-medium">
              {formatTime(timer)}
            </Text>
          </View>

          {/* Call Controls */}
          <View className="px-8 pb-12">
            <View className="flex-row justify-around mb-8">
              <View className="items-center">
                <View className="w-14 h-14 rounded-full bg-zinc-800 items-center justify-center mb-2">
                  <Ionicons name="volume-high" size={24} color="#fff" />
                </View>
                <Text className="text-xs text-zinc-400">Speaker</Text>
              </View>
              <View className="items-center">
                <View className="w-14 h-14 rounded-full bg-zinc-800 items-center justify-center mb-2">
                  <Ionicons name="keypad" size={24} color="#fff" />
                </View>
                <Text className="text-xs text-zinc-400">Keypad</Text>
              </View>
              <View className="items-center">
                <View className="w-14 h-14 rounded-full bg-zinc-800 items-center justify-center mb-2">
                  <Ionicons name="people" size={24} color="#fff" />
                </View>
                <Text className="text-xs text-zinc-400">Contacts</Text>
              </View>
            </View>

            <View className="items-center">
              <Pressable
                onPress={endCall}
                className="w-16 h-16 rounded-full bg-red-500 items-center justify-center"
                data-testid="end-call-btn"
              >
                <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Setup Screen (Idle State)
  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top"]}>
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="py-4" data-testid="fake-call-setup">
          <Text className="text-2xl font-black text-white">Fake Call</Text>
          <Text className="text-zinc-500 text-sm">Escape uncomfortable situations</Text>
        </View>

        {/* Caller Selection */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-zinc-300">Select Caller</Text>
            <Pressable
              onPress={() => setShowAddDialog(true)}
              className="flex-row items-center gap-1 px-3 py-2 border border-zinc-700 rounded-lg"
              data-testid="add-caller-btn"
            >
              <Ionicons name="add" size={16} color="#a1a1aa" />
              <Text className="text-zinc-400 text-sm">Add</Text>
            </Pressable>
          </View>

          {contacts.length === 0 ? (
            <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 items-center">
              <Ionicons name="person" size={48} color="#52525b" />
              <Text className="text-zinc-500 mt-3 mb-1">No callers added yet</Text>
              <Text className="text-zinc-600 text-xs">Add a fake caller to get started</Text>
            </View>
          ) : (
            <View className="gap-2">
              {contacts.map((contact) => (
                <Pressable
                  key={contact.id}
                  onPress={() => {
                    setSelectedContact(contact);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    selectedContact?.id === contact.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                  data-testid={`caller-${contact.id}`}
                >
                  <View className="w-12 h-12 rounded-full bg-zinc-800 items-center justify-center mr-4">
                    <Ionicons name="person" size={24} color="#71717a" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">{contact.name}</Text>
                    <Text className="text-zinc-500 text-sm">{contact.phone}</Text>
                  </View>
                  <Pressable
                    onPress={() => deleteContact(contact.id)}
                    className="p-2"
                    hitSlop={10}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
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
          className={`flex-row items-center justify-center gap-3 p-6 rounded-xl ${
            !selectedContact && contacts.length === 0
              ? "bg-zinc-800"
              : "bg-emerald-500/20 border border-emerald-500/30"
          }`}
          style={{ opacity: !selectedContact && contacts.length === 0 ? 0.5 : 1 }}
          data-testid="trigger-call-btn"
        >
          <Ionicons
            name="call"
            size={24}
            color={!selectedContact && contacts.length === 0 ? "#52525b" : "#10b981"}
          />
          <Text
            className={`text-lg font-bold ${
              !selectedContact && contacts.length === 0 ? "text-zinc-600" : "text-emerald-400"
            }`}
          >
            Trigger Incoming Call
          </Text>
        </Pressable>

        <Text className="text-center text-zinc-500 text-sm mt-4">
          The fake call will appear like a real incoming call
        </Text>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal visible={showAddDialog} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-white mb-6">Add Fake Caller</Text>

            <View className="mb-4">
              <Text className="text-zinc-300 mb-2">Name</Text>
              <TextInput
                placeholder="Mom"
                placeholderTextColor="#52525b"
                value={newContact.name}
                onChangeText={(text) => setNewContact((c) => ({ ...c, name: text }))}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                data-testid="caller-name-input"
              />
            </View>

            <View className="mb-6">
              <Text className="text-zinc-300 mb-2">Phone Number</Text>
              <TextInput
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#52525b"
                value={newContact.phone}
                onChangeText={(text) => setNewContact((c) => ({ ...c, phone: text }))}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                keyboardType="phone-pad"
                data-testid="caller-phone-input"
              />
            </View>

            <Pressable
              onPress={addContact}
              disabled={loading || !newContact.name || !newContact.phone}
              className="py-4 bg-violet-500 rounded-xl items-center mb-3"
              style={{ opacity: loading || !newContact.name || !newContact.phone ? 0.5 : 1 }}
              data-testid="save-caller-btn"
            >
              <Text className="text-white font-bold">
                {loading ? "Saving..." : "Save Contact"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowAddDialog(false);
                setNewContact({ name: "", phone: "" });
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
