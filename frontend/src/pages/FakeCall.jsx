import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Volume2, User, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/App";
import { motion } from "framer-motion";

export const FakeCall = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [callState, setCallState] = useState("idle"); // idle, incoming, active
  const [timer, setTimer] = useState(0);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const timerRef = useRef(null);
  const ringAudioRef = useRef(null);

  useEffect(() => {
    fetchContacts();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/fake-call-contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
        if (data.length > 0 && !selectedContact) {
          setSelectedContact(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/fake-call-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newContact)
      });

      if (response.ok) {
        toast.success("Contact added");
        setNewContact({ name: "", phone: "" });
        setDialogOpen(false);
        fetchContacts();
      }
    } catch (error) {
      toast.error("Failed to add contact");
    }
  };

  const triggerIncomingCall = () => {
    setCallState("incoming");
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  };

  const answerCall = () => {
    setCallState("active");
    if (navigator.vibrate) {
      navigator.vibrate(0); // Stop vibration
    }
  };

  const endCall = () => {
    setCallState("idle");
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Incoming Call Screen
  if (callState === "incoming") {
    return (
      <div className="fixed inset-0 z-[100] fake-call-screen flex flex-col" data-testid="incoming-call-screen">
        {/* Top Section */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center mb-6"
          >
            <User className="w-14 h-14 text-zinc-400" />
          </motion.div>
          
          <p className="text-zinc-500 text-sm mb-2">Incoming call</p>
          <h2 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {selectedContact?.name || "Mom"}
          </h2>
          <p className="text-zinc-400">{selectedContact?.phone || "+1 (555) 123-4567"}</p>
        </div>

        {/* Bottom Section */}
        <div className="p-8 pb-12 flex justify-around items-center">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center"
            data-testid="decline-call-btn"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={answerCall}
            className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center incoming-ring"
            data-testid="answer-call-btn"
          >
            <Phone className="w-7 h-7 text-white" />
          </motion.button>
        </div>
      </div>
    );
  }

  // Active Call Screen
  if (callState === "active") {
    return (
      <div className="fixed inset-0 z-[100] fake-call-screen flex flex-col" data-testid="active-call-screen">
        {/* Top Section */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
            <User className="w-14 h-14 text-zinc-400" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {selectedContact?.name || "Mom"}
          </h2>
          <p className="text-emerald-500 text-lg font-medium">{formatTime(timer)}</p>
        </div>

        {/* Call Controls */}
        <div className="p-8 pb-12">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <button className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-zinc-400">Speaker</span>
            </button>
            <button className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-zinc-400">Keypad</span>
            </button>
            <button className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-zinc-400">Contacts</span>
            </button>
          </div>

          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center"
              data-testid="end-call-btn"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Idle State - Setup Screen
  return (
    <div className="min-h-screen bg-zinc-950 p-6" data-testid="fake-call-setup">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate("/dashboard")}
          className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-50 hover:border-zinc-700 transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 
            className="text-2xl font-black text-zinc-50 tracking-tight"
            style={{ fontFamily: 'Chivo, sans-serif' }}
          >
            Fake Call
          </h1>
          <p className="text-zinc-500 text-sm">Escape uncomfortable situations</p>
        </div>
      </header>

      {/* Caller Selection */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-zinc-300">Select Caller</Label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="border-zinc-700 text-zinc-400"
                data-testid="add-caller-btn"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-50">Add Fake Caller</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-zinc-300">Name</Label>
                  <Input
                    placeholder="Mom"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-50 mt-1"
                    data-testid="caller-name-input"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Phone Number</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-50 mt-1"
                    data-testid="caller-phone-input"
                  />
                </div>
                <Button 
                  onClick={addContact}
                  className="w-full bg-violet-500 hover:bg-violet-600"
                  data-testid="save-caller-btn"
                >
                  Save Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {contacts.length === 0 ? (
          <Card className="border border-zinc-800 bg-zinc-900">
            <CardContent className="p-6 text-center">
              <User className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 mb-1">No callers added yet</p>
              <p className="text-xs text-zinc-600">Add a fake caller to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <Card 
                key={contact.id}
                className={`border cursor-pointer transition-colors ${
                  selectedContact?.id === contact.id 
                    ? "border-violet-500 bg-violet-500/10" 
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                }`}
                onClick={() => setSelectedContact(contact)}
                data-testid={`caller-${contact.id}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-zinc-50 font-medium">{contact.name}</p>
                    <p className="text-zinc-500 text-sm">{contact.phone}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Trigger Call Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={triggerIncomingCall}
        disabled={!selectedContact && contacts.length === 0}
        className={`w-full p-6 rounded-xl flex items-center justify-center gap-3 transition-colors ${
          (!selectedContact && contacts.length === 0)
            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
        }`}
        data-testid="trigger-call-btn"
      >
        <Phone className="w-6 h-6" />
        <span className="text-lg font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Trigger Incoming Call
        </span>
      </motion.button>

      <p className="text-center text-zinc-500 text-sm mt-4">
        The fake call will appear like a real incoming call
      </p>
    </div>
  );
};
