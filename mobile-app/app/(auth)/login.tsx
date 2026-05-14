import React, { useState } from "react"; // 1. Added useState
import { router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert, // 2. Added Alert for errors
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage'; // To save the login token

export default function LoginScreen() {
  // 3. State for inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 1. Basic validation
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true); // Show the "Connecting..." spinner
    try {
      const response = await fetch("https://safeguadai.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          // 2. Clean the email to prevent "Incorrect Password" errors
          email: email.toLowerCase().trim(), 
          password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 3. Save the token and go to the home screen
        await AsyncStorage.setItem("userToken", data.access_token);
        router.replace("/(tabs)/home");
      } else {
        // 4. Handle errors from the backend (like 401 Unauthorized)
        Alert.alert("Login Failed", data.detail || "Invalid email or password");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Could not connect to SafeGuard servers. Check your internet.");
    } finally {
      setLoading(false); // Hide the spinner
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>SafeGuard AI</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor="#6B7280"
          style={styles.input}
          autoCapitalize="none" // Important for emails
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
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Connecting..." : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
          <Text style={styles.linkText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050814",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
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
    backgroundColor: "#0B1020",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  label: {
    color: "#D1D5DB",
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#020617",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#111827",
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#F9FAFB",
    fontWeight: "600",
    fontSize: 15,
  },
  linkText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 14,
    fontSize: 13,
  },
});