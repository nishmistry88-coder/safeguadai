import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, LogOut, ChevronRight, Moon, MapPin, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/App";

export const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    locationTracking: true,
    autoRecord: false,
    darkMode: true
  });

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const toggleSetting = (key) => {
    setSettings((prev) => {
      const newValue = !prev[key];
      toast.success(`${key === 'notifications' ? 'Notifications' : key === 'locationTracking' ? 'Location tracking' : key === 'autoRecord' ? 'Auto-record' : 'Dark mode'} ${newValue ? 'enabled' : 'disabled'}`);
      return { ...prev, [key]: newValue };
    });
  };

  const settingsGroups = [
    {
      title: "Safety Features",
      items: [
        {
          key: "locationTracking",
          icon: MapPin,
          label: "Location Tracking",
          description: "Track your location for emergency alerts",
          type: "switch"
        },
        {
          key: "autoRecord",
          icon: Mic,
          label: "Auto-Record on SOS",
          description: "Automatically record audio when SOS is triggered",
          type: "switch"
        }
      ]
    },
    {
      title: "Preferences",
      items: [
        {
          key: "notifications",
          icon: Bell,
          label: "Push Notifications",
          description: "Receive alerts and updates",
          type: "switch"
        },
        {
          key: "darkMode",
          icon: Moon,
          label: "Dark Mode",
          description: "Always enabled for discretion",
          type: "switch",
          disabled: true
        }
      ]
    }
  ];

  return (
    <div className="p-6" data-testid="settings-page">
      {/* Header */}
      <div className="mb-8">
        <h1 
          className="text-2xl font-black text-zinc-50 tracking-tight"
          style={{ fontFamily: 'Chivo, sans-serif' }}
        >
          Settings
        </h1>
        <p className="text-zinc-500 text-sm">Manage your app preferences</p>
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
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </div>
        </CardContent>
      </Card>

      {/* Settings Groups */}
      {settingsGroups.map((group) => (
        <div key={group.title} className="mb-6">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
            {group.title}
          </h2>
          <Card className="border border-zinc-800 bg-zinc-900">
            <CardContent className="p-0 divide-y divide-zinc-800">
              {group.items.map((item) => (
                <div 
                  key={item.key}
                  className="p-4 flex items-center justify-between"
                  data-testid={`setting-${item.key}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-zinc-50 font-medium">{item.label}</p>
                      <p className="text-zinc-500 text-xs">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={() => toggleSetting(item.key)}
                    disabled={item.disabled}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Security Section */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Security
        </h2>
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-0">
            <button 
              className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              data-testid="privacy-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="text-left">
                  <p className="text-zinc-50 font-medium">Privacy & Security</p>
                  <p className="text-zinc-500 text-xs">Manage your data</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>
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
        <p className="text-zinc-600 text-xs">SafeGuard v1.0.0</p>
        <p className="text-zinc-700 text-xs mt-1">Your safety is our priority</p>
      </div>
    </div>
  );
};
