import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MapPin, Clock, Mic, Smartphone, Play, Square, 
  PartyPopper, Music, Heart, Moon, Plane, 
  AlertTriangle, Battery, CheckCircle, X, Shield,
  Share2, Copy, ExternalLink, Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/App";
import { motion, AnimatePresence } from "framer-motion";

const presets = [
  { id: "club", name: "Club", icon: PartyPopper, color: "text-pink-500", bg: "bg-pink-500/10" },
  { id: "festival", name: "Festival", icon: Music, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "date", name: "Date", icon: Heart, color: "text-red-500", bg: "bg-red-500/10" },
  { id: "walking", name: "Walking Home", icon: Moon, color: "text-violet-500", bg: "bg-violet-500/10" },
  { id: "travel", name: "Travel", icon: Plane, color: "text-cyan-500", bg: "bg-cyan-500/10" },
];

const checkinIntervals = [
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
];

export const GoingOutMode = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("club");
  const [settings, setSettings] = useState({
    voiceActivation: false,
    shakeDetection: false,
    autoRecord: false,
    checkinEnabled: true,
    checkinInterval: "30"
  });
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [checkinCountdown, setCheckinCountdown] = useState(60);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [location, setLocation] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [journeyShare, setJourneyShare] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareDuration, setShareDuration] = useState("4");
  
  const checkinTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const locationUpdateRef = useRef(null);

  useEffect(() => {
    fetchActiveSession();
    fetchActiveJourney();
    getBatteryLevel();
    getCurrentLocation();
    
    // Listen for battery changes
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
    
    return () => {
      if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (locationUpdateRef.current) clearInterval(locationUpdateRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeSession && activeSession.checkin_enabled) {
      startCheckinTimer();
    }
    return () => {
      if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    };
  }, [activeSession]);

  // Update journey location periodically
  useEffect(() => {
    if (journeyShare && journeyShare.is_active) {
      updateJourneyLocation();
      locationUpdateRef.current = setInterval(updateJourneyLocation, 60000); // Every minute
    }
    return () => {
      if (locationUpdateRef.current) clearInterval(locationUpdateRef.current);
    };
  }, [journeyShare]);

  const fetchActiveSession = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/going-out/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  };

  const fetchActiveJourney = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/journey/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setJourneyShare(data);
      }
    } catch (error) {
      console.error("Failed to fetch journey:", error);
    }
  };

  const getBatteryLevel = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
      } catch (e) {
        console.log("Battery API not available");
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.error("Location error:", error)
      );
    }
  };

  const startCheckinTimer = () => {
    if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    
    const intervalMs = (activeSession?.checkin_interval || 30) * 60 * 1000;
    
    checkinTimerRef.current = setInterval(() => {
      triggerCheckinPrompt();
    }, intervalMs);
  };

  const triggerCheckinPrompt = () => {
    setShowCheckinDialog(true);
    setCheckinCountdown(60);
    
    // Start countdown
    countdownRef.current = setInterval(() => {
      setCheckinCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          handleMissedCheckin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Vibrate to alert
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500]);
    }
  };

  const handleCheckinResponse = async (isSafe) => {
    clearInterval(countdownRef.current);
    setShowCheckinDialog(false);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/going-out/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          is_safe: isSafe,
          latitude: location?.latitude,
          longitude: location?.longitude
        })
      });
      
      if (response.ok) {
        if (isSafe) {
          toast.success("Check-in recorded. Stay safe!");
        } else {
          toast.error("SOS Alert triggered!");
          navigate("/sos");
        }
      }
    } catch (error) {
      toast.error("Check-in failed");
    }
  };

  const handleMissedCheckin = async () => {
    setShowCheckinDialog(false);
    toast.error("Missed check-in - triggering SOS!");
    
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/going-out/missed-checkin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate("/sos");
    } catch (error) {
      console.error("Failed to handle missed checkin:", error);
    }
  };

  const startGoingOutMode = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/going-out/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          preset: selectedPreset,
          voice_activation_enabled: settings.voiceActivation,
          shake_detection_enabled: settings.shakeDetection,
          auto_record_enabled: settings.autoRecord,
          checkin_enabled: settings.checkinEnabled,
          checkin_interval: parseInt(settings.checkinInterval)
        })
      });
      
      if (response.ok) {
        const session = await response.json();
        setActiveSession(session);
        toast.success(`Going Out Mode activated - ${presets.find(p => p.id === selectedPreset)?.name}`);
      } else {
        toast.error("Failed to start Going Out Mode");
      }
    } catch (error) {
      toast.error("Connection error");
    }
  };

  const requestEndSession = () => {
    setShowEndDialog(true);
  };

  const endSessionWithVoice = async () => {
    setIsVerifying(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'verification.webm');
        
        try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/going-out/verify-voice`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.is_match) {
              setActiveSession(null);
              setShowEndDialog(false);
              toast.success("Voice verified - Going Out Mode ended");
            } else {
              toast.error(`Phrase not matched. You said: "${result.phrase_detected}"`);
            }
          }
        } catch (error) {
          toast.error("Verification failed");
        }
        setIsVerifying(false);
      };
      
      toast.info("Speak your activation phrase now...");
      mediaRecorder.start();
      
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 4000);
      
    } catch (error) {
      toast.error("Could not access microphone");
      setIsVerifying(false);
    }
  };

  const forceEndSession = async () => {
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/going-out/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveSession(null);
      setShowEndDialog(false);
      toast.success("Going Out Mode ended");
    } catch (error) {
      toast.error("Failed to end session");
    }
  };

  // Active Session View
  if (activeSession) {
    const preset = presets.find(p => p.id === activeSession.preset);
    
    return (
      <div className="p-6 space-y-6" data-testid="going-out-active">
        {/* Active Header */}
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-20 h-20 rounded-full ${preset?.bg} flex items-center justify-center mx-auto mb-4`}
          >
            {preset && <preset.icon className={`w-10 h-10 ${preset.color}`} />}
          </motion.div>
          <h1 
            className="text-2xl font-black text-zinc-50 tracking-tight"
            style={{ fontFamily: 'Chivo, sans-serif' }}
          >
            Going Out Mode Active
          </h1>
          <p className="text-zinc-400">{preset?.name}</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border border-emerald-500/30 bg-emerald-500/10">
            <CardContent className="p-4 text-center">
              <Shield className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-emerald-500 font-bold">Protected</p>
            </CardContent>
          </Card>
          
          <Card className="border border-zinc-800 bg-zinc-900">
            <CardContent className="p-4 text-center">
              <Battery className={`w-6 h-6 mx-auto mb-2 ${
                batteryLevel < 20 ? 'text-red-500' : batteryLevel < 50 ? 'text-amber-500' : 'text-emerald-500'
              }`} />
              <p className="text-zinc-50 font-bold">{batteryLevel}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Features Status */}
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Voice Activation</span>
              <span className={activeSession.voice_activation_enabled ? "text-emerald-500" : "text-zinc-600"}>
                {activeSession.voice_activation_enabled ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Shake Detection</span>
              <span className={activeSession.shake_detection_enabled ? "text-emerald-500" : "text-zinc-600"}>
                {activeSession.shake_detection_enabled ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Auto-Record</span>
              <span className={activeSession.auto_record_enabled ? "text-emerald-500" : "text-zinc-600"}>
                {activeSession.auto_record_enabled ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Check-ins</span>
              <span className={activeSession.checkin_enabled ? "text-emerald-500" : "text-zinc-600"}>
                {activeSession.checkin_enabled ? `Every ${activeSession.checkin_interval}min` : "OFF"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* End Session Button */}
        <Button
          onClick={requestEndSession}
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
          data-testid="end-session-btn"
        >
          <Square className="w-4 h-4 mr-2" />
          End Going Out Mode
        </Button>

        {/* Quick SOS */}
        <Button
          onClick={() => navigate("/sos")}
          className="w-full bg-red-500 hover:bg-red-600 text-white"
          data-testid="quick-sos-btn"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          SOS Emergency
        </Button>

        {/* Check-in Dialog */}
        <Dialog open={showCheckinDialog} onOpenChange={setShowCheckinDialog}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-50 text-center text-xl">Are You Safe?</DialogTitle>
            </DialogHeader>
            <div className="text-center py-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <Clock className="w-12 h-12 text-amber-500" />
              </motion.div>
              <p className="text-zinc-400 mb-4">Please confirm you're okay</p>
              <div className="mb-6">
                <Progress value={(checkinCountdown / 60) * 100} className="h-2" />
                <p className="text-zinc-500 text-sm mt-2">{checkinCountdown}s remaining</p>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => handleCheckinResponse(true)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  data-testid="im-safe-btn"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I'm Safe
                </Button>
                <Button
                  onClick={() => handleCheckinResponse(false)}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  data-testid="not-safe-btn"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Not Safe
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* End Session Dialog */}
        <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-50">End Going Out Mode</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-zinc-400 mb-6">
                To end Going Out Mode, please speak your activation phrase for verification.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={endSessionWithVoice}
                  disabled={isVerifying}
                  className="w-full bg-violet-500 hover:bg-violet-600"
                  data-testid="verify-voice-btn"
                >
                  {isVerifying ? (
                    <>
                      <Mic className="w-4 h-4 mr-2 animate-pulse" />
                      Listening...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Verify with Voice
                    </>
                  )}
                </Button>
                <Button
                  onClick={forceEndSession}
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-400"
                  data-testid="force-end-btn"
                >
                  End Without Verification
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Setup View
  return (
    <div className="p-6 space-y-6" data-testid="going-out-setup">
      {/* Header */}
      <div>
        <h1 
          className="text-2xl font-black text-zinc-50 tracking-tight"
          style={{ fontFamily: 'Chivo, sans-serif' }}
        >
          Going Out Mode
        </h1>
        <p className="text-zinc-500 text-sm">Extra protection for clubs, dates, and travel</p>
      </div>

      {/* Battery Warning */}
      {batteryLevel < 20 && (
        <Card className="border border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Battery className="w-5 h-5 text-amber-500" />
            <p className="text-amber-400 text-sm">
              Low battery ({batteryLevel}%). Consider charging before going out.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Preset Selection */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Select Preset</Label>
        <div className="grid grid-cols-2 gap-3">
          {presets.map((preset) => (
            <motion.button
              key={preset.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPreset(preset.id)}
              className={`p-4 rounded-xl border transition-colors ${
                selectedPreset === preset.id 
                  ? `${preset.bg} border-current ${preset.color}` 
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              }`}
              data-testid={`preset-${preset.id}`}
            >
              <preset.icon className={`w-8 h-8 mx-auto mb-2 ${
                selectedPreset === preset.id ? preset.color : "text-zinc-500"
              }`} />
              <p className={`text-sm font-medium ${
                selectedPreset === preset.id ? preset.color : "text-zinc-400"
              }`}>
                {preset.name}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Safety Options */}
      <Card className="border border-zinc-800 bg-zinc-900">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-zinc-50 font-bold">Safety Options</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-zinc-50 text-sm">Voice Activation</p>
                <p className="text-zinc-500 text-xs">Trigger SOS with voice</p>
              </div>
            </div>
            <Switch
              checked={settings.voiceActivation}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, voiceActivation: checked }))}
              data-testid="voice-toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-zinc-50 text-sm">Shake Detection</p>
                <p className="text-zinc-500 text-xs">Shake phone to trigger SOS</p>
              </div>
            </div>
            <Switch
              checked={settings.shakeDetection}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, shakeDetection: checked }))}
              data-testid="shake-toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-zinc-50 text-sm">Auto-Record on Trigger</p>
                <p className="text-zinc-500 text-xs">Record audio when SOS triggers</p>
              </div>
            </div>
            <Switch
              checked={settings.autoRecord}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, autoRecord: checked }))}
              data-testid="autorecord-toggle"
            />
          </div>
        </CardContent>
      </Card>

      {/* Check-in Settings */}
      <Card className="border border-zinc-800 bg-zinc-900">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-zinc-50 text-sm">Check-in Timer</p>
                <p className="text-zinc-500 text-xs">Get reminded to confirm you're safe</p>
              </div>
            </div>
            <Switch
              checked={settings.checkinEnabled}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, checkinEnabled: checked }))}
              data-testid="checkin-toggle"
            />
          </div>

          {settings.checkinEnabled && (
            <div>
              <Label className="text-zinc-400 text-sm">Check-in Interval</Label>
              <Select
                value={settings.checkinInterval}
                onValueChange={(value) => setSettings(s => ({ ...s, checkinInterval: value }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50 mt-2" data-testid="interval-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {checkinIntervals.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value} className="text-zinc-50">
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={startGoingOutMode}
        className="w-full bg-violet-500 hover:bg-violet-600 text-white py-6"
        data-testid="start-going-out-btn"
      >
        <Play className="w-5 h-5 mr-2" />
        Start Going Out Mode
      </Button>

      <p className="text-center text-zinc-500 text-xs">
        No audio will be recorded until a trigger occurs
      </p>
    </div>
  );
};
