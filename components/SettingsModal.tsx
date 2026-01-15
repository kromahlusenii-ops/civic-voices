"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

type SettingsTab = "preferences" | "credit_usage" | "plan_billing" | "team_members" | "integrations";

// Suggested topics from onboarding
const SUGGESTED_TOPICS = [
  { query: "immigration", label: "Immigration" },
  { query: "AI regulation", label: "AI" },
  { query: "climate policy", label: "Climate" },
  { query: "cryptocurrency", label: "Crypto" },
  { query: "2026 elections", label: "2026 Elections" },
  { query: "tech layoffs", label: "Tech Layoffs" },
  { query: "healthcare policy", label: "Healthcare" },
  { query: "housing crisis", label: "Housing" },
];

interface TrackedTopic {
  id: string;
  query: string;
  name: string | null;
  createdAt: string;
}

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

const HelpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path strokeWidth="2" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
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

const PreferencesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <circle cx="12" cy="12" r="3" strokeWidth="2" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { signOut: supabaseSignOut, getAccessToken } = useAuth();
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
    { id: "preferences" as const, label: "Preferences", icon: PreferencesIcon },
    { id: "credit_usage" as const, label: "Credit usage", icon: CreditIcon },
    { id: "plan_billing" as const, label: "Plan & Billing", icon: BillingIcon },
    { id: "team_members" as const, label: "Team & Members", icon: TeamIcon },
    { id: "integrations" as const, label: "Integrations", icon: IntegrationsIcon },
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
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-gray-200 space-y-1">
            <a
              href="https://civicvoices.io/help"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <HelpIcon />
              <span>Get help</span>
              <ExternalLinkIcon />
            </a>
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
          {activeTab === "preferences" && <PreferencesTab getAccessToken={getAccessToken} />}
          {activeTab === "credit_usage" && <CreditUsageTab />}
          {activeTab === "plan_billing" && <PlanBillingTab />}
          {activeTab === "team_members" && <TeamMembersTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
        </div>
      </div>
    </div>
  );
}

// Preferences Tab
function PreferencesTab({ getAccessToken }: { getAccessToken: () => Promise<string | null> }) {
  const [topics, setTopics] = useState<TrackedTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/topics", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch topics");
      }

      const data = await response.json();
      setTopics(data.topics || []);
    } catch (err) {
      console.error("Error fetching topics:", err);
      setError("Failed to load topics");
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const addTopic = async (query: string) => {
    if (!query.trim()) return;

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    setIsAdding(true);
    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (response.status === 409) {
        setError("Topic already tracked");
        setTimeout(() => setError(null), 3000);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to add topic");
      }

      const data = await response.json();
      setTopics((prev) => [data.topic, ...prev]);
      setCustomTopic("");
    } catch (err) {
      console.error("Error adding topic:", err);
      setError("Failed to add topic");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsAdding(false);
    }
  };

  const deleteTopic = async (topicId: string) => {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    setDeletingId(topicId);
    try {
      const response = await fetch(`/api/topics?id=${topicId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete topic");
      }

      setTopics((prev) => prev.filter((t) => t.id !== topicId));
    } catch (err) {
      console.error("Error deleting topic:", err);
      setError("Failed to delete topic");
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTopic(customTopic);
    }
  };

  const isTopicTracked = (query: string) => {
    const normalized = query.toLowerCase().trim();
    return topics.some((t) => t.query === normalized);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <SpinnerIcon />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Preferences</h3>
      <p className="text-gray-600 mb-6">Manage the topics you want to track across social platforms.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Suggested Topics */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Suggested topics</h4>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPICS.map((topic) => {
            const isTracked = isTopicTracked(topic.query);
            return (
              <button
                key={topic.query}
                onClick={() => !isTracked && addTopic(topic.query)}
                disabled={isTracked || isAdding}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isTracked
                    ? "bg-blue-100 text-blue-700 cursor-default"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                {isTracked && (
                  <span className="inline-flex items-center gap-1">
                    <CheckIcon />
                  </span>
                )}
                {topic.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Topic Input */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Add custom topic</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a topic to track..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
          />
          <button
            onClick={() => addTopic(customTopic)}
            disabled={!customTopic.trim() || isAdding}
            className="px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? <SpinnerIcon /> : "Add"}
          </button>
        </div>
      </div>

      {/* Current Topics */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Your tracked topics ({topics.length})
        </h4>
        {topics.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <p className="text-gray-500">No topics tracked yet.</p>
            <p className="text-gray-400 text-sm mt-1">Add topics above to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900">{topic.name || topic.query}</span>
                  {topic.name && topic.name !== topic.query && (
                    <span className="text-gray-500 text-sm ml-2">({topic.query})</span>
                  )}
                </div>
                <button
                  onClick={() => deleteTopic(topic.id)}
                  disabled={deletingId === topic.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  aria-label={`Remove ${topic.name || topic.query}`}
                >
                  {deletingId === topic.id ? (
                    <SpinnerIcon />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Credit Usage Tab
function CreditUsageTab() {
  // Mock data - replace with real data from API
  const credits = {
    used: 91.5,
    total: 200,
    resetDate: "Feb 4, 2026",
  };

  const usageHistory = [
    { activity: "Tracking", date: "01/11/2026, 17:00", credits: -0.5 },
    { activity: "Report", date: "01/07/2026, 22:04", credits: -10 },
    { activity: "Report", date: "01/07/2026, 22:03", credits: -10 },
    { activity: "Report", date: "01/07/2026, 12:25", credits: -10 },
    { activity: "Report", date: "01/04/2026, 13:33", credits: -10 },
  ];

  const percentUsed = (credits.used / credits.total) * 100;

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
            <span className="font-medium">{credits.total - credits.used}/{credits.total}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${100 - percentUsed}%` }}
          />
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CheckIcon />
            <span>Monthly credits resets on {credits.resetDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckIcon />
            <span>Unused subscription credits roll over for one month</span>
          </div>
        </div>
      </div>

      {/* Usage History */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Usage history</h4>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost per action</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usageHistory.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{item.activity}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.date}</td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">—</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{item.credits} RH</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Plan & Billing Tab
function PlanBillingTab() {
  const [billingInterval, setBillingInterval] = useState<"yearly" | "monthly" | "one_time">("monthly");

  const plans = [
    {
      name: "Pro",
      price: billingInterval === "yearly" ? 39 : 49,
      period: billingInterval === "one_time" ? "" : "/month",
      features: ["200 RH / month", "$0.25 / RH", "Credits rollovers", "AI Assistant", "Tracking", "Parallel researches"],
      isCurrent: true,
    },
    {
      name: "Business",
      price: billingInterval === "yearly" ? 119 : 149,
      period: billingInterval === "one_time" ? "" : "/month",
      features: ["600 RH / month", "$0.25 / RH", "Credits rollovers", "AI Assistant", "Tracking", "Parallel researches"],
      isCurrent: false,
    },
    {
      name: "Enterprise",
      price: null,
      features: ["Custom RH limit", "API access & integrations", "Custom data sources", "Custom domain", "Unlimited seats"],
      isCurrent: false,
    },
  ];

  const handleUpgrade = () => {
    // Mock - show coming soon toast
    alert("Coming soon! Plan upgrades will be available shortly.");
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Plan & Billing</h3>

      {/* Current Plan */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">Current plan: <span className="font-semibold text-gray-900">Pro monthly</span></p>
          <p className="text-gray-500 text-sm">Credits reset on Feb 4, 2026</p>
        </div>
        <button
          onClick={handleUpgrade}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
        >
          Manage plan
        </button>
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: "yearly", label: "Yearly" },
          { id: "monthly", label: "Monthly" },
          { id: "one_time", label: "One time" },
        ].map((interval) => (
          <button
            key={interval.id}
            onClick={() => setBillingInterval(interval.id as typeof billingInterval)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === interval.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {interval.label}
          </button>
        ))}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`border rounded-xl p-6 ${
              plan.isCurrent ? "border-blue-200 bg-blue-50/30" : "border-gray-200"
            }`}
          >
            <h4 className="font-semibold text-gray-900 mb-2">{plan.name}</h4>
            {plan.price !== null ? (
              <p className="text-3xl font-bold text-gray-900 mb-4">
                ${plan.price}<span className="text-base font-normal text-gray-500">{plan.period}</span>
              </p>
            ) : (
              <p className="text-xl font-semibold text-gray-900 mb-4">Contact us</p>
            )}

            {plan.isCurrent ? (
              <button
                disabled
                className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg font-medium mb-4 cursor-not-allowed"
              >
                Current plan
              </button>
            ) : plan.price !== null ? (
              <button
                onClick={handleUpgrade}
                className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-4"
              >
                Get started
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-4"
              >
                Book a call
              </button>
            )}

            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckIcon />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// Team & Members Tab
function TeamMembersTab() {
  const handleInvite = () => {
    alert("Coming soon! Team invitations will be available with Business plan.");
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Team & Members</h3>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <TeamIcon />
        </div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Collaborate with your team</h4>
        <p className="text-gray-600 mb-6 max-w-sm">
          Invite your team, share reports, and keep all your insights in one workspace.
        </p>
        <button
          onClick={handleInvite}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Upgrade to Business
        </button>
      </div>
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
