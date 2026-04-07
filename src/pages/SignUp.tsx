import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Eye, EyeOff, Loader2, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ParticleBackground from "@/components/ParticleBackground";
import logoImg from "@/assets/logo.png";
import { isDisposableEmail } from "@/lib/disposable-emails";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
  { label: "Contains uppercase", test: (p: string) => /[A-Z]/.test(p) },
];

const SignUp = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  const allValid = passwordRules.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const validateEmail = (val: string) => {
    setEmail(val);
    if (val && isDisposableEmail(val)) {
      setEmailError("Temporary/disposable emails are not allowed. Please use a real email address.");
    } else {
      setEmailError("");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !allValid || !passwordsMatch || !fullName.trim()) return;

    if (isDisposableEmail(email.trim())) {
      toast.error("Temporary/disposable emails are not allowed.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <ParticleBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10"
          >
            <Check className="h-10 w-10 text-green-500" />
          </motion.div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Check Your Email</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            We've sent a verification link to <strong className="text-foreground">{email}</strong>.
            Please verify your email to complete signup.
          </p>
          <Link to="/signin">
            <Button variant="outline" className="gap-2">
              Go to Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6 flex justify-center"
        >
          <Link to="/">
            <img src={logoImg} alt="MinusFlow ToolKit" className="h-10" />
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass rounded-2xl border border-border/30 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
        >
          <div className="mb-5 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"
            >
              <UserPlus className="h-7 w-7 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Join MinusFlow ToolKit for free</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-3.5">
            {/* Full Name */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name *</label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="h-11 bg-muted/30 transition-all focus:bg-muted/50"
                required
              />
            </motion.div>

            {/* Email */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => validateEmail(e.target.value)}
                placeholder="you@example.com"
                className={`h-11 bg-muted/30 transition-all focus:bg-muted/50 ${emailError ? "border-destructive" : ""}`}
                required
              />
              {emailError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {emailError}
                </motion.p>
              )}
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password *</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 bg-muted/30 pr-10 transition-all focus:bg-muted/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 space-y-1"
                >
                  {passwordRules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full transition-colors ${rule.test(password) ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      <span className={`text-[11px] transition-colors ${rule.test(password) ? "text-green-500" : "text-muted-foreground/60"}`}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Confirm Password */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm Password *</label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`h-11 bg-muted/30 pr-10 transition-all focus:bg-muted/50 ${confirmPassword && !passwordsMatch ? "border-destructive" : confirmPassword && passwordsMatch ? "border-green-500" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-[11px] text-destructive"
                >
                  Passwords do not match
                </motion.p>
              )}
              {confirmPassword && passwordsMatch && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-[11px] text-green-500"
                >
                  ✓ Passwords match
                </motion.p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
            >
              <Button
                type="submit"
                disabled={loading || !allValid || !passwordsMatch || !!emailError || !fullName.trim()}
                className="h-11 w-full gap-2 text-sm font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create Account <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="mt-5 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" className="font-semibold text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to MinusFlow ToolKit
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignUp;
