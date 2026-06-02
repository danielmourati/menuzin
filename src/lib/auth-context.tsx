import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  tenant_id: string | null;
  full_name: string;
  email: string | null;
  must_change_password: boolean;
};

type AuthRole = "owner" | "admin" | "staff" | "platform_admin";

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AuthRole[];
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

async function loadProfileAndRoles(userId: string): Promise<{ profile: Profile | null; roles: AuthRole[] }> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, tenant_id, full_name, email").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  return {
    profile: (profile as Profile | null) ?? null,
    roles: (roles ?? []).map((r) => r.role as AuthRole),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AuthRole[]>([]);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setUser(data.session?.user ?? null);
    if (data.session?.user) {
      const { profile, roles } = await loadProfileAndRoles(data.session.user.id);
      setProfile(profile);
      setRoles(roles);
    } else {
      setProfile(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock with onAuthStateChange
        setTimeout(() => {
          loadProfileAndRoles(sess.user.id).then(({ profile, roles }) => {
            if (!mounted) return;
            setProfile(profile);
            setRoles(roles);
          });
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    refresh().finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => ({
    loading,
    user,
    session,
    profile,
    roles,
    isAuthenticated: !!user,
    isPlatformAdmin: roles.includes("platform_admin"),
    signOut: async () => { await supabase.auth.signOut(); },
    refresh,
  }), [loading, user, session, profile, roles]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
