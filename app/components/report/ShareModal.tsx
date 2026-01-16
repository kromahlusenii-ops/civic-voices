"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/app/contexts/ToastContext";

interface ShareSettings {
  shareToken: string | null;
  shareUrl: string | null;
}

interface ShareModalProps {
  isOpen: boolean;
  reportId: string;
  reportQuery: string;
  onClose: () => void;
  getAccessToken: () => Promise<string | null>;
}

export default function ShareModal({
  isOpen,
  reportId,
  reportQuery,
  onClose,
  getAccessToken,
}: ShareModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current settings on open
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reportId]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`/api/report/${reportId}/share`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch share settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createShareLink = async () => {
    setIsSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`/api/report/${reportId}/share`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ generateToken: true }),
      });
      if (res.ok) {
        const newSettings = await res.json();
        setSettings(newSettings);
        showToast({ message: "Share link created" });
      }
    } catch (error) {
      console.error("Failed to create share link:", error);
      showToast({ message: "Failed to create link" });
    } finally {
      setIsSaving(false);
    }
  };

  const revokeShareLink = async () => {
    setIsSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`/api/report/${reportId}/share`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ revokeToken: true }),
      });
      if (res.ok) {
        const newSettings = await res.json();
        setSettings(newSettings);
        showToast({ message: "Share link revoked" });
      }
    } catch (error) {
      console.error("Failed to revoke share link:", error);
      showToast({ message: "Failed to revoke link" });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ message: "Link copied to clipboard" });
    } catch {
      showToast({ message: "Failed to copy link" });
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </div>
            <div>
              <h2
                id="share-modal-title"
                className="text-xl font-semibold text-gray-900"
              >
                Share Report
              </h2>
              <p className="text-sm text-gray-500 truncate max-w-[200px]">
                {reportQuery}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            </div>
          ) : settings?.shareToken ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Anyone with this link can view the report.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.shareUrl || ""}
                  readOnly
                  className="flex-1 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 outline-none truncate"
                />
                <button
                  onClick={() =>
                    settings.shareUrl && copyToClipboard(settings.shareUrl)
                  }
                  className="px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={revokeShareLink}
                disabled={isSaving}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {isSaving ? "Revoking..." : "Revoke Link"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Create a shareable link that anyone can use to view this report.
                You can revoke it anytime.
              </p>
              <button
                onClick={createShareLink}
                disabled={isSaving}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Creating..." : "Create Share Link"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
