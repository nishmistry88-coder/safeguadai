import { View, Text, Image, ScrollView, Pressable, ImageBackground, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f5939225-27b2-488c-ba98-856ce900c22c/artifacts/u4rcyto1_real%20logo.png";
const CITY_BG = "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80";

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
    <View className="flex-1 bg-zinc-950">
      <ImageBackground
        source={{ uri: CITY_BG }}
        className="flex-1"
        resizeMode="cover"
      >
        {/* Purple gradient overlay */}
        <LinearGradient
          colors={['rgba(88, 28, 135, 0.85)', 'rgba(15, 23, 42, 0.95)', 'rgba(9, 9, 11, 1)']}
          locations={[0, 0.5, 1]}
          className="flex-1"
        >
          <SafeAreaView className="flex-1">
            <ScrollView 
              className="flex-1" 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Header with Logo */}
              <View className="px-6 pt-4 pb-8">
                <View className="flex-row items-center gap-3">
                  <Image
                    source={{ uri: LOGO_URL }}
                    className="w-14 h-14"
                    resizeMode="contain"
                  />
                  <View>
                    <Text className="text-xl font-bold text-violet-400 tracking-wider">
                      SAFEGUARD AI
                    </Text>
                    <Text className="text-xs text-violet-300/70 tracking-widest">
                      YOUR VOICE. YOUR SAFETY.{'\n'}YOUR CONTROL.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Hero Section */}
              <View className="px-6 py-8">
                <Text 
                  className="text-5xl text-white mb-1"
                  style={{ fontFamily: 'System', fontWeight: '900', fontStyle: 'italic' }}
                >
                  Your Safety,
                </Text>
                <Text 
                  className="text-5xl mb-6"
                  style={{ 
                    fontFamily: 'System', 
                    fontWeight: '900', 
                    fontStyle: 'italic',
                    color: '#f43f5e' 
                  }}
                >
                  Always On.
                </Text>
                
                <Text className="text-lg text-zinc-300 leading-7 mb-10">
                  AI-powered personal safety app that listens for threats in any language and alerts your emergency contacts instantly.
                </Text>

                {/* CTA Buttons */}
                <Pressable
                  onPress={() => router.push("/(auth)/register")}
                  className="py-5 rounded-2xl items-center mb-4"
                  style={{
                    backgroundColor: '#f43f5e',
                    shadowColor: '#f43f5e',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 15,
                    elevation: 8,
                  }}
                  data-testid="get-protected-btn"
                >
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white font-bold text-lg">Get Protected</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </View>
                </Pressable>

                <Link href="/(auth)/login" asChild>
                  <Pressable 
                    className="py-5 rounded-2xl items-center border border-zinc-600 bg-zinc-900/60"
                    data-testid="learn-more-btn"
                  >
                    <Text className="text-white font-bold text-lg">Learn More</Text>
                  </Pressable>
                </Link>
              </View>

              {/* Features Section */}
              <View className="px-6 py-8">
                <Text 
                  className="text-2xl text-white mb-2"
                  style={{ fontWeight: '900' }}
                >
                  Protection That Never Sleeps
                </Text>
                <Text className="text-zinc-400 mb-6">
                  Advanced AI technology working around the clock
                </Text>

                <View className="gap-4">
                  {features.map((feature, index) => (
                    <View
                      key={index}
                      className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-5 flex-row items-start gap-4"
                      style={{
                        shadowColor: '#8b5cf6',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                      }}
                    >
                      <View className="w-12 h-12 rounded-xl bg-violet-500/20 items-center justify-center">
                        <Ionicons name={feature.icon as any} size={24} color="#a78bfa" />
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

              {/* Bottom CTA */}
              <View className="px-6 py-8">
                <View className="bg-zinc-900/80 border border-zinc-800/50 rounded-3xl p-8 items-center">
                  <Image
                    source={{ uri: LOGO_URL }}
                    className="w-20 h-20 mb-4"
                    resizeMode="contain"
                  />
                  <Text 
                    className="text-2xl text-white text-center mb-2"
                    style={{ fontWeight: '900' }}
                  >
                    Start Feeling Safe Today
                  </Text>
                  <Text className="text-zinc-400 text-center mb-6">
                    Join thousands who trust SafeGuard AI
                  </Text>
                  <Pressable
                    onPress={() => router.push("/(auth)/register")}
                    className="px-10 py-4 rounded-2xl"
                    style={{ backgroundColor: '#f43f5e' }}
                  >
                    <Text className="text-white font-bold text-lg">Create Free Account</Text>
                  </Pressable>
                </View>
              </View>

              {/* Footer */}
              <View className="px-6 items-center pb-4">
                <Text className="text-zinc-600 text-sm">SafeGuard AI © 2024</Text>
                <Text className="text-violet-400/50 text-xs mt-1 tracking-wider">
                  YOUR VOICE. YOUR SAFETY. YOUR CONTROL.
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
