import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Battery, Clock, Shield, User, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export const TrackJourney = () => {
  const { shareToken } = useParams();
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchJourney();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchJourney, 30000);
    return () => clearInterval(interval);
  }, [shareToken]);

  const fetchJourney = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/journey/track/${shareToken}`);
      if (response.ok) {
        const data = await response.json();
        setJourney(data);
        setLastUpdate(new Date());
        setError(null);
      } else if (response.status === 404) {
        setError("Journey not found or link has expired");
      } else {
        setError("Failed to load journey");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "Unknown";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Unknown";
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getTimeSince = (isoString) => {
    if (!isoString) return "Unknown";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(isoString);
  };

  const getBatteryColor = (level) => {
    if (!level) return "text-zinc-500";
    if (level < 20) return "text-red-500";
    if (level < 50) return "text-amber-500";
    return "text-emerald-500";
  };

  const openInMaps = () => {
    if (journey?.current_latitude && journey?.current_longitude) {
      const url = `https://www.google.com/maps?q=${journey.current_latitude},${journey.current_longitude}`;
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-zinc-50 mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Journey Not Found
          </h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6" data-testid="track-journey-page">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-violet-500" />
          <span className="text-lg font-bold text-zinc-50" style={{ fontFamily: 'Chivo, sans-serif' }}>
            SafeGuard
          </span>
        </div>
        <h1 className="text-2xl font-black text-zinc-50 tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Live Journey Tracking
        </h1>
      </div>

      {/* User Info */}
      <Card className={`border ${journey?.is_active ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-900'} mb-6`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <motion.div
              animate={journey?.is_active ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-16 h-16 rounded-full ${journey?.is_active ? 'bg-emerald-500/20' : 'bg-zinc-800'} flex items-center justify-center`}
            >
              <User className={`w-8 h-8 ${journey?.is_active ? 'text-emerald-500' : 'text-zinc-500'}`} />
            </motion.div>
            <div>
              <p className="text-xl font-bold text-zinc-50">{journey?.user_name}</p>
              <p className={`text-sm ${journey?.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {journey?.is_active ? 'Currently sharing location' : 'Journey ended'}
              </p>
              {journey?.preset && (
                <p className="text-xs text-zinc-500 capitalize mt-1">Mode: {journey.preset}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Card */}
      {journey?.current_latitude && journey?.current_longitude ? (
        <Card 
          className="border border-zinc-800 bg-zinc-900 mb-6 cursor-pointer hover:border-zinc-700 transition-colors"
          onClick={openInMaps}
          data-testid="location-card"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="text-zinc-50 font-bold">Current Location</p>
                <p className="text-zinc-500 text-sm">Tap to open in Google Maps</p>
              </div>
              {journey?.is_active && (
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              )}
            </div>
            
            {/* Map Preview Placeholder */}
            <div className="w-full h-48 rounded-xl bg-zinc-800 flex items-center justify-center mb-4 map-placeholder">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-violet-500 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">
                  {journey.current_latitude.toFixed(6)}, {journey.current_longitude.toFixed(6)}
                </p>
              </div>
            </div>
            
            <p className="text-center text-violet-400 text-sm font-medium">
              Tap to view on map →
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-zinc-800 bg-zinc-900 mb-6">
          <CardContent className="p-6 text-center">
            <MapPin className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-500">Location not yet shared</p>
          </CardContent>
        </Card>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-4 text-center">
            <Battery className={`w-6 h-6 mx-auto mb-2 ${getBatteryColor(journey?.battery_level)}`} />
            <p className="text-zinc-50 font-bold">
              {journey?.battery_level ? `${journey.battery_level}%` : '--'}
            </p>
            <p className="text-zinc-500 text-xs">Battery</p>
          </CardContent>
        </Card>
        
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-violet-500 mx-auto mb-2" />
            <p className="text-zinc-50 font-bold">{getTimeSince(journey?.last_updated)}</p>
            <p className="text-zinc-500 text-xs">Last Update</p>
          </CardContent>
        </Card>
      </div>

      {/* Journey Info */}
      <Card className="border border-zinc-800 bg-zinc-900">
        <CardContent className="p-4">
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <span className="text-zinc-500 text-sm">Started</span>
            <span className="text-zinc-50">{formatTime(journey?.started_at)} • {formatDate(journey?.started_at)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-zinc-500 text-sm">Status</span>
            <span className={journey?.is_active ? "text-emerald-400" : "text-zinc-500"}>
              {journey?.is_active ? "Active" : "Ended"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      {journey?.is_active && (
        <p className="text-center text-zinc-600 text-xs mt-6">
          Auto-refreshing every 30 seconds
          {lastUpdate && ` • Last checked: ${formatTime(lastUpdate.toISOString())}`}
        </p>
      )}

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-zinc-600 text-xs">Protected by SafeGuard</p>
      </div>
    </div>
  );
};
