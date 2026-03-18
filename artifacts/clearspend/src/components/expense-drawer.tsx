import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  X,
  FileText,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Bot,
  AlertTriangle,
  ChevronRight,
  MailQuestion,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";
import { Expense, ExpenseStatus } from "@/data/mock-expenses";
import { FlagChip, RiskBadge } from "./badges";
import { formatCurrency, cn } from "@/lib/utils";
import { useEffect } from "react";

interface ExpenseDrawerProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (id: string, action: ExpenseStatus) => void;
}

function getRecommendedAction(expense: Expense): {
  label: string;
  description: string;
  style: string;
  icon: React.ReactNode;
} {
  const hasDuplicate = expense.flags.includes("Duplicate Suspected");
  const hasMissingReceipt = expense.flags.includes("Missing Receipt");
  const hasPolicyViolation = expense.flags.includes("Policy Violation");

  if (expense.riskLevel === "High" || expense.aiRecommendation === "Reject") {
    if (hasDuplicate) {
      return {
        label: "Reject — Possible Duplicate",
        description: "A similar charge exists. Reject and ask employee to verify.",
        style: "bg-rose-50 border-rose-200 text-rose-800",
        icon: <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />,
      };
    }
    if (hasMissingReceipt) {
      return {
        label: "Request Receipt First",
        description: "Ask the employee to upload a receipt before this can be approved.",
        style: "bg-amber-50 border-amber-200 text-amber-800",
        icon: <MailQuestion className="w-4 h-4 text-amber-500 flex-shrink-0" />,
      };
    }
    return {
      label: "Reject — Policy Violation",
      description: "This expense did not follow required approval procedures.",
      style: "bg-rose-50 border-rose-200 text-rose-800",
      icon: <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />,
    };
  }

  if (expense.riskLevel === "Medium" || expense.aiRecommendation === "Review") {
    if (hasMissingReceipt) {
      return {
        label: "Request Clarification",
        description: "Missing receipt or attendee details. Ask the employee to provide more context.",
        style: "bg-amber-50 border-amber-200 text-amber-800",
        icon: <MailQuestion className="w-4 h-4 text-amber-500 flex-shrink-0" />,
      };
    }
    if (hasPolicyViolation) {
      return {
        label: "Review Policy Details",
        description: "Amount or headcount may exceed policy limits. Verify before approving.",
        style: "bg-amber-50 border-amber-200 text-amber-800",
        icon: <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />,
      };
    }
    return {
      label: "Quick Review Suggested",
      description: "Looks mostly clean but warrants a brief check before approving.",
      style: "bg-amber-50 border-amber-200 text-amber-800",
      icon: <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
    };
  }

  return {
    label: "Safe to Approve",
    description: "This expense matches policy and is ready for your approval.",
    style: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  };
}

function getPolicyNote(flag: string): string {
  if (flag === "Missing Receipt") return "Policy requires itemized receipts for all expenses over $25.";
  if (flag === "Policy Violation") return "Pre-approval is required for purchases exceeding $300 or ongoing commitments.";
  if (flag === "Duplicate Suspected") return "Submitting duplicate expenses violates the company expense policy.";
  return "";
}

function getAiSummary(expense: Expense): string {
  if (expense.aiRecommendation === "Approve") return "No policy issues detected. This expense appears valid.";
  if (expense.flags.includes("Duplicate Suspected")) return "A likely duplicate charge was detected for this employee.";
  if (expense.flags.includes("Missing Receipt") && expense.flags.includes("Policy Violation"))
    return "This expense is missing a receipt and lacks required pre-approval.";
  if (expense.flags.includes("Missing Receipt")) return "Receipt is missing, preventing full verification.";
  if (expense.flags.includes("Policy Violation")) return "This expense appears to exceed policy limits or skipped required approvals.";
  return "Some details warrant a closer look before approving.";
}

function getConfidenceLabel(level: string): string {
  if (level === "High") return "High confidence · Auto-approve ready";
  if (level === "Medium") return "Medium confidence · Quick review suggested";
  return "Low confidence · Manual review required";
}

export function ExpenseDrawer({ expense, isOpen, onClose, onAction }: ExpenseDrawerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!expense) return null;

  const isProcessed = expense.status !== "Pending";
  const isHighRisk = expense.riskLevel === "High";
  const recommendedAction = getRecommendedAction(expense);
  const aiSummary = getAiSummary(expense);
  const confidenceLabel = getConfidenceLabel(expense.aiConfidence);

  const accentColor = {
    High: "bg-rose-500",
    Medium: "bg-amber-400",
    Low: "bg-emerald-500",
  }[expense.riskLevel];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ ease: "easeOut", duration: 0.26 }}
            className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl"
          >
            {/* Top accent */}
            <div className={cn("h-[3px] w-full flex-shrink-0", accentColor)} />

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-3">
              <div className="flex-1 pr-10">
                <h2 className="text-[17px] font-semibold text-slate-900 tracking-tight leading-tight">
                  {expense.merchant}
                </h2>
                <p className="text-[12px] text-slate-400 mt-0.5">{expense.employeeName} · {expense.category}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[20px] font-bold text-slate-900 tabular-nums">{formatCurrency(expense.amount)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{format(new Date(expense.date), 'MMM d, yyyy')}</div>
              </div>
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meta row */}
            <div className="px-6 pb-4 flex items-center gap-2">
              <RiskBadge level={expense.riskLevel} />
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-[11px] text-slate-400">Submitted {formatDistanceToNow(new Date(expense.date))} ago</span>
            </div>

            <div className="px-6"><div className="h-px bg-slate-100" /></div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Processed banner */}
              {isProcessed && (
                <div className={cn(
                  "p-3 rounded-lg border flex items-center gap-2 text-sm font-medium",
                  expense.status === "Approved"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                )}>
                  {expense.status === "Approved"
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  This expense has been {expense.status.toLowerCase()}.
                </div>
              )}

              {/* ── Recommended Action ── */}
              {!isProcessed && (
                <div className={cn("rounded-xl border p-3.5 flex items-start gap-3", recommendedAction.style)}>
                  {recommendedAction.icon}
                  <div>
                    <p className="text-[13px] font-semibold leading-tight">{recommendedAction.label}</p>
                    <p className="text-[12px] mt-0.5 opacity-80 leading-snug">{recommendedAction.description}</p>
                  </div>
                </div>
              )}

              {/* Receipt */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Receipt</p>
                <div className={cn(
                  "w-full rounded-xl border flex flex-col items-center justify-center py-5 gap-2",
                  expense.receiptAvailable
                    ? "border-dashed border-slate-200 bg-slate-50/50"
                    : "bg-rose-50/60 border-rose-200/80"
                )}>
                  {expense.receiptAvailable ? (
                    <>
                      <FileText className="w-7 h-7 text-slate-300" />
                      <span className="text-[12px] text-slate-400 font-medium">Receipt attached</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6 text-rose-400" />
                      <span className="text-[12px] text-rose-600 font-semibold">No Receipt Provided</span>
                      <button className="mt-1 text-[11px] font-semibold text-rose-600 border border-rose-300 bg-white hover:bg-rose-50 transition-colors rounded-md px-3 py-1 flex items-center gap-1.5">
                        <MailQuestion className="w-3 h-3" />
                        Request receipt from employee
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expense details */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Expense Details</p>
                <dl className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
                  {[
                    { label: "Merchant", value: expense.merchant },
                    { label: "Category", value: expense.category },
                    { label: "Date", value: format(new Date(expense.date), 'MMM d, yyyy') },
                    { label: "Employee", value: expense.employeeName },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex px-3 py-2 bg-white">
                      <dt className="w-24 text-[11px] text-slate-400 uppercase tracking-wider flex-shrink-0 pt-0.5">{label}</dt>
                      <dd className="text-[13px] font-medium text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Employee note */}
              {expense.employeeNote && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Employee Note</p>
                  <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100">
                    <p className="text-[13px] text-slate-600 leading-relaxed italic">"{expense.employeeNote}"</p>
                  </div>
                </div>
              )}

              {/* ── AI Reasoning ── */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">AI Assessment</p>
                <div className="bg-indigo-950 rounded-xl overflow-hidden border border-indigo-900/50">

                  {/* AI confidence strip */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-indigo-900/60 bg-indigo-900/40">
                    <Bot className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="text-[11px] text-indigo-300 font-medium">{confidenceLabel}</span>
                  </div>

                  <div className="p-4 space-y-4">

                    {/* Summary */}
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[13px] font-semibold text-indigo-100 leading-snug">{aiSummary}</p>
                    </div>

                    {/* Key issues (flags) */}
                    {expense.flags.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Key Issues</p>
                        <ul className="space-y-1.5">
                          {expense.flags.map(flag => (
                            <li key={flag} className="flex items-center gap-2">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                flag === "Missing Receipt" ? "bg-rose-400" : "bg-amber-400"
                              )} />
                              <span className="text-[12px] text-indigo-200 font-medium">{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Full reasoning */}
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Detail</p>
                      <p className="text-[12px] text-indigo-300 leading-relaxed">{expense.aiReasoning}</p>
                    </div>

                    {/* Policy note */}
                    {expense.flags.length > 0 && (
                      <div className="pt-1 border-t border-indigo-800/60">
                        {expense.flags.map(flag => getPolicyNote(flag)).filter(Boolean).map((note, i) => (
                          <div key={i} className="flex items-start gap-1.5 mt-2">
                            <ChevronRight className="w-3 h-3 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-indigo-500 leading-snug">{note}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              </div>

            </div>

            {/* ── Action Footer ── */}
            {!isProcessed && (
              <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/60 space-y-2.5">

                {/* Primary: Clarification for risky, Approve for safe */}
                {isHighRisk ? (
                  <>
                    <button
                      className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MailQuestion className="w-4 h-4" /> Request Clarification
                    </button>
                    <button
                      onClick={() => { onAction(expense.id, "Rejected"); onClose(); }}
                      className="w-full h-10 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 shadow-md shadow-rose-600/20"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => { onAction(expense.id, "Approved"); onClose(); }}
                      className="w-full h-9 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 rounded-lg font-medium text-[12px] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve anyway
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { onAction(expense.id, "Approved"); onClose(); }}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onAction(expense.id, "Rejected"); onClose(); }}
                        className="flex-1 h-9 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-medium text-[12px] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        className="flex-1 h-9 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-[12px] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MailQuestion className="w-3.5 h-3.5" /> Ask Employee
                      </button>
                    </div>
                  </>
                )}

              </div>
            )}

            {isProcessed && (
              <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
                <button
                  onClick={() => onAction(expense.id, "Pending")}
                  className="w-full py-2 text-[12px] text-slate-400 hover:text-slate-700 font-medium transition-colors"
                >
                  Undo action
                </button>
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
