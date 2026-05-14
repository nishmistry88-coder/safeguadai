import React, { useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";

export default function SignupScreen() {
  // 1. State for user details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // Basic validation
    if (!name || !email || !password) {
      Alert.alert("Missing Info", "Please fill in all fields to join SafeGuard.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://safeguadai.onrender.com/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name, // Matches your Pydantic model in FastAPI
          email: email.toLowerCase().trim(), 
          password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Account Created", 
          "Welcome to SafeGuard AI. Please log in to continue.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      } else {
        // Handle case where email is already taken
        Alert.alert("Signup Failed", data.detail || "Could not create account.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Connection Error", "Check your internet or Render backend status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join SafeGuard AI</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Full name"
          placeholderTextColor="#6B7280"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor="#6B7280"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor="#6B7280"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#F9FAFB" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050814", // Dark navy cinematic background
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F9FAFB",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#0B1020", // Slightly lighter navy for the card
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2937", // Dark border for "Glass" effect
  },
  label: {
    color: "#D1D5DB",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#020617", // Deepest navy for input fields
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#111827",
  },
  primaryButton: {
    backgroundColor: "#7C3AED", // Your signature SafeGuard Purple
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    // Subtle glow effect
    shadowColor: "#7C3AED",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonText: {
    color: "#F9FAFB",
    fontWeight: "700",
    fontSize: 16,
  },
  linkText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 18,
    fontSize: 13,
  },
});