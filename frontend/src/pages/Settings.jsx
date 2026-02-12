import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Bell, Shield, LogOut, ChevronRight, Moon, MapPin, Mic, 
  Battery, Power, Smartphone, Clock, Volume2, Edit2, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAuth } from "@/App";

export const Settings = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPhraseDialog, setShowPhraseDialog] = useState(false);
  const [isRecordingPhrase, setIsRecordingPhrase] = useState(false);
  const [tempPhrase, setTempPhrase] = useState("");
  
  const [settings, setSettings] = useState({
    // Voice Activation
    voice_activation_enabled: false,
    activation_phrase: "Help me",
    // Check-in settings
    checkin_interval: 30,
    checkin_enabled: true,
    // Triggers
    shake_detection_enabled: false,
    auto_record_on_trigger: false,
    trigger_fake_call: false,
    // Battery settings
    low_battery_warning: true,
    send_location_on_low_battery: true,
    low_battery_threshold: 20,
    critical_battery_threshold: 5,
    // Shutdown settings
    shutdown_alert_enabled: true,
    send_location_on_shutdown: true,
    // Voice verification
    voice_verify_to_disable: true,
    // General
    notifications: true,
    locationTracking: true
  });

  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates) => {
    setSaving(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings({ [key]: value });
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const startPhraseRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // Transcribe to get the phrase
        const formData = new FormData();
        formData.append('audio', audioBlob, 'phrase.webm');
        
        try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/analyze-audio`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            setTempPhrase(result.transcription);
          } else {
            toast.error("Could not detect phrase");
          }
        } catch (error) {
          toast.error("Phrase detection failed");
        }
        setIsRecordingPhrase(false);
      };
      
      setIsRecordingPhrase(true);
      toast.info("Speak your activation phrase now...");
      mediaRecorderRef.current.start();
      
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 4000);
      
    } catch (error) {
      toast.error("Could not access microphone");
    }
  };

  const savePhrase = async () => {
    if (tempPhrase.trim()) {
      await updateSetting("activation_phrase", tempPhrase.trim());
      setShowPhraseDialog(false);
      setTempPhrase("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24" data-testid="settings-page">
      {/* Header */}
      <div className="mb-8">
        <h1 
          className="text-2xl font-black text-zinc-50 tracking-tight"
          style={{ fontFamily: 'Chivo, sans-serif' }}
        >
          Settings
        </h1>
        <p className="text-zinc-500 text-sm">Manage your safety preferences</p>
      </div>

      {/* Profile Card */}
      <Card className="border border-zinc-800 bg-zinc-900 mb-6" data-testid="profile-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center">
              <User className="w-7 h-7 text-violet-500" />
            </div>
            <div className="flex-1">
              <p className="text-zinc-50 font-bold text-lg">{user?.name}</p>
              <p className="text-zinc-500 text-sm">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Activation Settings */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Voice Activation
        </h2>
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-0 divide-y divide-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Voice Activation Mode</p>
                  <p className="text-zinc-500 text-xs">Listen for activation phrase</p>
                </div>
              </div>
              <Switch
                checked={settings.voice_activation_enabled}
                onCheckedChange={(checked) => updateSetting("voice_activation_enabled", checked)}
                data-testid="switch-voice-activation"
              />
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-zinc-400 text-sm">Activation Phrase</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPhraseDialog(true)}
                  className="text-violet-400 hover:text-violet-300"
                  data-testid="edit-phrase-btn"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
              <p className="text-zinc-50 font-medium">"{settings.activation_phrase}"</p>
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Voice Verify to Disable</p>
                  <p className="text-zinc-500 text-xs">Require phrase to end Going Out Mode</p>
                </div>
              </div>
              <Switch
                checked={settings.voice_verify_to_disable}
                onCheckedChange={(checked) => updateSetting("voice_verify_to_disable", checked)}
                data-testid="switch-voice-verify"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check-in Settings */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Check-in Timer
        </h2>
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-0 divide-y divide-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Check-in Reminders</p>
                  <p className="text-zinc-500 text-xs">Ask if you're safe periodically</p>
                </div>
              </div>
              <Switch
                checked={settings.checkin_enabled}
                onCheckedChange={(checked) => updateSetting("checkin_enabled", checked)}
                data-testid="switch-checkin"
              />
            </div>
            
            {settings.checkin_enabled && (
              <div className="p-4">
                <Label className="text-zinc-400 text-sm">Default Interval</Label>
                <Select
                  value={String(settings.checkin_interval)}
                  onValueChange={(value) => updateSetting("checkin_interval", parseInt(value))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50 mt-2" data-testid="checkin-interval-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="10" className="text-zinc-50">10 minutes</SelectItem>
                    <SelectItem value="15" className="text-zinc-50">15 minutes</SelectItem>
                    <SelectItem value="20" className="text-zinc-50">20 minutes</SelectItem>
                    <SelectItem value="30" className="text-zinc-50">30 minutes</SelectItem>
                    <SelectItem value="45" className="text-zinc-50">45 minutes</SelectItem>
                    <SelectItem value="60" className="text-zinc-50">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trigger Settings */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Triggers
        </h2>
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-0 divide-y divide-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Shake Detection</p>
                  <p className="text-zinc-500 text-xs">Shake phone to trigger SOS</p>
                </div>
              </div>
              <Switch
                checked={settings.shake_detection_enabled}
                onCheckedChange={(checked) => updateSetting("shake_detection_enabled", checked)}
                data-testid="switch-shake"
              />
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Auto-Record on Trigger</p>
                  <p className="text-zinc-500 text-xs">Record audio when SOS triggers</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_record_on_trigger}
                onCheckedChange={(checked) => updateSetting("auto_record_on_trigger", checked)}
                data-testid="switch-auto-record"
              />
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Trigger Fake Call</p>
                  <p className="text-zinc-500 text-xs">Fake call on missed check-in</p>
                </div>
              </div>
              <Switch
                checked={settings.trigger_fake_call}
                onCheckedChange={(checked) => updateSetting("trigger_fake_call", checked)}
                data-testid="switch-fake-call"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Battery Settings */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Battery & Power
        </h2>
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-0 divide-y divide-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Battery className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Low Battery Warning</p>
                  <p className="text-zinc-500 text-xs">Alert when battery is low</p>
                </div>
              </div>
              <Switch
                checked={settings.low_battery_warning}
                onCheckedChange={(checked) => updateSetting("low_battery_warning", checked)}
                data-testid="switch-low-battery"
              />
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Send Location on Low Battery</p>
                  <p className="text-zinc-500 text-xs">Send final location when critical</p>
                </div>
              </div>
              <Switch
                checked={settings.send_location_on_low_battery}
                onCheckedChange={(checked) => updateSetting("send_location_on_low_battery", checked)}
                data-testid="switch-location-battery"
              />
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-zinc-400 text-sm">Low Battery Threshold</p>
                <p className="text-zinc-50 font-medium">{settings.low_battery_threshold}%</p>
              </div>
              <Slider
                value={[settings.low_battery_threshold]}
                onValueChange={([value]) => updateSetting("low_battery_threshold", value)}
                min={10}
                max={50}
                step={5}
                className="mb-2"
                data-testid="low-battery-slider"
              />
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-zinc-400 text-sm">Critical Battery Threshold</p>
                <p className="text-zinc-50 font-medium">{settings.critical_battery_threshold}%</p>
              </div>
              <Slider
                value={[settings.critical_battery_threshold]}
                onValueChange={([value]) => updateSetting("critical_battery_threshold", value)}
                min={1}
                max={15}
                step={1}
                className="mb-2"
                data-testid="critical-battery-slider"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shutdown Settings */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Shutdown Detection
        </h2>
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-0 divide-y divide-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Power className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Shutdown Alert</p>
                  <p className="text-zinc-500 text-xs">Alert if phone shuts down during Going Out</p>
                </div>
              </div>
              <Switch
                checked={settings.shutdown_alert_enabled}
                onCheckedChange={(checked) => updateSetting("shutdown_alert_enabled", checked)}
                data-testid="switch-shutdown"
              />
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Send Location on Shutdown</p>
                  <p className="text-zinc-500 text-xs">Send final location before shutdown</p>
                </div>
              </div>
              <Switch
                checked={settings.send_location_on_shutdown}
                onCheckedChange={(checked) => updateSetting("send_location_on_shutdown", checked)}
                data-testid="switch-location-shutdown"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* General Settings */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
          General
        </h2>
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-0 divide-y divide-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Push Notifications</p>
                  <p className="text-zinc-500 text-xs">Receive alerts and updates</p>
                </div>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, notifications: checked }))}
                data-testid="switch-notifications"
              />
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-50 font-medium">Dark Mode</p>
                  <p className="text-zinc-500 text-xs">Always enabled for discretion</p>
                </div>
              </div>
              <Switch checked={true} disabled data-testid="switch-dark-mode" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
        data-testid="logout-btn"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      {/* App Info */}
      <div className="mt-8 text-center">
        <p className="text-zinc-600 text-xs">SafeGuard AI v2.1.0</p>
        <p className="text-zinc-700 text-xs mt-1">Your Voice. Your Safety. Your Control.</p>
      </div>

      {/* Edit Phrase Dialog */}
      <Dialog open={showPhraseDialog} onOpenChange={setShowPhraseDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Set Activation Phrase</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-zinc-400 text-sm">
              This phrase will trigger SOS when Voice Activation Mode is enabled.
            </p>
            
            <div>
              <Label className="text-zinc-300">Type your phrase</Label>
              <Input
                value={tempPhrase || settings.activation_phrase}
                onChange={(e) => setTempPhrase(e.target.value)}
                placeholder="Help me"
                className="bg-zinc-800 border-zinc-700 text-zinc-50 mt-2"
                data-testid="phrase-input"
              />
            </div>
            
            <div className="text-center">
              <p className="text-zinc-500 text-xs mb-2">Or record your voice</p>
              <Button
                onClick={startPhraseRecording}
                disabled={isRecordingPhrase}
                variant="outline"
                className="border-violet-500/30 text-violet-400"
                data-testid="record-phrase-btn"
              >
                {isRecordingPhrase ? (
                  <>
                    <Mic className="w-4 h-4 mr-2 animate-pulse" />
                    Listening...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Record Phrase
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowPhraseDialog(false)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={savePhrase}
                className="flex-1 bg-violet-500 hover:bg-violet-600"
                data-testid="save-phrase-btn"
              >
                Save Phrase
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
