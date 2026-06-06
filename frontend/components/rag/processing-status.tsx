"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Database, FileText } from "lucide-react";
import { getRAGDocumentStatus, StatusResponse } from "@/lib/api/rag";

interface ProcessingStatusProps {
  documentId: string;
  onComplete?: () => void;
}

export function ProcessingStatus({ documentId, onComplete }: ProcessingStatusProps) {
  const [statusInfo, setStatusInfo] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const statusData = await getRAGDocumentStatus(documentId);
        setStatusInfo(statusData);
        
        if (statusData.processing_status === "completed") {
          clearInterval(intervalId);
          if (onComplete) onComplete();
        } else if (statusData.processing_status === "failed") {
          clearInterval(intervalId);
          setError("Processing failed. Please try again.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch status.");
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds
    intervalId = setInterval(fetchStatus, 3000);

    return () => clearInterval(intervalId);
  }, [documentId, onComplete]);

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-400 bg-red-950/20 border border-red-900/30 p-4 rounded-xl">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">{error}</span>
      </div>
    );
  }

  if (!statusInfo) {
    return (
      <div className="flex items-center justify-center space-x-2 p-4 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Initializing status tracker...</span>
      </div>
    );
  }

  const { processing_status, progress } = statusInfo;

  const steps = [
    { id: "extracting", name: "Text Extraction", icon: FileText },
    { id: "chunking", name: "Document Chunking", icon: Database },
    { id: "embedding", name: "Vector Embedding", icon: Sparkles }
  ];

  const getStepStatus = (stepId: string) => {
    const statusOrder = ["pending", "extracting", "chunking", "embedding", "completed"];
    const currentIdx = statusOrder.indexOf(processing_status);
    const stepIdx = statusOrder.indexOf(stepId);

    if (processing_status === "failed") return "failed";
    if (currentIdx > stepIdx) return "completed";
    if (currentIdx === stepIdx) return "active";
    return "pending";
  };

  return (
    <div className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-6 backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="text-slate-200 font-semibold text-base">Processing Document</h4>
          <p className="text-slate-500 text-xs mt-0.5">Vectorizing content for semantic recall</p>
        </div>
        <div className="text-right">
          <span className="text-violet-400 font-bold text-lg">{progress.percentage}%</span>
          <p className="text-slate-500 text-[10px]">Overall Progress</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mb-6 border border-slate-800/40">
        <div
          className="bg-linear-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step) => {
          const stepStatus = getStepStatus(step.id);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2.5 rounded-xl border transition-colors duration-300 ${
                    stepStatus === "completed"
                      ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400"
                      : stepStatus === "active"
                      ? "bg-violet-950/20 border-violet-900/50 text-violet-400 animate-pulse"
                      : "bg-slate-900/40 border-slate-900 text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <span
                    className={`text-sm font-medium transition-colors ${
                      stepStatus === "active"
                        ? "text-violet-200"
                        : stepStatus === "completed"
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {step.name}
                  </span>
                  {step.id === "embedding" && stepStatus === "active" && (
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      Embedded {progress.chunks_embedded} of {progress.chunks_total} chunks
                    </p>
                  )}
                </div>
              </div>

              <div>
                {stepStatus === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : stepStatus === "active" ? (
                  <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-slate-800" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
