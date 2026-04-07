import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonResp({ error: "No authorization header" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !callingUser) return jsonResp({ error: "Unauthorized" }, 401);

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .in("role", ["super_admin", "admin"])
      .maybeSingle();

    const isSuperAdmin = callerRole?.role === "super_admin";
    const isAdmin = !!callerRole;

    const body = await req.json();
    const { action } = body;

    // ─── LIST ALL USERS ───
    if (action === "list_all") {
      if (!isAdmin) return jsonResp({ error: "Only admins can view users" }, 403);

      const { data: { users: authUsers }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) return jsonResp({ error: listErr.message }, 400);

      // Get ALL profile fields
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("*");

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role");

      const { data: sessions } = await supabaseAdmin
        .from("user_sessions")
        .select("user_id, is_active");

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));

      const sessionCounts = new Map<string, number>();
      for (const s of sessions || []) {
        if (s.is_active) {
          sessionCounts.set(s.user_id, (sessionCounts.get(s.user_id) || 0) + 1);
        }
      }

      const users = (authUsers || []).map(u => {
        const profile = profileMap.get(u.id);
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || "",
          avatar_url: profile?.avatar_url || "",
          banner_url: profile?.banner_url || "",
          role: roleMap.get(u.id) || "user",
          is_suspended: profile?.is_suspended || false,
          suspended_reason: profile?.suspended_reason || "",
          email_confirmed: !!u.email_confirmed_at,
          active_sessions: sessionCounts.get(u.id) || 0,
          created_at: u.created_at,
          last_sign_in: u.last_sign_in_at,
        };
      });

      return jsonResp({ users });
    }

    // ─── SUSPEND USER ───
    if (action === "suspend") {
      if (!isAdmin) return jsonResp({ error: "Only admins can suspend users" }, 403);
      const { user_id, reason } = body;
      if (!user_id) return jsonResp({ error: "user_id required" }, 400);
      if (user_id === callingUser.id) return jsonResp({ error: "Cannot suspend yourself" }, 400);

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          is_suspended: true,
          suspended_reason: reason || "Suspended by admin",
        })
        .eq("id", user_id);

      if (error) return jsonResp({ error: error.message }, 400);
      return jsonResp({ success: true });
    }

    // ─── UNSUSPEND USER ───
    if (action === "unsuspend") {
      if (!isAdmin) return jsonResp({ error: "Only admins can unsuspend users" }, 403);
      const { user_id } = body;
      if (!user_id) return jsonResp({ error: "user_id required" }, 400);

      await supabaseAdmin
        .from("profiles")
        .update({ is_suspended: false, suspended_reason: "" })
        .eq("id", user_id);

      await supabaseAdmin
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", user_id);

      return jsonResp({ success: true });
    }

    // ─── CLEAR SESSIONS ───
    if (action === "clear_sessions") {
      if (!isAdmin) return jsonResp({ error: "Only admins can clear sessions" }, 403);
      const { user_id } = body;
      if (!user_id) return jsonResp({ error: "user_id required" }, 400);

      await supabaseAdmin
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", user_id);

      return jsonResp({ success: true });
    }

    // ─── CREATE USER (super_admin only) ───
    if (action === "create") {
      if (!isSuperAdmin) return jsonResp({ error: "Only super admins can create users" }, 403);

      const { password, role } = body;
      const email = (body.email || "").trim().toLowerCase();
      if (!email || !password || !role) return jsonResp({ error: "Email, password, and role are required" }, 400);
      if (!["super_admin", "admin", "user"].includes(role)) return jsonResp({ error: "Invalid role" }, 400);

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) return jsonResp({ error: createError.message }, 400);

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });
      if (roleError) return jsonResp({ error: roleError.message }, 400);

      return jsonResp({ success: true, user_id: newUser.user.id });
    }

    // ─── LIST (admin roles only — legacy) ───
    if (action === "list") {
      if (!isSuperAdmin) return jsonResp({ error: "Only super admins can manage users" }, 403);

      const { data: rolesData, error } = await supabaseAdmin.from("user_roles").select("*");
      if (error) return jsonResp({ error: error.message }, 400);

      const users = [];
      for (const r of rolesData || []) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        if (user) {
          users.push({ id: user.id, email: user.email, role: r.role, created_at: user.created_at });
        }
      }
      return jsonResp({ users });
    }

    // ─── DELETE USER ───
    if (action === "delete") {
      if (!isSuperAdmin) return jsonResp({ error: "Only super admins can delete users" }, 403);
      const { user_id } = body;
      if (!user_id) return jsonResp({ error: "user_id required" }, 400);
      if (user_id === callingUser.id) return jsonResp({ error: "Cannot delete yourself" }, 400);

      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_sessions").delete().eq("user_id", user_id);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) return jsonResp({ error: deleteError.message }, 400);

      return jsonResp({ success: true });
    }

    // ─── UPDATE ROLE ───
    if (action === "update_role") {
      if (!isSuperAdmin) return jsonResp({ error: "Only super admins can update roles" }, 403);
      const { user_id, role } = body;
      if (!user_id || !role) return jsonResp({ error: "user_id and role required" }, 400);

      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from("user_roles").update({ role }).eq("user_id", user_id);
      } else {
        await supabaseAdmin.from("user_roles").insert({ user_id, role });
      }

      return jsonResp({ success: true });
    }

    return jsonResp({ error: "Invalid action" }, 400);
  } catch (err) {
    return jsonResp({ error: err.message }, 500);
  }
});
