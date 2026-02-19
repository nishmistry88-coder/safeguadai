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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

const relationships = [
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "partner", label: "Partner" },
  { value: "colleague", label: "Colleague" },
  { value: "other", label: "Other" },
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
    setFormData({
      name: "",
      phone: "",
      relationship: "family",
      is_primary: false,
    });
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
        // Note: The API might need an update endpoint - using create for now
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
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete ${contact.name}?`,
      [
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
      ]
    );
  };

  const getRelationshipColor = (relationship: string) => {
    const colors: Record<string, string> = {
      family: "#8b5cf6",
      friend: "#06b6d4",
      partner: "#ec4899",
      colleague: "#f59e0b",
      other: "#71717a",
    };
    return colors[relationship] || colors.other;
  };

  if (loading && contacts.length === 0) {
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
        <View className="flex-row items-center justify-between py-4" data-testid="contacts-page">
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#a1a1aa" />
            </Pressable>
            <View>
              <Text className="text-2xl font-black text-white">Emergency Contacts</Text>
              <Text className="text-zinc-500 text-sm">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Add Contact Button */}
        <Pressable
          onPress={openAddDialog}
          className="flex-row items-center justify-center gap-2 py-4 bg-violet-500/20 border border-violet-500/30 rounded-xl mb-6"
          data-testid="add-contact-btn"
        >
          <Ionicons name="add-circle" size={24} color="#8b5cf6" />
          <Text className="text-violet-400 font-bold">Add Emergency Contact</Text>
        </Pressable>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 items-center">
            <Ionicons name="people" size={64} color="#52525b" />
            <Text className="text-zinc-400 text-lg font-medium mt-4">No contacts yet</Text>
            <Text className="text-zinc-500 text-sm text-center mt-2">
              Add emergency contacts who will be notified when you trigger SOS
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {contacts.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => openEditDialog(contact)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                data-testid={`contact-${contact.id}`}
              >
                <View className="flex-row items-center">
                  {/* Avatar */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: `${getRelationshipColor(contact.relationship)}20` }}
                  >
                    <Text
                      className="text-lg font-bold"
                      style={{ color: getRelationshipColor(contact.relationship) }}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-white font-bold text-lg">{contact.name}</Text>
                      {contact.is_primary && (
                        <View className="bg-violet-500/20 px-2 py-0.5 rounded">
                          <Text className="text-violet-400 text-xs">Primary</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-zinc-400 text-sm">{contact.phone}</Text>
                    <Text
                      className="text-sm capitalize"
                      style={{ color: getRelationshipColor(contact.relationship) }}
                    >
                      {contact.relationship}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => deleteContact(contact)}
                      className="w-10 h-10 rounded-lg bg-red-500/10 items-center justify-center"
                      hitSlop={10}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Info */}
        <View className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <View className="flex-row items-start gap-3">
            <Ionicons name="information-circle" size={20} color="#8b5cf6" />
            <View className="flex-1">
              <Text className="text-zinc-300 text-sm font-medium">How it works</Text>
              <Text className="text-zinc-500 text-xs mt-1">
                When you trigger SOS, your emergency contacts will receive an alert with your
                current location. Set your primary contact for priority notifications.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Contact Modal */}
      <Modal visible={showDialog} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-white mb-6">
              {editingContact ? "Edit Contact" : "Add Contact"}
            </Text>

            {/* Name */}
            <View className="mb-4">
              <Text className="text-zinc-300 mb-2">Name *</Text>
              <TextInput
                placeholder="Contact name"
                placeholderTextColor="#52525b"
                value={formData.name}
                onChangeText={(text) => setFormData((f) => ({ ...f, name: text }))}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                data-testid="contact-name-input"
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-zinc-300 mb-2">Phone *</Text>
              <TextInput
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#52525b"
                value={formData.phone}
                onChangeText={(text) => setFormData((f) => ({ ...f, phone: text }))}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                keyboardType="phone-pad"
                data-testid="contact-phone-input"
              />
            </View>

            {/* Relationship */}
            <View className="mb-4">
              <Text className="text-zinc-300 mb-2">Relationship</Text>
              <View className="flex-row flex-wrap gap-2">
                {relationships.map((rel) => (
                  <Pressable
                    key={rel.value}
                    onPress={() => setFormData((f) => ({ ...f, relationship: rel.value }))}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.relationship === rel.value
                        ? "border-violet-500 bg-violet-500/20"
                        : "border-zinc-700 bg-zinc-800"
                    }`}
                  >
                    <Text
                      className={
                        formData.relationship === rel.value ? "text-violet-400" : "text-zinc-400"
                      }
                    >
                      {rel.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Primary Toggle */}
            <View className="flex-row items-center justify-between mb-6 py-3 border-t border-zinc-800">
              <View>
                <Text className="text-white font-medium">Primary Contact</Text>
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
              className="py-4 bg-violet-500 rounded-xl items-center mb-3"
              style={{ opacity: loading || !formData.name || !formData.phone ? 0.5 : 1 }}
              data-testid="save-contact-btn"
            >
              <Text className="text-white font-bold">
                {loading ? "Saving..." : editingContact ? "Update Contact" : "Add Contact"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowDialog(false)}
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
