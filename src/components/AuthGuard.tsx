import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ParticleBackground from "@/components/ParticleBackground";
import logoImg from "@/assets/logo.png";

interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [user, setUser] = useState<any>(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <ParticleBackground />
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 w-full max-w-md text-center"
        >
          <Link to="/" className="mb-8 inline-block">
            <img src={logoImg} alt="MinusFlow ToolKit" className="h-10" />
          </Link>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl border border-border/30 p-8 shadow-2xl backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
            >
              <Lock className="h-8 w-8 text-primary" />
            </motion.div>

            <h1 className="mb-2 text-2xl font-bold text-foreground">Login Required</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Please sign in or create an account to access this tool.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/signin" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <LogIn className="h-4 w-4" /> Sign In
                </Button>
              </Link>
              <Link to="/signup" className="flex-1">
                <Button className="w-full gap-2">
                  <UserPlus className="h-4 w-4" /> Sign Up
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
