import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldAlert, Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/App";

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        login(data.access_token, data.user);
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.error(data.detail || "Login failed");
      }
    } catch (error) {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-50 hover:border-zinc-700 transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <span className="text-lg font-bold text-zinc-50" style={{ fontFamily: 'Chivo, sans-serif' }}>
            SafeGuard
          </span>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 
              className="text-3xl font-black text-zinc-50 tracking-tight mb-2"
              style={{ fontFamily: 'Chivo, sans-serif' }}
            >
              Welcome Back
            </h1>
            <p className="text-zinc-400">
              Sign in to access your safety dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-11 bg-zinc-900 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus:border-violet-500"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-11 pr-11 bg-zinc-900 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus:border-violet-500"
                  required
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  data-testid="toggle-password-btn"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-violet-500 hover:bg-violet-600 text-white py-6"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-zinc-500 mt-6">
            Don't have an account?{" "}
            <Link 
              to="/register" 
              className="text-violet-400 hover:text-violet-300 font-medium"
              data-testid="register-link"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
