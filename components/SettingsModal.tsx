"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

type SettingsTab = "credit_usage" | "plan_billing" | "team_members" | "integrations";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icons as inline SVGs for consistency
const CreditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path strokeWidth="2" d="M12 6v6l4 2" />
  </svg>
);

const BillingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
    <path strokeWidth="2" d="M2 10h20" />
  </svg>
);

const TeamIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" strokeWidth="2" />
    <path strokeWidth="2" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IntegrationsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("credit_usage");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { signOut: supabaseSignOut } = useAuth();
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogout = async () => {
    console.log("Starting logout...");
    setIsLoggingOut(true);
    try {
      // Clear Supabase session
      console.log("Clearing Supabase session...");
      await supabaseSignOut();
      console.log("Supabase session cleared, redirecting...");
      // Close modal and redirect to home
      onClose();
      router.push("/");
      // Force a full page reload to clear all state
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { id: "credit_usage" as const, label: "Credit usage", icon: CreditIcon, disabled: false },
    { id: "plan_billing" as const, label: "Plan & Billing", icon: BillingIcon, disabled: false },
    { id: "team_members" as const, label: "Team & Members", icon: TeamIcon, disabled: false },
    { id: "integrations" as const, label: "Integrations", icon: IntegrationsIcon, disabled: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl z-[70]">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Log out?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close settings"
        >
          <CloseIcon />
        </button>

        {/* Left Sidebar */}
        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => !item.disabled && setActiveTab(item.id)}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    item.disabled
                      ? "text-gray-400 cursor-not-allowed"
                      : activeTab === item.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </button>
                {item.disabled && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Coming soon
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogoutIcon />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "credit_usage" && <CreditUsageTab />}
          {activeTab === "plan_billing" && <PlanBillingTab />}
          {activeTab === "team_members" && <TeamMembersTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
        </div>
      </div>
    </div>
  );
}

// Credit Usage Tab
function CreditUsageTab() {
  const { getAccessToken } = useAuth();
  const [billingData, setBillingData] = useState<{
    subscription: { plan: string | null };
    credits: { monthly: number; bonus: number; total: number; resetDate: string | null };
    recentTransactions: Array<{ id: string; amount: number; type: string; description: string | null; createdAt: string }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/billing/status", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBillingData(data);
        }
      } catch (error) {
        console.error("Failed to fetch billing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchBillingData();

    // Poll for updates every 10 seconds
    const pollInterval = setInterval(fetchBillingData, 10000);

    return () => clearInterval(pollInterval);
  }, [getAccessToken]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <SpinnerIcon />
      </div>
    );
  }

  const credits = billingData?.credits || { monthly: 0, bonus: 0, total: 0, resetDate: null };
  const transactions = billingData?.recentTransactions || [];
  // Get plan-specific max credits (Pro=50, Agency=150, Business=400)
  const plan = billingData?.subscription?.plan || "pro";
  const planCredits: Record<string, number> = { pro: 50, agency: 150, business: 400 };
  const totalCredits = planCredits[plan] || 50;
  const percentUsed = totalCredits > 0 ? ((totalCredits - credits.total) / totalCredits) * 100 : 0;
  const resetDate = credits.resetDate ? new Date(credits.resetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";

  const formatActivityType = (type: string) => {
    switch (type) {
      case "search_usage": return "Search";
      case "report_generation": return "Report";
      case "monthly_reset": return "Monthly Reset";
      case "overage_purchase": return "Credit Purchase";
      default: return type;
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Credit usage</h3>

      {/* Credits Card */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">Credits available</span>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeWidth="2" d="M12 16v-4M12 8h.01" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeWidth="2" d="M12 6v6l4 2" />
            </svg>
            <span className="font-medium">{credits.total}/{totalCredits}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(0, 100 - percentUsed)}%` }}
          />
        </div>

        {/* Credit breakdown */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-gray-600">Monthly: {credits.monthly}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Bonus: {credits.bonus}</span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CheckIcon />
            <span>Monthly credits reset on {resetDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckIcon />
            <span>Bonus credits never expire</span>
          </div>
        </div>
      </div>

      {/* Usage History */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Usage history</h4>
        </div>
        {transactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No transactions yet
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{formatActivityType(item.type)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(item.createdAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-medium ${item.amount >= 0 ? "text-green-600" : "text-gray-900"}`}>
                    {item.amount >= 0 ? "+" : ""}{item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Plan & Billing Tab
function PlanBillingTab() {
  const { getAccessToken } = useAuth();
  const [billingData, setBillingData] = useState<{
    subscription: { status: string; plan: string | null; currentPeriodEnd: string | null; trialEndDate: string | null };
    credits: { monthly: number; bonus: number; total: number; resetDate: string | null };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null); // Track which plan is loading
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Plan configurations
  const planConfig = {
    pro: { name: "Pro", price: 99, credits: 50, users: 1 },
    agency: { name: "Agency", price: 249, credits: 150, users: 3 },
    business: { name: "Business", price: 499, credits: 400, users: 5 },
  };

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/billing/status", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBillingData(data);
        }
      } catch (error) {
        console.error("Failed to fetch billing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingData();
  }, [getAccessToken]);

  const handleStartTrial = async (plan: "pro" | "agency" | "business" = "pro") => {
    try {
      setIsCheckoutLoading(plan);
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to process request");
        return;
      }

      if (data.url) {
        // New subscription - redirect to Stripe checkout
        window.location.href = data.url;
      } else if (data.success) {
        // Upgrade successful - refresh billing data and show success
        alert(data.message || `Successfully upgraded to ${plan} plan!`);
        // Refresh the page to show updated plan
        window.location.reload();
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  const handleManagePlan = async () => {
    try {
      setIsPortalLoading(true);
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true);
      setCancelError(null);
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setCancelError(data.error || "Failed to cancel subscription");
        return;
      }

      // Update local state to reflect cancellation
      setBillingData((prev) =>
        prev
          ? {
              ...prev,
              subscription: {
                ...prev.subscription,
                status: "canceled",
              },
            }
          : null
      );
      setShowCancelConfirm(false);
    } catch (error) {
      console.error("Cancel error:", error);
      setCancelError("Failed to cancel subscription. Please try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <SpinnerIcon />
      </div>
    );
  }

  const subscription = billingData?.subscription || { status: "free", plan: null, currentPeriodEnd: null, trialEndDate: null };
  const isSubscribed = subscription.status === "active" || subscription.status === "trialing";
  const isTrial = subscription.status === "trialing";
  const isCanceled = subscription.status === "canceled";

  const getStatusLabel = () => {
    switch (subscription.status) {
      case "active": return "Active";
      case "trialing": return "Trial";
      case "canceled": return "Canceled";
      case "past_due": return "Past Due";
      default: return "Free";
    }
  };

  const getStatusColor = () => {
    switch (subscription.status) {
      case "active": return "bg-green-100 text-green-800";
      case "trialing": return "bg-blue-100 text-blue-800";
      case "canceled": return "bg-orange-100 text-orange-800";
      case "past_due": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="p-6">
      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl z-[70]">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel subscription?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel your {planConfig[subscription.plan as keyof typeof planConfig]?.name || "Pro"} subscription? You&apos;ll lose access to:
            </p>
            <ul className="text-sm text-gray-600 mb-4 space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-red-500">✕</span>
                {planConfig[subscription.plan as keyof typeof planConfig]?.credits || 50} monthly credits
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✕</span>
                AI-powered reports
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✕</span>
                All search timeframes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✕</span>
                Export functionality
              </li>
            </ul>
            {subscription.currentPeriodEnd && (
              <p className="text-sm text-gray-500 mb-4">
                You&apos;ll have access until {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
              </p>
            )}
            {cancelError && (
              <p className="text-sm text-red-600 mb-4">{cancelError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelError(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Keep subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {isCanceling ? "Canceling..." : "Cancel subscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-xl font-semibold text-gray-900 mb-6">Plan & Billing</h3>

      {/* Current Plan Status - only show for subscribed or canceled users */}
      {(isSubscribed || isCanceled) && (
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-lg font-semibold text-gray-900">{planConfig[subscription.plan as keyof typeof planConfig]?.name || "Pro"} Plan</p>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor()}`}>
                  {getStatusLabel()}
                </span>
              </div>
              {isSubscribed && subscription.currentPeriodEnd && (
                <p className="text-sm text-gray-500">
                  {isTrial ? "Trial ends" : "Renews"} on {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
              {isCanceled && subscription.currentPeriodEnd && (
                <p className="text-sm text-gray-500">
                  Access ends on {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            {isSubscribed ? (
              <button
                onClick={handleManagePlan}
                disabled={isPortalLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
              >
                {isPortalLoading ? <SpinnerIcon /> : "Manage plan"}
              </button>
            ) : (
              <button
                onClick={() => handleStartTrial((subscription.plan as "pro" | "agency" | "business") || "pro")}
                disabled={isCheckoutLoading !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isCheckoutLoading ? <SpinnerIcon /> : "Resubscribe"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pro Plan */}
        <div className={`border rounded-xl p-5 ${(isSubscribed || isCanceled) && subscription.plan === "pro" ? "border-blue-200 bg-blue-50/30" : "border-gray-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900">Pro</h4>
            {!isSubscribed && !isCanceled && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Recommended</span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">$99<span className="text-sm font-normal text-gray-500">/month</span></p>

          {isSubscribed && subscription.plan === "pro" ? (
            <div className="w-full py-2 px-3 bg-green-100 text-green-700 rounded-lg font-medium mb-3 text-center text-sm">
              {isTrial ? "Trial active" : "Current plan"}
            </div>
          ) : isCanceled ? (
            <button
              onClick={() => handleStartTrial("pro")}
              disabled={isCheckoutLoading === "pro"}
              className="w-full py-2 px-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3 disabled:opacity-50 text-sm"
            >
              {isCheckoutLoading === "pro" ? <SpinnerIcon /> : "Resubscribe"}
            </button>
          ) : isSubscribed ? (
            <div className="w-full py-2 px-3 bg-gray-100 text-gray-500 rounded-lg font-medium mb-3 text-center text-sm">
              Downgrade
            </div>
          ) : (
            <button
              onClick={() => handleStartTrial("pro")}
              disabled={isCheckoutLoading === "pro"}
              className="w-full py-2 px-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3 disabled:opacity-50 text-sm"
            >
              {isCheckoutLoading === "pro" ? <SpinnerIcon /> : "Start Free Trial"}
            </button>
          )}

          <ul className="space-y-1.5">
            {[
              "50 credits / month",
              "1 user",
              "All search timeframes",
              "AI-powered reports",
              "PDF report generator",
              "Shareable reports",
              "Email alerts",
              "Export data",
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckIcon />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Agency Plan */}
        <div className={`border rounded-xl p-5 ${(isSubscribed || isCanceled) && subscription.plan === "agency" ? "border-blue-200 bg-blue-50/30" : "border-gray-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900">Agency</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">$249<span className="text-sm font-normal text-gray-500">/month</span></p>

          {isSubscribed && subscription.plan === "agency" ? (
            <div className="w-full py-2 px-3 bg-green-100 text-green-700 rounded-lg font-medium mb-3 text-center text-sm">
              {isTrial ? "Trial active" : "Current plan"}
            </div>
          ) : isCanceled ? (
            <button
              onClick={() => handleStartTrial("agency")}
              disabled={isCheckoutLoading === "agency"}
              className="w-full py-2 px-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3 disabled:opacity-50 text-sm"
            >
              {isCheckoutLoading === "agency" ? <SpinnerIcon /> : "Resubscribe"}
            </button>
          ) : (
            <button
              onClick={() => handleStartTrial("agency")}
              disabled={isCheckoutLoading === "agency"}
              className="w-full py-2 px-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3 disabled:opacity-50 text-sm"
            >
              {isCheckoutLoading === "agency" ? <SpinnerIcon /> : isSubscribed ? "Upgrade" : "Start Free Trial"}
            </button>
          )}

          <ul className="space-y-1.5">
            {[
              "150 credits / month",
              "3 users",
              "Everything in Pro",
              "Client workspaces (coming soon)",
              "Team collaboration (coming soon)",
              "Priority support",
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckIcon />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Business Plan */}
        <div className={`border rounded-xl p-5 ${(isSubscribed || isCanceled) && subscription.plan === "business" ? "border-blue-200 bg-blue-50/30" : "border-gray-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900">Business</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">$499<span className="text-sm font-normal text-gray-500">/month</span></p>

          {isSubscribed && subscription.plan === "business" ? (
            <div className="w-full py-2 px-3 bg-green-100 text-green-700 rounded-lg font-medium mb-3 text-center text-sm">
              {isTrial ? "Trial active" : "Current plan"}
            </div>
          ) : isCanceled ? (
            <button
              onClick={() => handleStartTrial("business")}
              disabled={isCheckoutLoading === "business"}
              className="w-full py-2 px-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3 disabled:opacity-50 text-sm"
            >
              {isCheckoutLoading === "business" ? <SpinnerIcon /> : "Resubscribe"}
            </button>
          ) : (
            <button
              onClick={() => handleStartTrial("business")}
              disabled={isCheckoutLoading === "business"}
              className="w-full py-2 px-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3 disabled:opacity-50 text-sm"
            >
              {isCheckoutLoading === "business" ? <SpinnerIcon /> : isSubscribed ? "Upgrade" : "Start Free Trial"}
            </button>
          )}

          <ul className="space-y-1.5">
            {[
              "400 credits / month",
              "5 users",
              "Everything in Agency",
              "Advanced analytics (coming soon)",
              "API access (coming soon)",
              "Dedicated support",
              "Additional seats: $49/seat (coming soon)",
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckIcon />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cancel Membership */}
      {isSubscribed && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Cancel membership
          </button>
        </div>
      )}
    </div>
  );
}

// Team & Members Tab
interface OrganizationMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface OrganizationInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface SeatInfo {
  includedSeats: number;
  additionalSeats: number;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  canAddSeats: boolean;
  pricePerSeat: number;
}

interface OrganizationData {
  id: string;
  name: string;
  ownerId: string;
  members: OrganizationMember[];
  invites: OrganizationInvite[];
}

function TeamMembersTab() {
  const { getAccessToken } = useAuth();
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [seatInfo, setSeatInfo] = useState<SeatInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isAddingSeats, setIsAddingSeats] = useState(false);
  const [seatsToAdd, setSeatsToAdd] = useState(1);
  const [showAddSeatsModal, setShowAddSeatsModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _router = useRouter();

  const fetchOrganization = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/organization", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setSeatInfo(data.seatInfo);
      }
    } catch (error) {
      console.error("Failed to fetch organization:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAccessToken]);

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) return;

    try {
      setIsCreatingOrg(true);
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch("/api/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: orgName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setSeatInfo(data.seatInfo);
        setShowCreateOrg(false);
        setOrgName("");
      } else {
        const data = await response.json();
        setActionError(data.error || "Failed to create organization");
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
      setActionError("Failed to create organization");
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      setInviteError(null);
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch("/api/organization/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || "Failed to send invite");
        return;
      }

      setInviteEmail("");
      await fetchOrganization();
    } catch (error) {
      console.error("Failed to invite:", error);
      setInviteError("Failed to send invite");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`/api/organization/members?memberId=${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        await fetchOrganization();
      } else {
        const data = await response.json();
        setActionError(data.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      setActionError("Failed to remove member");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`/api/organization/members?inviteId=${inviteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        await fetchOrganization();
      }
    } catch (error) {
      console.error("Failed to cancel invite:", error);
    }
  };

  const handleAddSeats = async () => {
    try {
      setIsAddingSeats(true);
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch("/api/organization/seats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ quantity: seatsToAdd }),
      });

      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Failed to add seats");
        return;
      }

      setSeatInfo(data.seatInfo);
      setShowAddSeatsModal(false);
      setSeatsToAdd(1);
    } catch (error) {
      console.error("Failed to add seats:", error);
      setActionError("Failed to add seats");
    } finally {
      setIsAddingSeats(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <SpinnerIcon />
      </div>
    );
  }

  // Show upgrade prompt for users without organization (Pro or free users)
  if (!organization) {
    return (
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Team & Members</h3>

        {showCreateOrg ? (
          <div className="max-w-md mx-auto bg-gray-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Create your team</h4>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Team name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {actionError && <p className="text-red-600 text-sm mb-4">{actionError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateOrg(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrganization}
                disabled={isCreatingOrg || !orgName.trim()}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {isCreatingOrg ? <SpinnerIcon /> : "Create team"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <TeamIcon />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Collaborate with your team</h4>
            <p className="text-gray-600 mb-6 max-w-sm">
              Team features are available on Agency and Business plans. Invite your team, share reports, and keep all your insights in one workspace.
            </p>
            <button
              onClick={() => setShowCreateOrg(true)}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Create team
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Requires Agency ($249/mo) or Business ($499/mo) plan
            </p>
          </div>
        )}
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _isOwner = organization.members.some(m => m.userId === organization.ownerId && m.role === "admin");
  const currentUserMember = organization.members.find(m => m.role === "admin");

  return (
    <div className="p-6">
      {/* Add Seats Modal */}
      {showAddSeatsModal && seatInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add seats</h3>
            <p className="text-gray-600 mb-4">
              Additional seats are ${(seatInfo.pricePerSeat / 100).toFixed(0)}/month each.
            </p>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setSeatsToAdd(Math.max(1, seatsToAdd - 1))}
                className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100"
              >
                -
              </button>
              <span className="text-2xl font-semibold">{seatsToAdd}</span>
              <button
                onClick={() => setSeatsToAdd(seatsToAdd + 1)}
                className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100"
              >
                +
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Total: ${((seatInfo.pricePerSeat * seatsToAdd) / 100).toFixed(0)}/month
            </p>
            {actionError && <p className="text-red-600 text-sm mb-4">{actionError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddSeatsModal(false);
                  setActionError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSeats}
                disabled={isAddingSeats}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isAddingSeats ? <SpinnerIcon /> : "Add seats"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">{organization.name}</h3>
      </div>

      {/* Seat Usage */}
      {seatInfo && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 font-medium">Seats</span>
            <span className="text-gray-600">
              {seatInfo.usedSeats} of {seatInfo.totalSeats} used
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(seatInfo.usedSeats / seatInfo.totalSeats) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {seatInfo.includedSeats} included + {seatInfo.additionalSeats} additional
            </span>
            {seatInfo.canAddSeats && (
              <button
                onClick={() => setShowAddSeatsModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add seats
              </button>
            )}
          </div>
        </div>
      )}

      {/* Invite Form */}
      {currentUserMember?.role === "admin" && seatInfo && seatInfo.availableSeats > 0 && (
        <div className="border border-gray-200 rounded-xl p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Invite a team member</h4>
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {isInviting ? <SpinnerIcon /> : "Invite"}
            </button>
          </div>
          {inviteError && <p className="text-red-600 text-sm mt-2">{inviteError}</p>}
        </div>
      )}

      {seatInfo && seatInfo.availableSeats === 0 && currentUserMember?.role === "admin" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-800">
            No seats available.{" "}
            {seatInfo.canAddSeats ? (
              <button
                onClick={() => setShowAddSeatsModal(true)}
                className="text-yellow-900 font-medium underline"
              >
                Add more seats
              </button>
            ) : (
              "Upgrade to Agency or Business to add more team members."
            )}
          </p>
        </div>
      )}

      {/* Members List */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Team members</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {organization.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                  {member.user.name?.[0] || member.user.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.user.name || member.user.email}</p>
                  <p className="text-sm text-gray-500">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  member.role === "admin" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                }`}>
                  {member.role === "admin" ? "Admin" : "Member"}
                </span>
                {member.userId === organization.ownerId && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                    Owner
                  </span>
                )}
                {currentUserMember?.role === "admin" && member.userId !== organization.ownerId && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {organization.invites.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Pending invites</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {organization.invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Pending
                  </span>
                  {currentUserMember?.role === "admin" && (
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Integrations Tab
function IntegrationsTab() {
  const integrations = [
    { name: "Slack", description: "Get notifications and reports in Slack", connected: false },
    { name: "Zapier", description: "Connect with 5000+ apps", connected: false },
    { name: "Webhook", description: "Send data to your custom endpoints", connected: false },
  ];

  const handleConnect = (name: string) => {
    alert(`Coming soon! ${name} integration will be available shortly.`);
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Integrations</h3>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <IntegrationsIcon />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{integration.name}</h4>
                <p className="text-sm text-gray-600">{integration.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleConnect(integration.name)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              Connect
            </button>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-6 text-center">
        More integrations coming soon. <a href="#" className="text-blue-600 hover:underline">Request an integration</a>
      </p>
    </div>
  );
}
