import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
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
  role: 'dpp' | 'dpw' | 'peternak' | 'superadmin';
  status: 'pending' | 'approved' | 'rejected';
  province?: string;
  house_address?: string;
  work_address?: string;
}

const AUTH_STORAGE_KEY_PART = '-auth-token';

function clearClientAuthStorage() {
  const clearFromStorage = (storage: Storage) => {
    Object.keys(storage)
      .filter((key) => key.includes(AUTH_STORAGE_KEY_PART))
      .forEach((key) => storage.removeItem(key));
  };

  try {
    clearFromStorage(localStorage);
    clearFromStorage(sessionStorage);
  } catch {
    // ignore storage access errors
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  signOut: async () => {},
  isSuperadmin: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const isSuperadmin = profile?.role === 'superadmin';

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return (data as UserProfile | null) ?? null;
  }, []);

  const syncAuthState = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const nextProfile = await fetchProfile(nextSession.user.id);
        setProfile(nextProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    },
    [fetchProfile]
  );

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;
      await syncAuthState(nextSession);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        void applySession(currentSession);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

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
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, profile, signOut, isSuperadmin }}>{children}</AuthContext.Provider>;
}
