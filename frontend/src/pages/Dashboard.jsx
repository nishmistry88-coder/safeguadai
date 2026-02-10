import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Mic, MicOff, MapPin, Bell, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/App";
import { motion, AnimatePresence } from "framer-motion";

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [threatStatus, setThreatStatus] = useState("safe");
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [location, setLocation] = useState(null);
  const [contacts, setContacts] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchContacts();
    getCurrentLocation();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
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
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await analyzeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      toast.success("Audio monitoring started");

      // Auto-stop after 30 seconds and analyze
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          stopListening();
        }
      }, 30000);
    } catch (error) {
      toast.error("Could not access microphone");
      console.error("Microphone error:", error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsListening(false);
  };

  const analyzeAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      toast.info("Analyzing audio...");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/analyze-audio`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const analysis = await response.json();
        setLastAnalysis(analysis);
        
        if (analysis.is_threat) {
          setThreatStatus(analysis.threat_level);
          toast.warning(`Potential threat detected: ${analysis.threat_type}`, {
            duration: 10000
          });
        } else {
          setThreatStatus("safe");
          toast.success("No threats detected");
        }
      } else {
        toast.error("Analysis failed");
      }
    } catch (error) {
      toast.error("Could not analyze audio");
      console.error("Analysis error:", error);
    }
  };

  const getThreatColor = (level) => {
    const colors = {
      safe: "text-emerald-500",
      none: "text-emerald-500",
      low: "text-lime-500",
      medium: "text-amber-500",
      high: "text-orange-500",
      critical: "text-red-500"
    };
    return colors[level] || colors.safe;
  };

  const getThreatBg = (level) => {
    const colors = {
      safe: "bg-emerald-500/10 border-emerald-500/30",
      none: "bg-emerald-500/10 border-emerald-500/30",
      low: "bg-lime-500/10 border-lime-500/30",
      medium: "bg-amber-500/10 border-amber-500/30",
      high: "bg-orange-500/10 border-orange-500/30",
      critical: "bg-red-500/10 border-red-500/30"
    };
    return colors[level] || colors.safe;
  };

  return (
    <div className="p-6 space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl font-black text-zinc-50 tracking-tight"
            style={{ fontFamily: 'Chivo, sans-serif' }}
          >
            Hi, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-zinc-500 text-sm">Stay safe out there</p>
        </div>
        <button 
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400"
          data-testid="notifications-btn"
        >
          <Bell className="w-5 h-5" />
        </button>
      </div>

      {/* Status Card */}
      <Card className={`border ${getThreatBg(threatStatus)} bg-zinc-900/50`} data-testid="status-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full ${getThreatBg(threatStatus)} flex items-center justify-center`}>
                {threatStatus === "safe" || threatStatus === "none" ? (
                  <CheckCircle className={`w-7 h-7 ${getThreatColor(threatStatus)}`} />
                ) : (
                  <AlertTriangle className={`w-7 h-7 ${getThreatColor(threatStatus)}`} />
                )}
              </div>
              <div>
                <p className="text-sm text-zinc-400">Current Status</p>
                <p className={`text-xl font-bold capitalize ${getThreatColor(threatStatus)}`}>
                  {threatStatus === "safe" ? "All Clear" : `${threatStatus} Risk`}
                </p>
              </div>
            </div>
          </div>
          
          {lastAnalysis && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Last Analysis</p>
              <p className="text-sm text-zinc-400 line-clamp-2">
                "{lastAnalysis.transcription}"
              </p>
              {lastAnalysis.detected_language && (
                <p className="text-xs text-zinc-500 mt-1">
                  Language: {lastAnalysis.detected_language}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/sos")}
          className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
          data-testid="quick-sos-btn"
        >
          <ShieldAlert className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-lg font-bold text-red-500" style={{ fontFamily: 'Chivo, sans-serif' }}>
            SOS
          </p>
          <p className="text-xs text-zinc-500">Emergency Alert</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={isListening ? stopListening : startListening}
          className={`p-6 rounded-xl border transition-colors ${
            isListening 
              ? "bg-violet-500/20 border-violet-500/50" 
              : "bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/20"
          }`}
          data-testid="listen-btn"
        >
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="listening"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex gap-1 mb-3"
              >
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1 bg-violet-500 rounded-full audio-bar" style={{ height: '20px' }}></div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic className="w-8 h-8 text-violet-500 mb-3" />
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-lg font-bold text-violet-500" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {isListening ? "Listening..." : "Monitor"}
          </p>
          <p className="text-xs text-zinc-500">
            {isListening ? "Tap to stop" : "AI Detection"}
          </p>
        </motion.button>
      </div>

      {/* Location Card */}
      {location && (
        <Card className="border border-zinc-800 bg-zinc-900" data-testid="location-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-400">Current Location</p>
                <p className="text-xs text-zinc-500">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contacts Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-zinc-50" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Emergency Contacts
          </h2>
          <button 
            onClick={() => navigate("/contacts")}
            className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
            data-testid="view-contacts-btn"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {contacts.length === 0 ? (
          <Card className="border border-zinc-800 bg-zinc-900" data-testid="no-contacts-card">
            <CardContent className="p-6 text-center">
              <p className="text-zinc-500 mb-3">No emergency contacts yet</p>
              <Button 
                onClick={() => navigate("/contacts")}
                variant="outline"
                className="border-zinc-700 text-zinc-300"
                data-testid="add-contact-btn"
              >
                Add Contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {contacts.slice(0, 3).map((contact) => (
              <Card 
                key={contact.id} 
                className="border border-zinc-800 bg-zinc-900"
                data-testid={`contact-${contact.id}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-medium">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-zinc-50 font-medium">{contact.name}</p>
                      <p className="text-xs text-zinc-500">{contact.relationship}</p>
                    </div>
                  </div>
                  {contact.is_primary && (
                    <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-1 rounded">
                      Primary
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
