import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { FloatingAssistant } from "../components/FloatingAssistant";

export default function RootLayout() {
  return (
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
      <FloatingAssistant />
    </View>
  );
}