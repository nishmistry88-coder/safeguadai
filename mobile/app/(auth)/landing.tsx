import { View, Text, Image, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_safeguard-app-66/artifacts/kzx2mwxf_project%20logo.png";

const features = [
  {
    icon: "shield-checkmark",
    title: "Instant SOS",
    description: "One-tap emergency alert with location sharing",
  },
  {
    icon: "mic",
    title: "AI Threat Detection",
    description: "Real-time audio analysis in 50+ languages",
  },
  {
    icon: "call",
    title: "Fake Call",
    description: "Escape uncomfortable situations discreetly",
  },
  {
    icon: "location",
    title: "Journey Sharing",
    description: "Share your live location with trusted contacts",
  },
];

export default function LandingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <View className="flex-row items-center gap-3">
            <Image
              source={{ uri: LOGO_URL }}
              className="w-10 h-10"
              resizeMode="contain"
              style={{ tintColor: '#fff' }}
            />
            <Text className="text-xl font-bold text-white">SafeGuard AI</Text>
          </View>
          <Link href="/(auth)/login" asChild>
            <Pressable className="px-4 py-2 rounded-lg border border-zinc-700">
              <Text className="text-zinc-300">Sign In</Text>
            </Pressable>
          </Link>
        </View>

        {/* Hero Section */}
        <View className="px-6 py-12">
          <Text className="text-violet-400 font-medium mb-2">
            Your Voice. Your Safety. Your Control.
          </Text>
          <Text className="text-4xl font-black text-white mb-2">
            Your Safety,
          </Text>
          <Text className="text-4xl font-black text-red-500 mb-6">
            Always On.
          </Text>
          <Text className="text-zinc-400 text-lg leading-relaxed mb-8">
            AI-powered personal safety app that listens for threats in any language
            and alerts your emergency contacts instantly.
          </Text>

          <View className="flex-row gap-4">
            <Pressable
              onPress={() => router.push("/(auth)/register")}
              className="flex-1 bg-red-500 py-4 rounded-xl items-center"
              style={{
                shadowColor: '#ef4444',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Text className="text-white font-bold text-lg">Get Protected</Text>
            </Pressable>
          </View>
        </View>

        {/* Features */}
        <View className="px-6 pb-12">
          <Text className="text-2xl font-black text-white mb-2">
            Protection That Never Sleeps
          </Text>
          <Text className="text-zinc-400 mb-6">
            Advanced AI technology working around the clock
          </Text>

          <View className="gap-4">
            {features.map((feature, index) => (
              <View
                key={index}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-row items-start gap-4"
              >
                <View className="w-12 h-12 rounded-lg bg-violet-500/20 items-center justify-center">
                  <Ionicons name={feature.icon as any} size={24} color="#8b5cf6" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg mb-1">
                    {feature.title}
                  </Text>
                  <Text className="text-zinc-400">{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View className="px-6 pb-12">
          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 items-center">
            <View className="w-20 h-20 rounded-full bg-zinc-800 items-center justify-center mb-4">
              <Image
                source={{ uri: LOGO_URL }}
                className="w-14 h-14"
                resizeMode="contain"
                style={{ tintColor: '#fff' }}
              />
            </View>
            <Text className="text-2xl font-black text-white text-center mb-2">
              Start Feeling Safe Today
            </Text>
            <Text className="text-zinc-400 text-center mb-6">
              Join thousands of women who trust SafeGuard AI
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/register")}
              className="bg-red-500 px-8 py-4 rounded-xl"
            >
              <Text className="text-white font-bold text-lg">Create Free Account</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View className="px-6 pb-8 items-center">
          <Text className="text-zinc-600 text-sm">SafeGuard AI © 2024</Text>
          <Text className="text-zinc-700 text-xs mt-1">
            Your Voice. Your Safety. Your Control.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
