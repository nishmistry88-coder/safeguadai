import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function AddContactScreen({ navigation }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSave = () => {
    // For now, just navigate back.
    // Later we can store the contact in backend or AsyncStorage.
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Contact</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter name"
          placeholderTextColor="#777"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          placeholderTextColor="#777"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,
          !(name && phone) && { opacity: 0.4 },
        ]}
        disabled={!(name && phone)}
        onPress={handleSave}
      >
        <Text style={styles.saveText}>Save Contact</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050509",
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 40,
    marginBottom: 30,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#bbb",
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#151522",
    padding: 14,
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#6A4DF5",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 30,
  },
  saveText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});