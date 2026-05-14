import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

export default function TabsLayout() {
  const headerRight = () => (
    <TouchableOpacity
      style={{ marginRight: 16 }}
      onPress={() => router.push("/(tabs)/settings")}
    >
      <Ionicons name="settings-outline" size={22} color="#E5E7EB" />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#050814" },
        headerTitleStyle: { color: "#F9FAFB" },
        headerTintColor: "#F9FAFB",
        tabBarStyle: {
          backgroundColor: "#020617",
          borderTopColor: "#111827",
        },
        tabBarActiveTintColor: "#7C3AED",
        tabBarInactiveTintColor: "#6B7280",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerTitle: "SafeGuard AI",
          headerRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: "Emergency",
          headerTitle: "Emergency",
          headerRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gom"
        options={{
          title: "GOM",
          headerTitle: "Going Out Mode",
          headerRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="walk-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journeys"
        options={{
          title: "Journeys",
          headerTitle: "Journeys",
          headerRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          headerTitle: "Contacts",
          headerRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // hidden from tab bar
          title: "Settings",
          headerTitle: "Settings",
        }}
      />
    </Tabs>
  );
}
