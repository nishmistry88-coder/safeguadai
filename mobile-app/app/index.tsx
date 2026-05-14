import { useEffect } from "react";
import { router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import "../utils/backgroundLocation";

export default function Index() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(auth)/login");
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050814",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}
