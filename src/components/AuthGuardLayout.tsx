import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "./AuthGuard";
import SuspendedOverlay from "./SuspendedOverlay";
import { useSessionTracker } from "@/hooks/useSessionTracker";

/**
 * Wraps tool pages: requires auth + checks session limits + suspension
 */
const AuthGuardLayout = ({ children }: { children: ReactNode }) => {
  const { blocked, checking } = useSessionTracker();

  if (blocked) {
    return <SuspendedOverlay />;
  }

  return <AuthGuard>{children}</AuthGuard>;
};

export default AuthGuardLayout;
