import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { locationService } from "@/services/locationService";
import * as Battery from 'expo-battery';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [goingOutSession, setGoingOutSession] = useState<any>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isCharging, setIsCharging] = useState(false);
  const [threatStatus, setThreatStatus] = useState<'safe' | 'low' | 'medium' | 'high'>('safe');

  useEffect(() => {
    loadData();
    loadBattery();
    loadLocation();
  }, []);

  const loadData = async () => {
    try {
      const [contactsData, sessionData] = await Promise.all([
        api.getContacts().catch(() => []),
        api.getActiveGoingOut().catch(() => null),
      ]);
      setContacts(contactsData);
      setGoingOutSession(sessionData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadBattery = async () => {
    try {
      const level = await Battery.getBatteryLevelAsync();
      const state = await Battery.getBatteryStateAsync();
      setBatteryLevel(Math.round(level * 100));
      setIsCharging(state === Battery.BatteryState.CHARGING);
    } catch (error) {
      console.log('Battery API not available');
    }
  };

  const loadLocation = async () => {
    const loc = await locationService.getCurrentLocation();
    if (loc) {
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadBattery(), loadLocation()]);
    setRefreshing(false);
  };

  const getBatteryColor = () => {
    if (batteryLevel < 20) return '#ef4444';
    if (batteryLevel < 50) return '#f59e0b';
    return '#10b981';
  };

  const getThreatColor = () => {
    const colors = {
      safe: '#10b981',
      low: '#84cc16',
      medium: '#f59e0b',
      high: '#ef4444',
    };
    return colors[threatStatus];
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View>
            <Text className="text-2xl font-black text-white">
              Hi, {user?.name?.split(' ')[0]}
            </Text>
            <Text className="text-zinc-500">Stay safe out there</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <Ionicons
                name={isCharging ? "battery-charging" : "battery-half"}
                size={16}
                color={getBatteryColor()}
              />
              <Text style={{ color: getBatteryColor(), fontSize: 12, fontWeight: '600' }}>
                {batteryLevel}%
              </Text>
            </View>
            <Pressable className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center">
              <Ionicons name="notifications-outline" size={20} color="#a1a1aa" />
            </Pressable>
          </View>
        </View>

        {/* Going Out Mode Banner */}
        {goingOutSession && (
          <Pressable
            onPress={() => router.push('/(tabs)/going-out')}
            className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 mb-4 flex-row items-center"
          >
            <View className="w-10 h-10 rounded-full bg-violet-500/20 items-center justify-center mr-3">
              <Ionicons name="shield-checkmark" size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-violet-400 font-bold">Going Out Mode Active</Text>
              <Text className="text-zinc-500 text-xs capitalize">
                {goingOutSession.preset} • Protected
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8b5cf6" />
          </Pressable>
        )}

        {/* Battery Warning */}
        {batteryLevel < 20 && !isCharging && (
          <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex-row items-center gap-3">
            <Ionicons name="battery-dead" size={20} color="#f59e0b" />
            <Text className="text-amber-400 text-sm flex-1">
              Low battery ({batteryLevel}%). Consider charging soon.
            </Text>
          </View>
        )}

        {/* Status Card */}
        <View className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-6 mb-4">
          <View className="flex-row items-center gap-4">
            <View
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: `${getThreatColor()}20` }}
            >
              <Ionicons
                name={threatStatus === 'safe' ? 'checkmark-circle' : 'warning'}
                size={28}
                color={getThreatColor()}
              />
            </View>
            <View>
              <Text className="text-sm text-zinc-400">Current Status</Text>
              <Text
                className="text-xl font-bold capitalize"
                style={{ color: getThreatColor() }}
              >
                {threatStatus === 'safe' ? 'All Clear' : `${threatStatus} Risk`}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-4 mb-6">
          <Pressable
            onPress={() => router.push('/(tabs)/sos')}
            className="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl p-6 items-center"
          >
            <Ionicons name="warning" size={32} color="#ef4444" />
            <Text className="text-lg font-bold text-red-500 mt-2">SOS</Text>
            <Text className="text-xs text-zinc-500">Emergency Alert</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/going-out')}
            className="flex-1 bg-violet-500/10 border border-violet-500/30 rounded-xl p-6 items-center"
          >
            <Ionicons name="shield-checkmark" size={32} color="#8b5cf6" />
            <Text className="text-lg font-bold text-violet-500 mt-2">Going Out</Text>
            <Text className="text-xs text-zinc-500">Safety Mode</Text>
          </Pressable>
        </View>

        {/* Location Card */}
        {location && (
          <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-lg bg-violet-500/10 items-center justify-center">
              <Ionicons name="location" size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-zinc-400">Current Location</Text>
              <Text className="text-xs text-zinc-500">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
          </View>
        )}

        {/* Emergency Contacts */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-white">Emergency Contacts</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              className="flex-row items-center"
            >
              <Text className="text-sm text-violet-400">View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#8b5cf6" />
            </Pressable>
          </View>

          {contacts.length === 0 ? (
            <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 items-center">
              <Text className="text-zinc-500 mb-3">No emergency contacts yet</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/settings')}
                className="border border-zinc-700 px-4 py-2 rounded-lg"
              >
                <Text className="text-zinc-300">Add Contact</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2">
              {contacts.slice(0, 3).map((contact) => (
                <View
                  key={contact.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center">
                      <Text className="text-zinc-400 font-medium">
                        {contact.name.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white font-medium">{contact.name}</Text>
                      <Text className="text-xs text-zinc-500">{contact.relationship}</Text>
                    </View>
                  </View>
                  {contact.is_primary && (
                    <View className="bg-violet-500/20 px-2 py-1 rounded">
                      <Text className="text-xs text-violet-400">Primary</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
