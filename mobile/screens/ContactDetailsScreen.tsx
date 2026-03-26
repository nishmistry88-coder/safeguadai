import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";   // correct import

const pastelColors = [
  "#A3D8F4",
  "#F7C8E0",
  "#C8F7DC",
  "#FDE2B3",
  "#D7C8F7",
  "#B8E8D1",
];

const getAvatarColor = (name: string) => {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return pastelColors[sum % pastelColors.length];
};

export default function ContactDetailsScreen({ route, navigation }) {
  const { contactId } = route.params;
  const [contact, setContact] = useState(null);

  const loadContact = async () => {
    const data = await api.getContactById(contactId);   // ✅ FIXED
    setContact(data);
  };

  useEffect(() => {
    loadContact();
  }, []);

  if (!contact) return null;

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handlePrimaryToggle = async (value: boolean) => {
    await api.updateContact(contactId, { is_primary: value });   // ✅ FIXED
    loadContact();
  };

  const handleDelete = () => {
    Alert.alert("Delete Contact", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.deleteContact(contactId);   // ✅ FIXED
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: getAvatarColor(contact.name) },
        ]}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <Text style={styles.name}>
        {contact.name} {contact.is_primary ? "⭐" : ""}
      </Text>
      <Text style={styles.phone}>{contact.phone}</Text>
      <Text style={styles.relationship}>{contact.relationship}</Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Primary Contact</Text>
        <Switch
          value={contact.is_primary}
          onValueChange={handlePrimaryToggle}
        />
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() =>
          navigation.navigate("EditContact", { contactId })
        }
      >
        <Ionicons name="create" size={20} color="#fff" />
        <Text style={styles.editText}>Edit Contact</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash" size={20} color="#fff" />
        <Text style={styles.deleteText}>Delete Contact</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: 40 },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 110,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  avatarText: { fontSize: 40, fontWeight: "700", color: "#333" },

  name: { fontSize: 26, fontWeight: "700", marginTop: 10 },
  phone: { fontSize: 18, color: "#555", marginTop: 4 },
  relationship: { fontSize: 16, color: "#777", marginTop: 2 },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 30,
    alignItems: "center",
  },

  toggleLabel: { fontSize: 18, fontWeight: "600" },

  editButton: {
    flexDirection: "row",
    backgroundColor: "#3498DB",
    padding: 14,
    borderRadius: 10,
    marginTop: 40,
    width: "80%",
    justifyContent: "center",
    alignItems: "center",
  },

  editText: { color: "#fff", fontSize: 16, marginLeft: 8 },

  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#E74C3C",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    width: "80%",
    justifyContent: "center",
    alignItems: "center",
  },

  deleteText: { color: "#fff", fontSize: 16, marginLeft: 8 },
});