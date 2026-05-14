import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { FloatingAssistant } from "../components/FloatingAssistant";
// 🛡️ 1. Import the provider you just created
import { AuthProvider } from "../contexts/AuthContext"; 

export default function RootLayout() {
  return (
    // 🛡️ 2. Wrap everything in the AuthProvider
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: "#050814" }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#050814" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        
        {/* 🛡️ Because this is inside AuthProvider, the Orb can now access 'user.email' */}
        <FloatingAssistant />
      </View>
    </AuthProvider>
  );
}