import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f5939225-27b2-488c-ba98-856ce900c22c/artifacts/u4rcyto1_real%20logo.png";
const CITY_BG = "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)/dashboard");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-950">
      <ImageBackground
        source={{ uri: CITY_BG }}
        className="flex-1"
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(88, 28, 135, 0.9)', 'rgba(15, 23, 42, 0.95)', 'rgba(9, 9, 11, 1)']}
          locations={[0, 0.4, 0.8]}
          className="flex-1"
        >
          <SafeAreaView className="flex-1">
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
                    className="w-12 h-12 rounded-xl bg-zinc-900/60 border border-zinc-700/50 items-center justify-center"
                  >
                    <Ionicons name="arrow-back" size={22} color="#a1a1aa" />
                  </Pressable>
                  <View className="flex-row items-center gap-3">
                    <Image
                      source={{ uri: LOGO_URL }}
                      className="w-10 h-10"
                      resizeMode="contain"
                    />
                    <Text className="text-lg font-bold text-violet-400">SafeGuard AI</Text>
                  </View>
                </View>

                {/* Form */}
                <View className="flex-1 justify-center px-6 pb-12">
                  <Text 
                    className="text-4xl text-white text-center mb-2"
                    style={{ fontWeight: '900', fontStyle: 'italic' }}
                  >
                    Welcome Back
                  </Text>
                  <Text className="text-zinc-400 text-center mb-10">
                    Sign in to access your safety dashboard
                  </Text>

                  <View className="gap-5">
                    {/* Email */}
                    <View>
                      <Text className="text-zinc-300 mb-2 font-medium">Email</Text>
                      <View className="flex-row items-center bg-zinc-900/70 border border-zinc-700/50 rounded-2xl px-4">
                        <Ionicons name="mail-outline" size={20} color="#8b5cf6" />
                        <TextInput
                          className="flex-1 py-4 px-3 text-white text-base"
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
                      <Text className="text-zinc-300 mb-2 font-medium">Password</Text>
                      <View className="flex-row items-center bg-zinc-900/70 border border-zinc-700/50 rounded-2xl px-4">
                        <Ionicons name="lock-closed-outline" size={20} color="#8b5cf6" />
                        <TextInput
                          className="flex-1 py-4 px-3 text-white text-base"
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
                    </View>

                    {/* Submit */}
                    <Pressable
                      onPress={handleLogin}
                      disabled={loading}
                      className="py-5 rounded-2xl items-center mt-4"
                      style={{ 
                        backgroundColor: '#f43f5e',
                        opacity: loading ? 0.7 : 1,
                        shadowColor: '#f43f5e',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 15,
                        elevation: 8,
                      }}
                      data-testid="login-btn"
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-bold text-lg">Sign In</Text>
                      )}
                    </Pressable>
                  </View>

                  <Text className="text-zinc-500 text-center mt-8">
                    Don't have an account?{" "}
                    <Link href="/(auth)/register" asChild>
                      <Text className="text-violet-400 font-bold">Create one</Text>
                    </Link>
                  </Text>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
