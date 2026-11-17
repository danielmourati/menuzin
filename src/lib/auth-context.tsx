import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

export const AuthContext = createContext<AuthState | undefined>(undefined);

async function loadProfileAndRoles(userId: string): Promise<{ profile: Profile | null; roles: AuthRole[] }> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, tenant_id, full_name, email, must_change_password").eq("id", userId).maybeSingle(),
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
  const loadedUserIdRef = useRef<string | null>(null);

  const applyUser = (nextUser: User | null) => {
    if (!nextUser) {
      setUser(null);
      return;
    }
    setUser((prev) =>
      prev?.id === nextUser.id && prev?.email === nextUser.email ? prev : nextUser,
    );
  };

  const applyProfile = (nextProfile: Profile | null) => {
    setProfile((prev) =>
      JSON.stringify(prev) === JSON.stringify(nextProfile) ? prev : nextProfile,
    );
  };

  const applyRoles = (nextRoles: AuthRole[]) => {
    setRoles((prev) =>
      JSON.stringify(prev) === JSON.stringify(nextRoles) ? prev : nextRoles,
    );
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // Sessão guardada pode estar expirada/revogada: valida no servidor.
      const { error } = await supabase.auth.getUser();
      if (error && (error.status === 401 || error.status === 403 || /invalid|expired|not found/i.test(error.message))) {
        await supabase.auth.signOut({ scope: "local" });
        loadedUserIdRef.current = null;
        setSession(null);
        applyUser(null);
        applyProfile(null);
        applyRoles([]);
        return;
      }
    }
    setSession((prev) =>
      prev?.access_token === data.session?.access_token ? prev : data.session,
    );
    if (data.session?.user) {
      const { profile: nextProfile, roles: nextRoles } = await loadProfileAndRoles(data.session.user.id);
      loadedUserIdRef.current = data.session.user.id;
      applyUser(data.session.user);
      applyProfile(nextProfile);
      applyRoles(nextRoles);
    } else {
      loadedUserIdRef.current = null;
      applyUser(null);
      applyProfile(null);
      applyRoles([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mounted) return;
      setSession((prev) => (prev?.access_token === sess?.access_token ? prev : sess));
      if (sess?.user) {
        const isSameUser = loadedUserIdRef.current === sess.user.id;
        if (isSameUser && event === "TOKEN_REFRESHED") {
          applyUser(sess.user);
          return;
        }
        if (!isSameUser) {
          setLoading(true);
        }
        // defer to avoid deadlock with onAuthStateChange
        setTimeout(() => {
          loadProfileAndRoles(sess.user.id)
            .then(({ profile: nextProfile, roles: nextRoles }) => {
              if (!mounted) return;
              loadedUserIdRef.current = sess.user.id;
              applyUser(sess.user);
              applyProfile(nextProfile);
              applyRoles(nextRoles);
              setLoading(false);
            })
            .catch(() => {
              if (!mounted) return;
              loadedUserIdRef.current = sess.user.id;
              applyUser(sess.user);
              setLoading(false);
            });
        }, 0);
      } else {
        loadedUserIdRef.current = null;
        applyUser(null);
        applyProfile(null);
        applyRoles([]);
        setLoading(false);
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
