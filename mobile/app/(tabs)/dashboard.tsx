import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { locationService } from "@/services/locationService";
import * as Battery from 'expo-battery';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f5939225-27b2-488c-ba98-856ce900c22c/artifacts/u4rcyto1_real%20logo.png";
const CITY_BG = "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80";

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
    <View className="flex-1 bg-zinc-950">
      <ImageBackground
        source={{ uri: CITY_BG }}
        className="flex-1"
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(88, 28, 135, 0.7)', 'rgba(15, 23, 42, 0.9)', 'rgba(9, 9, 11, 0.98)']}
          locations={[0, 0.3, 0.6]}
          className="flex-1"
        >
          <SafeAreaView className="flex-1" edges={['top']}>
            <ScrollView
              className="flex-1 px-6"
              contentContainerStyle={{ paddingBottom: 120 }}
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
                <View className="flex-row items-center gap-3">
                  <Image
                    source={{ uri: LOGO_URL }}
                    className="w-10 h-10"
                    resizeMode="contain"
                  />
                  <View>
                    <Text 
                      className="text-2xl text-white"
                      style={{ fontWeight: '900' }}
                    >
                      Hi, {user?.name?.split(' ')[0]}
                    </Text>
                    <Text className="text-violet-300/70 text-sm">Stay safe out there</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="flex-row items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-700/50">
                    <Ionicons
                      name={isCharging ? "battery-charging" : "battery-half"}
                      size={16}
                      color={getBatteryColor()}
                    />
                    <Text style={{ color: getBatteryColor(), fontSize: 12, fontWeight: '600' }}>
                      {batteryLevel}%
                    </Text>
                  </View>
                  <Pressable className="w-11 h-11 rounded-xl bg-zinc-900/60 border border-zinc-700/50 items-center justify-center">
                    <Ionicons name="notifications-outline" size={20} color="#a78bfa" />
                  </Pressable>
                </View>
              </View>

              {/* Going Out Mode Banner */}
              {goingOutSession && (
                <Pressable
                  onPress={() => router.push('/(tabs)/going-out')}
                  className="bg-violet-500/20 border border-violet-500/40 rounded-2xl p-4 mb-4 flex-row items-center"
                >
                  <View className="w-12 h-12 rounded-xl bg-violet-500/30 items-center justify-center mr-4">
                    <Ionicons name="shield-checkmark" size={24} color="#a78bfa" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-violet-300 font-bold text-lg">Going Out Mode Active</Text>
                    <Text className="text-violet-400/60 text-sm capitalize">
                      {goingOutSession.preset} • Protected
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#a78bfa" />
                </Pressable>
              )}

              {/* Battery Warning */}
              {batteryLevel < 20 && !isCharging && (
                <View className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
                  <Ionicons name="battery-dead" size={22} color="#f59e0b" />
                  <Text className="text-amber-400 text-sm flex-1">
                    Low battery ({batteryLevel}%). Consider charging soon.
                  </Text>
                </View>
              )}

              {/* Status Card */}
              <View className="bg-zinc-900/70 border border-emerald-500/40 rounded-2xl p-6 mb-6">
                <View className="flex-row items-center gap-4">
                  <View
                    className="w-16 h-16 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: `${getThreatColor()}25` }}
                  >
                    <Ionicons
                      name={threatStatus === 'safe' ? 'checkmark-circle' : 'warning'}
                      size={32}
                      color={getThreatColor()}
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-zinc-400 mb-1">Current Status</Text>
                    <Text
                      className="text-2xl capitalize"
                      style={{ color: getThreatColor(), fontWeight: '900' }}
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
                  className="flex-1 rounded-2xl p-6 items-center"
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(244, 63, 94, 0.4)',
                  }}
                >
                  <View 
                    className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
                    style={{ backgroundColor: 'rgba(244, 63, 94, 0.25)' }}
                  >
                    <Ionicons name="warning" size={32} color="#f43f5e" />
                  </View>
                  <Text style={{ color: '#f43f5e', fontWeight: '900', fontSize: 18 }}>SOS</Text>
                  <Text className="text-zinc-500 text-xs mt-1">Emergency Alert</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(tabs)/going-out')}
                  className="flex-1 bg-violet-500/15 border border-violet-500/40 rounded-2xl p-6 items-center"
                >
                  <View className="w-16 h-16 rounded-2xl bg-violet-500/25 items-center justify-center mb-3">
                    <Ionicons name="shield-checkmark" size={32} color="#a78bfa" />
                  </View>
                  <Text className="text-violet-400 text-lg" style={{ fontWeight: '900' }}>Going Out</Text>
                  <Text className="text-zinc-500 text-xs mt-1">Safety Mode</Text>
                </Pressable>
              </View>

              {/* Location Card */}
              {location && (
                <View className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-4 mb-6 flex-row items-center gap-4">
                  <View className="w-12 h-12 rounded-xl bg-violet-500/20 items-center justify-center">
                    <Ionicons name="location" size={22} color="#a78bfa" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-zinc-400">Current Location</Text>
                    <Text className="text-xs text-zinc-500 mt-1">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Text>
                  </View>
                  <View className="w-3 h-3 rounded-full bg-emerald-500" />
                </View>
              )}

              {/* Emergency Contacts */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl text-white" style={{ fontWeight: '900' }}>
                    Emergency Contacts
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/contacts' as any)}
                    className="flex-row items-center"
                  >
                    <Text className="text-sm text-violet-400 font-medium">View All</Text>
                    <Ionicons name="chevron-forward" size={16} color="#a78bfa" />
                  </Pressable>
                </View>

                {contacts.length === 0 ? (
                  <View className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-8 items-center">
                    <Text className="text-zinc-500 mb-4">No emergency contacts yet</Text>
                    <Pressable
                      onPress={() => router.push('/(tabs)/contacts' as any)}
                      className="border border-violet-500/50 px-6 py-3 rounded-xl"
                    >
                      <Text className="text-violet-400 font-medium">Add Contact</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="gap-3">
                    {contacts.slice(0, 3).map((contact) => (
                      <View
                        key={contact.id}
                        className="bg-zinc-900/70 border border-zinc-700/50 rounded-2xl p-4 flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center gap-4">
                          <View className="w-12 h-12 rounded-xl bg-violet-500/20 items-center justify-center">
                            <Text className="text-violet-400 font-bold text-lg">
                              {contact.name.charAt(0)}
                            </Text>
                          </View>
                          <View>
                            <Text className="text-white font-bold">{contact.name}</Text>
                            <Text className="text-xs text-zinc-500 capitalize">{contact.relationship}</Text>
                          </View>
                        </View>
                        {contact.is_primary && (
                          <View className="bg-violet-500/25 px-3 py-1 rounded-lg">
                            <Text className="text-xs text-violet-400 font-medium">Primary</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
