"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ReportProgressStep } from "@/lib/services/reportService";

interface ReportProgressModalProps {
  isOpen: boolean;
  searchId: string;
  accessToken: string;
  onClose: () => void;
  onError: (message: string) => void;
}

interface ProgressStep {
  id: ReportProgressStep;
  label: string;
  icon: React.ReactNode;
}

const PROGRESS_STEPS: ProgressStep[] = [
  {
    id: "initializing",
    label: "Firing up the engines",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: "fetching_data",
    label: "Gathering the juicy data",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "sentiment_analysis",
    label: "Picking out the hot takes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  {
    id: "fetching_comments",
    label: "Connecting the dots",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
    ),
  },
  {
    id: "calculating_metrics",
    label: "Calculating the numbers",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "ai_analysis",
    label: "Packaging your insights",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
];

// Spinner component
const Spinner = () => (
  <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// Checkmark component
const Checkmark = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function ReportProgressModal({
  isOpen,
  searchId,
  accessToken,
  onClose,
  onError,
}: ReportProgressModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ReportProgressStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<ReportProgressStep>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const hasStarted = useRef(false);

  // Use refs for callbacks to prevent startStream from changing identity
  // when parent re-renders (which would cause useEffect cleanup to abort the stream)
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const startStream = useCallback(() => {
    if (!searchId || !accessToken) return;

    // Use fetch with streaming
    const controller = new AbortController();

    fetch(`/api/report/start/stream?searchId=${encodeURIComponent(searchId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to start report generation");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        // Helper to process SSE data
        const processData = (data: { type: string; step?: string; reportId?: string; message?: string }) => {
          if (data.type === "progress" && data.step) {
            // Use functional setState to get previous step without dependency
            setCurrentStep((prevStep) => {
              if (prevStep) {
                setCompletedSteps((prev) => new Set([...prev, prevStep]));
              }
              return data.step as ReportProgressStep;
            });
          }

          if (data.type === "complete" && data.reportId) {
            // Mark all steps as completed
            setCompletedSteps(new Set(PROGRESS_STEPS.map((s) => s.id)));
            setCurrentStep(null);
            setIsComplete(true);
            setReportId(data.reportId);

            // Navigate immediately to the report
            router.push(`/report/${data.reportId}`);
          }

          if (data.type === "error") {
            onErrorRef.current(data.message || "An error occurred");
            onCloseRef.current();
          }
        };

        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: !done });
          }

          // Process complete SSE messages
          const lines = buffer.split("\n\n");
          buffer = done ? "" : (lines.pop() || "");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                processData(data);
              } catch {
                // Ignore JSON parse errors for incomplete data
              }
            }
          }

          if (done) break;
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Stream error:", error);
          onErrorRef.current(error.message);
          onCloseRef.current();
        }
      });

    return () => controller.abort();
  }, [searchId, accessToken, router]);

  useEffect(() => {
    if (isOpen && searchId && accessToken && !hasStarted.current) {
      hasStarted.current = true;
      const cleanup = startStream();
      return cleanup;
    }
  }, [isOpen, searchId, accessToken, startStream]);

  // Update completed steps when current step changes
  useEffect(() => {
    if (currentStep) {
      const stepIndex = PROGRESS_STEPS.findIndex((s) => s.id === currentStep);
      if (stepIndex > 0) {
        const previousSteps = PROGRESS_STEPS.slice(0, stepIndex).map((s) => s.id);
        setCompletedSteps((prev) => new Set([...prev, ...previousSteps]));
      }
    }
  }, [currentStep]);

  if (!isOpen) return null;

  const getStepStatus = (stepId: ReportProgressStep) => {
    if (completedSteps.has(stepId)) return "complete";
    if (currentStep === stepId) return "active";
    return "pending";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isComplete ? "Report Ready!" : "Generating Results"}
          </h2>
          <p className="text-gray-500">
            {isComplete
              ? "Your report is ready to view"
              : "This may take up to 5 minutes."}
          </p>
          {!isComplete && (
            <p className="text-gray-400 text-sm mt-2 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              We&apos;ll email you when your report is ready
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {PROGRESS_STEPS.map((step) => {
            const status = getStepStatus(step.id);
            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${
                  status === "active"
                    ? "bg-blue-50"
                    : status === "complete"
                    ? "bg-green-50/50"
                    : "bg-gray-50"
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 transition-colors duration-300 ${
                    status === "active"
                      ? "text-blue-500"
                      : status === "complete"
                      ? "text-green-500"
                      : "text-gray-300"
                  }`}
                >
                  {step.icon}
                </div>

                {/* Label */}
                <span
                  className={`flex-1 font-medium transition-colors duration-300 ${
                    status === "active"
                      ? "text-gray-900"
                      : status === "complete"
                      ? "text-gray-700"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {status === "active" && <Spinner />}
                  {status === "complete" && <Checkmark />}
                  {status === "pending" && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex justify-center">
          {isComplete ? (
            <button
              onClick={() => router.push(`/report/${reportId}`)}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              View Report
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Start new search
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
