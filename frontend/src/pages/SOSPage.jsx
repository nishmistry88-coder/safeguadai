import { useState, useRef, useEffect } from "react";
import { ShieldAlert, Phone, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/App";
import { motion, AnimatePresence } from "framer-motion";

export const SOSPage = () => {
  const { token, user } = useAuth();
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [location, setLocation] = useState(null);
  const holdTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

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

  const handleHoldStart = () => {
    setIsHolding(true);
    setHoldProgress(0);

    progressIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          return 100;
        }
        return prev + 3.33; // Complete in 3 seconds
      });
    }, 100);

    holdTimerRef.current = setTimeout(() => {
      triggerSOS();
    }, 3000);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  const triggerSOS = async () => {
    setIsAlertActive(true);
    
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          message: "Emergency SOS triggered"
        })
      });

      if (response.ok) {
        toast.error("SOS ALERT SENT!", {
          description: "Your emergency contacts have been notified",
          duration: 10000
        });
      } else {
        toast.error("Failed to send SOS alert");
      }
    } catch (error) {
      toast.error("Connection error - try calling emergency services directly");
      console.error("SOS error:", error);
    }
  };

  const cancelAlert = async () => {
    setIsAlertActive(false);
    handleHoldEnd();
    toast.info("SOS Alert cancelled");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 relative">
      <AnimatePresence>
        {isAlertActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-red-500/20 z-40 flex flex-col items-center justify-center"
            data-testid="sos-active-overlay"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-32 h-32 rounded-full bg-red-500 flex items-center justify-center mb-8"
            >
              <ShieldAlert className="w-16 h-16 text-white" />
            </motion.div>
            <h2 
              className="text-3xl font-black text-red-500 mb-4"
              style={{ fontFamily: 'Chivo, sans-serif' }}
            >
              SOS ACTIVE
            </h2>
            <p className="text-zinc-300 text-center mb-8 max-w-xs">
              Emergency contacts have been notified with your location
            </p>
            
            <div className="space-y-4">
              <a
                href="tel:911"
                className="flex items-center gap-3 px-6 py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-50"
                data-testid="call-911-btn"
              >
                <Phone className="w-5 h-5 text-red-500" />
                Call Emergency Services (911)
              </a>
              
              <Button
                onClick={cancelAlert}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-400"
                data-testid="cancel-sos-btn"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Alert (I'm Safe)
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main SOS Button */}
      <div className="text-center" data-testid="sos-page">
        <p className="text-zinc-500 mb-8 text-sm uppercase tracking-wider">
          Hold button for 3 seconds to activate
        </p>

        <div className="relative mb-8">
          {/* Outer ring with progress */}
          <svg className="absolute inset-0 w-64 h-64 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(239, 68, 68, 0.2)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgb(239, 68, 68)"
              strokeWidth="2"
              strokeDasharray={`${holdProgress * 3.01} 301`}
              className="transition-all duration-100"
            />
          </svg>

          {/* SOS Button */}
          <motion.button
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            whileTap={{ scale: 0.95 }}
            className={`relative w-64 h-64 rounded-full flex items-center justify-center text-white font-black text-5xl select-none transition-all duration-300 ${
              isHolding ? "sos-active" : "sos-glow"
            }`}
            style={{
              background: isHolding 
                ? 'radial-gradient(circle, #dc2626 0%, #b91c1c 100%)' 
                : 'radial-gradient(circle, #ef4444 0%, #dc2626 100%)',
              fontFamily: 'Chivo, sans-serif'
            }}
            data-testid="sos-button"
          >
            <div className={`${isHolding ? 'animate-pulse' : 'animate-breathing'}`}>
              <ShieldAlert className="w-20 h-20 mb-2" />
              <span className="text-3xl tracking-wider">SOS</span>
            </div>
          </motion.button>
        </div>

        <p className="text-zinc-400 text-sm">
          {isHolding ? (
            <span className="text-red-400 font-medium">
              {Math.ceil((100 - holdProgress) / 33.3)}s - Keep holding...
            </span>
          ) : (
            "Press and hold to send emergency alert"
          )}
        </p>
      </div>

      {/* Location Info */}
      {location && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-sm">
            <MapPin className="w-4 h-4 text-violet-500" />
            <span className="text-zinc-400">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="absolute bottom-6 left-6 right-6 grid grid-cols-2 gap-3">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-xs text-zinc-500 mb-1">Emergency</p>
          <p className="text-lg font-bold text-zinc-50" style={{ fontFamily: 'Chivo, sans-serif' }}>
            911
          </p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-xs text-zinc-500 mb-1">Status</p>
          <p className="text-lg font-bold text-emerald-500" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Ready
          </p>
        </div>
      </div>
    </div>
  );
};
