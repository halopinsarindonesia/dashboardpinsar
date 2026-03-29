import { createContext, useCallback, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
  isSuperadmin: boolean;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'dpp' | 'dpd' | 'dpw' | 'peternak' | 'superadmin';
  status: 'pending' | 'approved' | 'rejected';
  province?: string;
  house_address?: string;
  work_address?: string;
}

const AUTH_STORAGE_KEY_PART = '-auth-token';
const SESSION_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours
const LAST_ACTIVITY_KEY = 'pinsar-last-activity';

function clearClientAuthStorage() {
  const clearFromStorage = (storage: Storage) => {
    Object.keys(storage)
      .filter((key) => key.includes(AUTH_STORAGE_KEY_PART))
      .forEach((key) => storage.removeItem(key));
  };
  try {
    clearFromStorage(localStorage);
    clearFromStorage(sessionStorage);
  } catch {}
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, profile: null, signOut: async () => {}, isSuperadmin: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isSuperadmin = profile?.role === 'superadmin';

  // Activity tracking for 3hr timeout
  const updateActivity = useCallback(() => {
    try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch {}
  }, []);

  const checkSessionTimeout = useCallback(() => {
    try {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || '0');
      if (last > 0 && Date.now() - last > SESSION_TIMEOUT_MS) return true;
    } catch {}
    return false;
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) return null;
    return (data as UserProfile | null) ?? null;
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signout-timeout')), 4000)),
      ]);
    } catch {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      clearClientAuthStorage();
      try { localStorage.removeItem(LAST_ACTIVITY_KEY); } catch {}
      setSession(null); setUser(null); setProfile(null); setLoading(false);
    }
  }, []);

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    if (nextSession?.user) {
      // Check 3hr timeout
      if (checkSessionTimeout()) {
        await signOut();
        return;
      }
      updateActivity();
      const nextProfile = await fetchProfile(nextSession.user.id);
      setProfile(nextProfile);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [fetchProfile, checkSessionTimeout, signOut, updateActivity]);

  // Set up activity listeners and periodic timeout check
  useEffect(() => {
    const onActivity = () => updateActivity();
    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);

    timeoutRef.current = setInterval(() => {
      if (session && checkSessionTimeout()) {
        signOut();
      }
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [session, updateActivity, checkSessionTimeout, signOut]);

  useEffect(() => {
    let mounted = true;
    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;
      await syncAuthState(nextSession);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    supabase.auth.getSession()
      .then(({ data: { session: currentSession } }) => void applySession(currentSession))
      .catch(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [syncAuthState]);

  return <AuthContext.Provider value={{ user, session, loading, profile, signOut, isSuperadmin }}>{children}</AuthContext.Provider>;
}
