import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Eye, AlertTriangle, Check, X, Zap, Clock, UserCheck } from "lucide-react";
import { AIConfidence, AIRecommendation, RiskLevel, ExpenseStatus } from "@/data/mock-expenses";

export function ConfidenceBadge({ level }: { level: AIConfidence }) {
  const config = {
    High: {
      style: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <Zap className="w-3 h-3" />,
      label: "Auto-approve ready",
    },
    Medium: {
      style: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="w-3 h-3" />,
      label: "Quick review",
    },
    Low: {
      style: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <UserCheck className="w-3 h-3" />,
      label: "Manual review required",
    },
  };

  const { style, icon, label } = config[level];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap", style)}>
      {icon}
      {label}
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
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotStyles[level])} />
      <span className={cn("text-[12px] font-medium", textStyles[level])}>{level} Risk</span>
    </span>
  );
}

export function RecommendationBadge({ recommendation }: { recommendation: AIRecommendation }) {
  if (recommendation === "Approve") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold w-fit shadow-sm shadow-emerald-600/20 cursor-default select-none">
        <CheckCircle2 className="w-3 h-3" />
        Approve
      </div>
    );
  }
  if (recommendation === "Review") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[11px] font-semibold w-fit shadow-sm shadow-amber-500/20 cursor-default select-none">
        <Eye className="w-3 h-3" />
        Review
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600 text-white text-[11px] font-semibold w-fit shadow-sm shadow-rose-600/20 cursor-default select-none">
      <XCircle className="w-3 h-3" />
      Reject
    </div>
  );
}

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  if (status === "Pending") return null;

  if (status === "Approved") {
    return (
      <div className="inline-flex items-center gap-1 text-emerald-600">
        <Check className="w-3.5 h-3.5" />
        <span className="text-[12px] font-medium">Approved</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 text-rose-500">
      <X className="w-3.5 h-3.5" />
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
