import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../constants/supabase';

type User = any;

type AuthContextType = {
  user: User | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name?: string) => Promise<any>;
  signOut: () => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch (err) {
        console.log('auth init err', err);
      } finally {
        setLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      // @ts-ignore
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    // debug: confirm provider mounted
    console.log('[AuthProvider] mounted, user:', user?.id ?? null);
  }, [user]);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const options: any = { email, password };
    if (name) {
      options.options = {
        data: {
          full_name: name,
        },
      };
    }
    return supabase.auth.signUp(options);
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  try {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
  } catch (err) {
    // Add extra diagnostic info to help track invalid hook call sources
    console.error('[useAuth] hook error - make sure useAuth is called from a React component within AuthProvider. Error:', err);
    throw err;
  }
}

export default AuthProvider;
