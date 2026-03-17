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
    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-md border", styles[level])}>
      {level}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const styles = {
    Low: "bg-emerald-100 text-emerald-800",
    Medium: "bg-amber-100 text-amber-800",
    High: "bg-rose-100 text-rose-800",
  };

  return (
    <span className={cn("px-3 py-1 text-xs font-semibold rounded-full", styles[level])}>
      {level} Risk
    </span>
  );
}

export function RecommendationBadge({ recommendation }: { recommendation: AIRecommendation }) {
  if (recommendation === "Approve") {
    return (
      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 w-fit">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Approve</span>
      </div>
    );
  }
  if (recommendation === "Review") {
    return (
      <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100 w-fit">
        <Eye className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Review</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 w-fit">
      <XCircle className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">Reject</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  if (status === "Pending") return null;
  
  if (status === "Approved") {
    return (
      <div className="flex items-center gap-1 text-emerald-600">
        <Check className="w-4 h-4" />
        <span className="text-sm font-medium">Approved</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-rose-600">
      <X className="w-4 h-4" />
      <span className="text-sm font-medium">Rejected</span>
    </div>
  );
}

export function FlagChip({ flag }: { flag: string }) {
  const isMissingReceipt = flag === "Missing Receipt";
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      isMissingReceipt 
        ? "bg-rose-50 text-rose-700 border-rose-200" 
        : "bg-amber-50 text-amber-700 border-amber-200"
    )}>
      <AlertTriangle className="w-3 h-3" />
      {flag}
    </span>
  );
}
