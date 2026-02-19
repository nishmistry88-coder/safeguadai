import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Switch,
  Image,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f5939225-27b2-488c-ba98-856ce900c22c/artifacts/u4rcyto1_real%20logo.png";
const CITY_BG = "https://images.unsplash.com/photo-1655340401877-121a5a2784b4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxMb25kb24lMjBza3lsaW5lJTIwbmlnaHQlMjBjaXR5c2NhcGUlMjByaXZlciUyMFRoYW1lcyUyMGFlcmlhbCUyMHZpZXclMjBwdXJwbGUlMjBibHVlfGVufDB8fHx8MTc3MTU0NDQwN3ww&ixlib=rb-4.1.0&q=85";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

const relationships = [
  { value: "family", label: "Family", color: "#8b5cf6" },
  { value: "friend", label: "Friend", color: "#06b6d4" },
  { value: "partner", label: "Partner", color: "#ec4899" },
  { value: "colleague", label: "Colleague", color: "#f59e0b" },
  { value: "other", label: "Other", color: "#71717a" },
];

export default function ContactsScreen() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    relationship: "family",
    is_primary: false,
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingContact(null);
    setFormData({ name: "", phone: "", relationship: "family", is_primary: false });
    setShowDialog(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      is_primary: contact.is_primary,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      if (editingContact) {
        await api.deleteContact(editingContact.id);
      }
      await api.createContact(formData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDialog(false);
      fetchContacts();
    } catch (error) {
      Alert.alert("Error", "Failed to save contact");
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = (contact: Contact) => {
    Alert.alert("Delete Contact", `Are you sure you want to delete ${contact.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteContact(contact.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchContacts();
          } catch (error) {
            Alert.alert("Error", "Failed to delete contact");
          }
        },
      },
    ]);
  };

  const getRelationshipColor = (rel: string) => {
    return relationships.find((r) => r.value === rel)?.color || "#71717a";
  };

  if (loading && contacts.length === 0) {
    return (
      <View className="flex-1 bg-zinc-950 items-center justify-center">
        <View className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full" />
      </View>
    );
  }

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
              <View className="flex-row items-center gap-4 py-4" data-testid="contacts-page">
                <Pressable
                  onPress={() => router.back()}
                  className="w-12 h-12 rounded-xl bg-zinc-900/60 border border-zinc-700/50 items-center justify-center"
                >
                  <Ionicons name="arrow-back" size={22} color="#a1a1aa" />
                </Pressable>
                <View className="flex-1">
                  <Text className="text-2xl text-white" style={{ fontWeight: '900' }}>Emergency Contacts</Text>
                  <Text className="text-violet-300/70 text-sm">
                    {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              {/* Add Contact Button */}
              <Pressable
                onPress={openAddDialog}
                className="flex-row items-center justify-center gap-3 py-5 bg-violet-500/15 border border-violet-500/40 rounded-2xl mb-6"
                data-testid="add-contact-btn"
              >
                <Ionicons name="add-circle" size={26} color="#a78bfa" />
                <Text className="text-violet-400 text-lg" style={{ fontWeight: '700' }}>Add Emergency Contact</Text>
              </Pressable>

              {/* Contacts List */}
              {contacts.length === 0 ? (
                <View className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-10 items-center">
                  <Ionicons name="people" size={72} color="#52525b" />
                  <Text className="text-zinc-400 text-xl font-bold mt-4">No contacts yet</Text>
                  <Text className="text-zinc-500 text-sm text-center mt-2 max-w-xs">
                    Add emergency contacts who will be notified when you trigger SOS
                  </Text>
                </View>
              ) : (
                <View className="gap-4">
                  {contacts.map((contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => openEditDialog(contact)}
                      className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-5"
                      data-testid={`contact-${contact.id}`}
                    >
                      <View className="flex-row items-center">
                        {/* Avatar */}
                        <View
                          className="w-14 h-14 rounded-xl items-center justify-center mr-4"
                          style={{ backgroundColor: `${getRelationshipColor(contact.relationship)}20` }}
                        >
                          <Text
                            className="text-xl"
                            style={{ color: getRelationshipColor(contact.relationship), fontWeight: '900' }}
                          >
                            {contact.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        {/* Info */}
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 mb-1">
                            <Text className="text-white text-lg" style={{ fontWeight: '700' }}>{contact.name}</Text>
                            {contact.is_primary && (
                              <View className="bg-violet-500/25 px-2 py-0.5 rounded-md">
                                <Text className="text-violet-400 text-xs font-bold">Primary</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-zinc-400">{contact.phone}</Text>
                          <Text
                            className="text-sm capitalize mt-1"
                            style={{ color: getRelationshipColor(contact.relationship) }}
                          >
                            {contact.relationship}
                          </Text>
                        </View>

                        {/* Delete */}
                        <Pressable
                          onPress={() => deleteContact(contact)}
                          className="w-12 h-12 rounded-xl bg-red-500/10 items-center justify-center"
                          hitSlop={10}
                        >
                          <Ionicons name="trash-outline" size={22} color="#ef4444" />
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Info Card */}
              <View className="mt-6 p-5 bg-zinc-900/50 border border-zinc-700/50 rounded-2xl">
                <View className="flex-row items-start gap-4">
                  <View className="w-10 h-10 rounded-xl bg-violet-500/15 items-center justify-center">
                    <Ionicons name="information-circle" size={22} color="#a78bfa" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-zinc-300 font-bold mb-1">How it works</Text>
                    <Text className="text-zinc-500 text-sm leading-5">
                      When you trigger SOS, your emergency contacts will receive an alert with your current location. Set your primary contact for priority notifications.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>

      {/* Add/Edit Contact Modal */}
      <Modal visible={showDialog} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View className="bg-zinc-900 border border-zinc-700/50 rounded-3xl p-8 w-full max-w-sm">
            <Text className="text-2xl text-white mb-6" style={{ fontWeight: '900' }}>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </Text>

            {/* Name */}
            <View className="mb-4">
              <Text className="text-zinc-300 mb-2 font-medium">Name *</Text>
              <TextInput
                placeholder="Contact name"
                placeholderTextColor="#52525b"
                value={formData.name}
                onChangeText={(text) => setFormData((f) => ({ ...f, name: text }))}
                className="bg-zinc-800 border border-zinc-700/50 rounded-xl px-4 py-4 text-white text-base"
                data-testid="contact-name-input"
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-zinc-300 mb-2 font-medium">Phone *</Text>
              <TextInput
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#52525b"
                value={formData.phone}
                onChangeText={(text) => setFormData((f) => ({ ...f, phone: text }))}
                className="bg-zinc-800 border border-zinc-700/50 rounded-xl px-4 py-4 text-white text-base"
                keyboardType="phone-pad"
                data-testid="contact-phone-input"
              />
            </View>

            {/* Relationship */}
            <View className="mb-4">
              <Text className="text-zinc-300 mb-3 font-medium">Relationship</Text>
              <View className="flex-row flex-wrap gap-2">
                {relationships.map((rel) => (
                  <Pressable
                    key={rel.value}
                    onPress={() => setFormData((f) => ({ ...f, relationship: rel.value }))}
                    className={`px-4 py-3 rounded-xl border ${
                      formData.relationship === rel.value
                        ? "border-violet-500/50 bg-violet-500/15"
                        : "border-zinc-700/50 bg-zinc-800"
                    }`}
                  >
                    <Text
                      className={formData.relationship === rel.value ? "text-violet-400 font-bold" : "text-zinc-400"}
                    >
                      {rel.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Primary Toggle */}
            <View className="flex-row items-center justify-between mb-6 py-4 border-t border-zinc-800/50">
              <View>
                <Text className="text-white font-bold">Primary Contact</Text>
                <Text className="text-zinc-500 text-xs">First to be notified</Text>
              </View>
              <Switch
                value={formData.is_primary}
                onValueChange={(val) => setFormData((f) => ({ ...f, is_primary: val }))}
                trackColor={{ false: "#3f3f46", true: "#8b5cf6" }}
                thumbColor="#fff"
              />
            </View>

            {/* Actions */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading || !formData.name || !formData.phone}
              className="py-5 rounded-2xl items-center mb-3"
              style={{ backgroundColor: '#8b5cf6', opacity: loading || !formData.name || !formData.phone ? 0.5 : 1 }}
              data-testid="save-contact-btn"
            >
              <Text className="text-white font-bold text-lg">
                {loading ? "Saving..." : editingContact ? "Update Contact" : "Add Contact"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowDialog(false)}
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
