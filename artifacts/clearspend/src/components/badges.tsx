import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, XCircle, Eye, AlertTriangle, Check, X } from "lucide-react";
import { AIConfidence, AIRecommendation, RiskLevel, ExpenseStatus } from "@/data/mock-expenses";

export function ConfidenceBadge({ level }: { level: AIConfidence }) {
  const styles = {
    High: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    Low: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span className={cn("px-2 py-0.5 text-[11px] font-medium rounded-md border", styles[level])}>
      {level}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const dotStyles = {
    Low: "bg-emerald-500",
    Medium: "bg-amber-500",
    High: "bg-rose-500",
  };
  const textStyles = {
    Low: "text-emerald-700",
    Medium: "text-amber-700",
    High: "text-rose-700",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-1.5 h-1.5 rounded-full", dotStyles[level])} />
      <span className={cn("text-[12px] font-medium", textStyles[level])}>{level} Risk</span>
    </span>
  );
}

export function RecommendationBadge({ recommendation }: { recommendation: AIRecommendation }) {
  if (recommendation === "Approve") {
    return (
      <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">
        <CheckCircle2 className="w-3 h-3" />
        <span className="text-[11px] font-medium">Approve</span>
      </div>
    );
  }
  if (recommendation === "Review") {
    return (
      <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">
        <Eye className="w-3 h-3" />
        <span className="text-[11px] font-medium">Review</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 w-fit">
      <XCircle className="w-3 h-3" />
      <span className="text-[11px] font-medium">Reject</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  if (status === "Pending") return null;
  
  if (status === "Approved") {
    return (
      <div className="flex items-center gap-1 text-emerald-600">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="text-[12px] font-medium">Approved</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-rose-600">
      <XCircle className="w-3.5 h-3.5" />
      <span className="text-[12px] font-medium">Rejected</span>
    </div>
  );
}

export function FlagChip({ flag }: { flag: string }) {
  const isMissingReceipt = flag === "Missing Receipt";
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
      isMissingReceipt 
        ? "bg-rose-50 text-rose-700 border-rose-200" 
        : "bg-amber-50 text-amber-700 border-amber-200"
    )}>
      <AlertTriangle className="w-3 h-3" />
      {flag}
    </span>
  );
}
