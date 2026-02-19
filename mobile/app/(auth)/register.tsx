import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_safeguard-app-66/artifacts/kzx2mwxf_project%20logo.png";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      router.replace("/(tabs)/dashboard");
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "Please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center gap-4 px-6 py-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#a1a1aa" />
            </Pressable>
            <View className="flex-row items-center gap-3">
              <Image
                source={{ uri: LOGO_URL }}
                className="w-8 h-8"
                resizeMode="contain"
                style={{ tintColor: '#fff' }}
              />
              <Text className="text-lg font-bold text-white">SafeGuard AI</Text>
            </View>
          </View>

          {/* Form */}
          <View className="flex-1 justify-center px-6 pb-12">
            <Text className="text-3xl font-black text-white text-center mb-2">
              Create Account
            </Text>
            <Text className="text-zinc-400 text-center mb-8">
              Start your journey to safer travels
            </Text>

            <View className="gap-4">
              {/* Name */}
              <View>
                <Text className="text-zinc-300 mb-2">Full Name</Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4">
                  <Ionicons name="person-outline" size={20} color="#71717a" />
                  <TextInput
                    className="flex-1 py-4 px-3 text-white"
                    placeholder="Your name"
                    placeholderTextColor="#52525b"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              {/* Email */}
              <View>
                <Text className="text-zinc-300 mb-2">Email</Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4">
                  <Ionicons name="mail-outline" size={20} color="#71717a" />
                  <TextInput
                    className="flex-1 py-4 px-3 text-white"
                    placeholder="you@example.com"
                    placeholderTextColor="#52525b"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Password */}
              <View>
                <Text className="text-zinc-300 mb-2">Password</Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4">
                  <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                  <TextInput
                    className="flex-1 py-4 px-3 text-white"
                    placeholder="••••••••"
                    placeholderTextColor="#52525b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#71717a"
                    />
                  </Pressable>
                </View>
                <Text className="text-zinc-500 text-xs mt-1">Minimum 6 characters</Text>
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleRegister}
                disabled={loading}
                className="bg-red-500 py-4 rounded-xl items-center mt-4"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-lg">Create Account</Text>
                )}
              </Pressable>
            </View>

            <Text className="text-zinc-500 text-center mt-6">
              Already have an account?{" "}
              <Link href="/(auth)/login" asChild>
                <Text className="text-violet-400 font-medium">Sign in</Text>
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
