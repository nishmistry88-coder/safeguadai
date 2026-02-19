import { useNavigate } from "react-router-dom";
import { Mic, Phone, MapPin, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/App";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_f5939225-27b2-488c-ba98-856ce900c22c/artifacts/u4rcyto1_real%20logo.png";

export const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: ShieldAlert,
      title: "Instant SOS",
      description: "One-tap emergency alert with location sharing"
    },
    {
      icon: Mic,
      title: "AI Threat Detection",
      description: "Real-time audio analysis in 50+ languages"
    },
    {
      icon: Phone,
      title: "Fake Call",
      description: "Escape uncomfortable situations discreetly"
    },
    {
      icon: MapPin,
      title: "Location Tracking",
      description: "Share your journey with trusted contacts"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1655340401877-121a5a2784b4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxMb25kb24lMjBza3lsaW5lJTIwbmlnaHQlMjBjaXR5c2NhcGUlMjByaXZlciUyMFRoYW1lcyUyMGFlcmlhbCUyMHZpZXclMjBwdXJwbGUlMjBibHVlfGVufDB8fHx8MTc3MTU0NDQwN3ww&ixlib=rb-4.1.0&q=85"
            alt="London city skyline at night"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-violet-950/50 via-zinc-950/60 to-zinc-950"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="SafeGuard AI" className="h-10 w-auto logo-transparent" />
            <span className="text-xl font-black text-zinc-50 tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
              SafeGuard AI
            </span>
          </div>
          {user ? (
            <Button 
              onClick={() => navigate("/dashboard")}
              className="bg-violet-500 hover:bg-violet-600 text-white px-6"
              data-testid="go-to-dashboard-btn"
            >
              Dashboard
            </Button>
          ) : (
            <Button 
              onClick={() => navigate("/login")}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              data-testid="login-btn"
            >
              Sign In
            </Button>
          )}
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <p className="text-violet-400 font-medium mb-4 tracking-wide">
              Your Voice. Your Safety. Your Control.
            </p>
            <h1 
              className="text-5xl md:text-7xl font-black text-zinc-50 tracking-tighter leading-none mb-6"
              style={{ fontFamily: 'Chivo, sans-serif' }}
            >
              Your Safety,<br />
              <span className="text-red-500">Always On.</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 leading-relaxed mb-10 max-w-lg">
              AI-powered personal safety app that listens for threats in any language and alerts your emergency contacts instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => navigate(user ? "/sos" : "/register")}
                className="bg-red-500 hover:bg-red-600 text-white text-lg px-8 py-6 shadow-[0_0_30px_rgba(239,68,68,0.4)] group"
                data-testid="get-started-btn"
              >
                {user ? "Open SOS" : "Get Protected"}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-lg px-8 py-6"
                data-testid="learn-more-btn"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-zinc-600 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-zinc-400 rounded-full"></div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 bg-zinc-950">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 
              className="text-3xl md:text-5xl font-black text-zinc-50 tracking-tight mb-4"
              style={{ fontFamily: 'Chivo, sans-serif' }}
            >
              Protection That Never Sleeps
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Advanced AI technology working around the clock to keep you safe
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors card-hover"
                data-testid={`feature-${feature.title.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-violet-500" />
                </div>
                <h3 className="text-xl font-bold text-zinc-50 mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {feature.title}
                </h3>
                <p className="text-zinc-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-12 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800"
          >
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
              <img src={LOGO_URL} alt="SafeGuard AI" className="h-16 w-auto logo-transparent" />
            </div>
            <h2 
              className="text-3xl md:text-4xl font-black text-zinc-50 tracking-tight mb-4"
              style={{ fontFamily: 'Chivo, sans-serif' }}
            >
              Start Feeling Safe Today
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-lg mx-auto">
              Join thousands of women who trust SafeGuard AI to keep them protected wherever they go.
            </p>
            <Button 
              onClick={() => navigate(user ? "/dashboard" : "/register")}
              className="bg-red-500 hover:bg-red-600 text-white text-lg px-10 py-6 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
              data-testid="cta-get-started-btn"
            >
              {user ? "Go to Dashboard" : "Create Free Account"}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="SafeGuard AI" className="h-6 w-auto logo-transparent" />
            <span className="text-sm text-zinc-500">SafeGuard AI © 2024</span>
          </div>
          <p className="text-sm text-zinc-600">
            Your Voice. Your Safety. Your Control.
          </p>
        </div>
      </footer>
    </div>
  );
};
