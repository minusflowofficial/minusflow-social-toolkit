import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Youtube, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success("Account created! Ask a super admin to assign your role.");
      } else {
        await signIn(email, password);
        toast.success("Logged in successfully");
        navigate("/admin");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Youtube className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MinusFlow Admin</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Create your admin account" : "Sign in to the admin panel"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              placeholder="admin@minusflow.net"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-border/50 bg-card"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-border/50 bg-card"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-primary hover:underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
