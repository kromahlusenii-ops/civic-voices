"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface BillingStatus {
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  credits: {
    monthly: number;
    bonus: number;
    total: number;
  };
  currentPeriodEnd: string | null;
  trialEndDate: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  billing: BillingStatus | null;
  billingLoading: boolean;
  getAccessToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshBilling: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  billing: null,
  billingLoading: false,
  getAccessToken: async () => null,
  signOut: async () => {},
  refreshBilling: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const fetchBilling = useCallback(async (accessToken: string) => {
    try {
      setBillingLoading(true);
      const response = await fetch("/api/billing/status", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBilling({
          subscriptionStatus: data.subscription?.status || "free",
          subscriptionPlan: data.subscription?.plan || null,
          credits: data.credits || { monthly: 0, bonus: 0, total: 0 },
          currentPeriodEnd: data.subscription?.currentPeriodEnd || null,
          trialEndDate: data.subscription?.trialEndDate || null,
        });
      } else {
        // Set default free billing status on error so user can at least use free features
        console.error("Billing API error:", response.status);
        setBilling({
          subscriptionStatus: "free",
          subscriptionPlan: null,
          credits: { monthly: 0, bonus: 0, total: 0 },
          currentPeriodEnd: null,
          trialEndDate: null,
        });
      }
    } catch (error) {
      console.error("Failed to fetch billing status:", error);
      // Set default free billing status on error
      setBilling({
        subscriptionStatus: "free",
        subscriptionPlan: null,
        credits: { monthly: 0, bonus: 0, total: 0 },
        currentPeriodEnd: null,
        trialEndDate: null,
      });
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);

      // Fetch billing if authenticated
      if (session?.access_token) {
        fetchBilling(session.access_token);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);

      // Fetch billing if authenticated
      if (session?.access_token) {
        fetchBilling(session.access_token);
      } else {
        setBilling(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchBilling]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setBilling(null);
  }, []);

  const refreshBilling = useCallback(async (): Promise<void> => {
    const accessToken = await getAccessToken();
    if (accessToken) {
      await fetchBilling(accessToken);
    }
  }, [getAccessToken, fetchBilling]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user,
        billing,
        billingLoading,
        getAccessToken,
        signOut,
        refreshBilling,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
