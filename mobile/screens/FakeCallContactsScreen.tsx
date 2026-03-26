import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";

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

export default function FakeCallContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");

  const loadContacts = async () => {
    const data = await api.getFakeCallContacts(); // <-- your API method
    setContacts(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    Alert.alert("Delete Fake Caller", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.deleteFakeCallContact(id);
          loadContacts();
        },
      },
    ]);
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => handleDelete(id)}
    >
      <Ionicons name="trash" size={24} color="#fff" />
    </TouchableOpacity>
  );

  const renderLeftActions = (item: any) => (
    <TouchableOpacity
      style={styles.editButton}
      onPress={() =>
        navigation.navigate("FakeCallDetails", { contactId: item._id })
      }
    >
      <Ionicons name="create" size={24} color="#fff" />
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    const initials = item.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item._id)}
        renderLeftActions={() => renderLeftActions(item)}
      >
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            navigation.navigate("FakeCallDetails", { contactId: item._id })
          }
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: getAvatarColor(item.name) },
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#999" />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search fake callers..."
        placeholderTextColor="#999"
        style={styles.search}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Floating Add Contact Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddFakeCallContact")}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },

  search: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },

  name: { fontSize: 17, fontWeight: "600", color: "#333" },
  phone: { fontSize: 14, color: "#666" },

  deleteButton: {
    backgroundColor: "#E74C3C",
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    borderRadius: 12,
    marginVertical: 5,
  },

  editButton: {
    backgroundColor: "#3498DB",
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    borderRadius: 12,
    marginVertical: 5,
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#6C63FF",
    width: 60,
    height: 60,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});