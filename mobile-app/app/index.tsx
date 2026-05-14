import { useEffect } from "react";
import { router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext"; // 🛡️ Hook into your new Brain
import "../utils/backgroundLocation";

export default function Index() {
  const { user, loading } = useAuth(); // 🛡️ Get the login status and loading state

  useEffect(() => {
    // Wait until the AuthProvider has finished checking AsyncStorage
    if (!loading) {
      if (user) {
        // 🚀 User is already logged in! Send them to the app.
        router.replace("/(tabs)/dashboard");
      } else {
        // 🔒 No user found. Send them to login.
        router.replace("/(auth)/landing"); 
      }
    }
  }, [user, loading]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050814",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* This spinner stays visible while the app "decides" where to send you */}
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}