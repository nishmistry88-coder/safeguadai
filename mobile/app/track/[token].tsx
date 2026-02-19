import { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface JourneyLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  battery_level?: number;
}

interface JourneyData {
  user_name: string;
  preset: string;
  is_active: boolean;
  started_at: string;
  expires_at: string;
  latest_location?: JourneyLocation;
  location_history: JourneyLocation[];
}

const API_BASE_URL = "https://sos-mobile-1.preview.emergentagent.com/api";

export default function TrackScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchJourney();
      // Refresh every 30 seconds
      const interval = setInterval(fetchJourney, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchJourney = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/journey/track/${token}`);
      
      if (response.ok) {
        const data = await response.json();
        setJourney(data);
        setError(null);
      } else if (response.status === 404) {
        setError("Journey not found or has expired");
      } else {
        setError("Failed to load journey");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const getTimeSinceUpdate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}min ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const openInMaps = () => {
    if (journey?.latest_location) {
      const { latitude, longitude } = journey.latest_location;
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-zinc-400 mt-4">Loading journey...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-red-500/20 items-center justify-center mb-4">
          <Ionicons name="alert-circle" size={40} color="#ef4444" />
        </View>
        <Text className="text-white text-xl font-bold mb-2">Oops!</Text>
        <Text className="text-zinc-400 text-center">{error}</Text>
      </SafeAreaView>
    );
  }

  if (!journey) {
    return null;
  }

  const isExpired = new Date(journey.expires_at) < new Date();
  const isInactive = !journey.is_active || isExpired;

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top"]}>
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="items-center py-8">
          <View className="w-20 h-20 rounded-full bg-violet-500/20 items-center justify-center mb-4">
            <Ionicons name="location" size={40} color="#8b5cf6" />
          </View>
          <Text className="text-2xl font-black text-white text-center">
            {journey.user_name}'s Journey
          </Text>
          <Text className="text-zinc-400 capitalize">{journey.preset || "General"}</Text>
        </View>

        {/* Status Card */}
        <View
          className={`border rounded-xl p-6 mb-6 ${
            isInactive
              ? "bg-red-500/10 border-red-500/30"
              : "bg-emerald-500/10 border-emerald-500/30"
          }`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  isInactive ? "bg-red-500/20" : "bg-emerald-500/20"
                }`}
              >
                <Ionicons
                  name={isInactive ? "close-circle" : "checkmark-circle"}
                  size={24}
                  color={isInactive ? "#ef4444" : "#10b981"}
                />
              </View>
              <View>
                <Text className={isInactive ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                  {isInactive ? "Journey Ended" : "Journey Active"}
                </Text>
                <Text className="text-zinc-500 text-xs">
                  {isInactive
                    ? isExpired
                      ? "Link has expired"
                      : "User ended the journey"
                    : "Live tracking enabled"}
                </Text>
              </View>
            </View>
            {!isInactive && (
              <View className="w-3 h-3 rounded-full bg-emerald-500" />
            )}
          </View>
        </View>

        {/* Latest Location */}
        {journey.latest_location && (
          <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold">Latest Location</Text>
              <Text className="text-zinc-500 text-sm">
                {getTimeSinceUpdate(journey.latest_location.timestamp)}
              </Text>
            </View>

            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-10 h-10 rounded-lg bg-violet-500/10 items-center justify-center">
                <Ionicons name="navigate" size={20} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 text-sm">Coordinates</Text>
                <Text className="text-white">
                  {journey.latest_location.latitude.toFixed(6)},{" "}
                  {journey.latest_location.longitude.toFixed(6)}
                </Text>
              </View>
            </View>

            {journey.latest_location.battery_level !== undefined && (
              <View className="flex-row items-center gap-3 mb-4">
                <View className="w-10 h-10 rounded-lg bg-amber-500/10 items-center justify-center">
                  <Ionicons
                    name="battery-half"
                    size={20}
                    color={
                      journey.latest_location.battery_level < 20
                        ? "#ef4444"
                        : journey.latest_location.battery_level < 50
                        ? "#f59e0b"
                        : "#10b981"
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-zinc-400 text-sm">Battery Level</Text>
                  <Text className="text-white">{journey.latest_location.battery_level}%</Text>
                </View>
              </View>
            )}

            <View
              className="flex-row items-center justify-center gap-2 py-3 bg-violet-500 rounded-xl"
              onTouchEnd={openInMaps}
            >
              <Ionicons name="map" size={18} color="#fff" />
              <Text className="text-white font-medium">Open in Maps</Text>
            </View>
          </View>
        )}

        {/* Journey Info */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <Text className="text-white font-bold mb-4">Journey Details</Text>

          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 rounded-lg bg-zinc-800 items-center justify-center">
              <Ionicons name="time" size={20} color="#a1a1aa" />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-400 text-sm">Started</Text>
              <Text className="text-white">
                {formatDate(journey.started_at)} at {formatTime(journey.started_at)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-lg bg-zinc-800 items-center justify-center">
              <Ionicons name="hourglass" size={20} color="#a1a1aa" />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-400 text-sm">Expires</Text>
              <Text className={isExpired ? "text-red-400" : "text-white"}>
                {formatDate(journey.expires_at)} at {formatTime(journey.expires_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Location History */}
        {journey.location_history && journey.location_history.length > 0 && (
          <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
            <Text className="text-white font-bold mb-4">
              Location History ({journey.location_history.length})
            </Text>

            <View className="gap-3">
              {journey.location_history.slice(0, 10).map((loc, index) => (
                <View
                  key={index}
                  className="flex-row items-center gap-3 py-2 border-b border-zinc-800"
                >
                  <View className="w-2 h-2 rounded-full bg-violet-500" />
                  <View className="flex-1">
                    <Text className="text-zinc-400 text-xs">
                      {formatTime(loc.timestamp)}
                    </Text>
                    <Text className="text-white text-sm">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </Text>
                  </View>
                  {loc.battery_level !== undefined && (
                    <Text className="text-zinc-500 text-xs">{loc.battery_level}%</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SafeGuard Branding */}
        <View className="items-center py-6">
          <Text className="text-zinc-600 text-xs">Powered by</Text>
          <Text className="text-violet-400 font-bold">SafeGuard AI</Text>
          <Text className="text-zinc-700 text-xs mt-1">
            Your Voice. Your Safety. Your Control.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
