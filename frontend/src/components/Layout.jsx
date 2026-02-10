import { NavLink } from "react-router-dom";
import { ShieldAlert, MapPin, Phone, Users, Settings } from "lucide-react";

export const Layout = ({ children }) => {
  const navItems = [
    { path: "/dashboard", icon: MapPin, label: "Home" },
    { path: "/sos", icon: ShieldAlert, label: "SOS" },
    { path: "/fake-call", icon: Phone, label: "Call" },
    { path: "/contacts", icon: Users, label: "Contacts" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Main Content */}
      <main className="max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 h-16 glass border-t border-zinc-800 flex justify-around items-center z-50 safe-area-bottom"
        data-testid="bottom-navigation"
      >
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            data-testid={`nav-${label.toLowerCase()}`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                isActive 
                  ? "text-violet-500 nav-active" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
