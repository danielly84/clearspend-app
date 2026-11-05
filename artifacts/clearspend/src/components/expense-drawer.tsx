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
  Clock,
  Archive,
} from "lucide-react";
import { Expense, ExpenseStatus } from "@/data/mock-expenses";
import { RiskBadge } from "./badges";
import { RequestComposer } from "./request-composer";
import { formatCurrency, cn, focusRing } from "@/lib/utils";
import {
  REQUEST_COPY,
  REQUEST_TYPES,
  isAwaiting,
  type RequestType,
  type RequestsByExpense,
} from "@/lib/requests";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";

interface ExpenseDrawerProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (id: string, action: ExpenseStatus) => void;
  // Element to focus when the drawer closes (usually the control that opened it).
  returnFocusRef?: RefObject<HTMLElement | null>;
  requests: RequestsByExpense;
  onSendRequest: (id: string, type: RequestType, message: string) => void;
  onCancelRequest: (id: string, type: RequestType) => void;
}

const triggerId = (type: RequestType) => `request-trigger-${type}`;
const statusId = (type: RequestType) => `request-status-${type}`;

// Publishes the footer's height as --drawer-footer-height so narrow-screen toasts can sit
// just above the drawer's actions (see .toast-viewport in index.css).
function trackFooterHeight(footer: HTMLDivElement | null) {
  if (!footer) return;
  const root = document.documentElement;
  const update = () => root.style.setProperty("--drawer-footer-height", `${footer.offsetHeight}px`);
  update();
  const observer = new ResizeObserver(update);
  observer.observe(footer);
  return () => observer.disconnect();
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

export function ExpenseDrawer({
  expense: currentExpense,
  isOpen,
  onClose,
  onAction,
  returnFocusRef,
  requests: requestsByExpense,
  onSendRequest,
  onCancelRequest,
}: ExpenseDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  // Request composer currently open in the drawer, if any.
  const [composerType, setComposerType] = useState<RequestType | null>(null);
  // Id of an element to focus after the next render (falls back to the panel).
  const focusNextRef = useRef<string | null>(null);

  // Keep showing the last expense while the drawer animates out after the prop is cleared.
  const lastExpenseRef = useRef<Expense | null>(currentExpense);
  if (currentExpense) lastExpenseRef.current = currentExpense;
  const shownExpense = currentExpense ?? lastExpenseRef.current;

  // A different expense, or closing the drawer, discards an unsent request.
  useEffect(() => {
    setComposerType(null);
  }, [isOpen, shownExpense?.id]);

  const closeComposer = (focusId: string) => {
    focusNextRef.current = focusId;
    setComposerType(null);
  };

  useEffect(() => {
    const id = focusNextRef.current;
    if (!id) return;
    focusNextRef.current = null;
    const el = document.getElementById(id);
    (el && !el.hasAttribute("disabled") ? el : panelRef.current)?.focus();
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Escape closes the request composer first, then the drawer.
        if (composerType) closeComposer(triggerId(composerType));
        else onClose();
        return;
      }
      // If focus has left the active dialog (e.g. the focused button unmounted), bring it back.
      const container = composerRef.current ?? panelRef.current;
      if (e.key === "Tab" && container && !container.contains(document.activeElement)) {
        e.preventDefault();
        (container.querySelector<HTMLElement>(FOCUSABLE) ?? container).focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, composerType]);

  // Marks the page while the drawer is open so toasts move clear of it (see index.css).
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    root.setAttribute("data-drawer-open", "");
    return () => root.removeAttribute("data-drawer-open");
  }, [isOpen]);

  // Move focus into the drawer on open; return it to the opener on close.
  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus();
    } else if (wasOpenRef.current) {
      const target = returnFocusRef?.current;
      if (target?.isConnected) target.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, returnFocusRef]);

  // Keep Tab and Shift+Tab cycling within the drawer while it is open.
  const trapFocus = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // While the request composer is open, the trap cycles within it instead.
    const container = composerRef.current ?? panelRef.current;
    if (e.key !== "Tab" || !container) return;
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === container)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!shownExpense) return null;
  const expense = shownExpense;

  const isProcessed = expense.status !== "Pending";
  const isHighRisk = expense.riskLevel === "High";
  const recommendedAction = getRecommendedAction(expense);
  const aiSummary = getAiSummary(expense);
  const confidenceLabel = getConfidenceLabel(expense.aiConfidence);

  const requests = requestsByExpense[expense.id] ?? {};
  const requestList = REQUEST_TYPES.flatMap(type => requests[type] ?? []);
  const clarificationAwaiting = isAwaiting(requests.clarification);
  const receiptAwaiting = isAwaiting(requests.receipt);

  const openComposer = (type: RequestType) => {
    // Guard against duplicates even if a stale control is activated.
    if (isProcessed || isAwaiting(requests[type])) return;
    setComposerType(type);
  };

  const sendRequest = (type: RequestType, message: string) => {
    onSendRequest(expense.id, type, message);
    closeComposer(statusId(type));
  };

  const cancelRequest = (type: RequestType) => {
    onCancelRequest(expense.id, type);
    focusNextRef.current = triggerId(type);
  };

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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-drawer-title"
            aria-describedby="expense-drawer-subtitle"
            tabIndex={-1}
            onKeyDown={trapFocus}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ ease: "easeOut", duration: 0.26 }}
            className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl outline-none"
          >
            {/* Drawer content; inert while the request composer is open. */}
            <div className="flex flex-col flex-1 min-h-0" inert={composerType !== null}>
            {/* Top accent */}
            <div className={cn("h-[3px] w-full flex-shrink-0", accentColor)} />

            {/* Header */}
            {/* The close button sits in the row (not absolutely positioned) so it never overlaps the amount. */}
            <div className="flex items-start gap-3 pl-6 pr-4 pt-5 pb-3">
              <div className="flex-1 min-w-0">
                <h2 id="expense-drawer-title" className="text-[17px] font-semibold text-slate-900 tracking-tight leading-tight break-words">
                  {expense.merchant}
                </h2>
                <p id="expense-drawer-subtitle" className="text-[12px] text-slate-400 mt-0.5">{expense.employeeName} · {expense.category}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[20px] font-bold text-slate-900 tabular-nums">{formatCurrency(expense.amount)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{format(new Date(expense.date), 'MMM d, yyyy')}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close expense details"
                className={cn("flex-shrink-0 -mt-1 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors", focusRing)}
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

              {/* ── Follow-up requests (simulated) ── */}
              {requestList.length > 0 && (
                <section aria-labelledby="follow-up-requests-heading">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3 id="follow-up-requests-heading" className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Follow-up Requests</h3>
                    <span className="text-[10px] text-slate-400">Simulated · no message sent</span>
                  </div>
                  <ul className="space-y-2">
                    {requestList.map(request => {
                      const copy = REQUEST_COPY[request.type];
                      const awaiting = request.status === "awaiting_employee";
                      return (
                        <li
                          key={request.type}
                          id={statusId(request.type)}
                          tabIndex={-1}
                          className={cn(
                            "rounded-lg border p-3 flex items-start gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            awaiting ? "border-sky-200 bg-sky-50/70" : "border-slate-200 bg-slate-50"
                          )}
                        >
                          {awaiting
                            ? <Clock className="w-4 h-4 text-sky-600 flex-shrink-0 mt-px" aria-hidden="true" />
                            : <Archive className="w-4 h-4 text-slate-400 flex-shrink-0 mt-px" aria-hidden="true" />}
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[13px] font-semibold leading-tight", awaiting ? "text-sky-900" : "text-slate-600")}>
                              {awaiting ? copy.awaiting : `${copy.requested} · closed`}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {awaiting
                                ? `Requested ${formatDistanceToNow(request.requestedAt, { addSuffix: true })} · expense stays in Pending Review`
                                : `Closed when this expense was ${request.closedBy?.toLowerCase()}. Undo reopens it.`}
                            </p>
                            <p className="text-[12px] text-slate-600 mt-1.5 leading-snug break-words">
                              {request.message ? `"${request.message}"` : <span className="italic text-slate-400">No message included.</span>}
                            </p>
                          </div>
                          {awaiting && !isProcessed && (
                            <button
                              type="button"
                              onClick={() => cancelRequest(request.type)}
                              aria-label={`Cancel ${copy.name}`}
                              className={cn("flex-shrink-0 text-[11px] font-medium text-slate-500 hover:text-slate-800 border border-slate-200 bg-white hover:bg-slate-50 rounded-md px-2 py-1 transition-colors", focusRing)}
                            >
                              Cancel
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
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
                      {receiptAwaiting ? (
                        <span className="mt-1 text-[11px] font-semibold text-sky-700 border border-sky-200 bg-sky-50 rounded-md px-3 py-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          Receipt requested · awaiting employee
                        </span>
                      ) : !isProcessed && (
                        <button
                          type="button"
                          id={triggerId("receipt")}
                          onClick={() => openComposer("receipt")}
                          aria-haspopup="dialog"
                          className={cn("mt-1 text-[11px] font-semibold text-rose-600 border border-rose-300 bg-white hover:bg-rose-50 transition-colors rounded-md px-3 py-1 flex items-center gap-1.5", focusRing)}
                        >
                          <MailQuestion className="w-3 h-3" aria-hidden="true" />
                          {REQUEST_COPY.receipt.action}
                        </button>
                      )}
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
              <div ref={trackFooterHeight} className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/60 space-y-2.5">

                {/* Primary: Clarification for risky, Approve for safe */}
                {isHighRisk ? (
                  <>
                    <button
                      type="button"
                      id={triggerId("clarification")}
                      onClick={() => openComposer("clarification")}
                      disabled={clarificationAwaiting}
                      aria-haspopup="dialog"
                      className={cn("w-full h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none", focusRing)}
                    >
                      {clarificationAwaiting
                        ? <><Clock className="w-4 h-4" aria-hidden="true" /> {REQUEST_COPY.clarification.requested}</>
                        : <><MailQuestion className="w-4 h-4" aria-hidden="true" /> {REQUEST_COPY.clarification.action}</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onAction(expense.id, "Rejected"); onClose(); }}
                      className={cn("w-full h-10 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 shadow-md shadow-rose-600/20", focusRing)}
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => { onAction(expense.id, "Approved"); onClose(); }}
                      className={cn("w-full h-9 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 rounded-lg font-medium text-[12px] transition-colors flex items-center justify-center gap-1.5", focusRing)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve anyway
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { onAction(expense.id, "Approved"); onClose(); }}
                      className={cn("w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20", focusRing)}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { onAction(expense.id, "Rejected"); onClose(); }}
                        className={cn("flex-1 h-9 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-medium text-[12px] transition-colors flex items-center justify-center gap-1.5", focusRing)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        id={triggerId("clarification")}
                        onClick={() => openComposer("clarification")}
                        disabled={clarificationAwaiting}
                        aria-haspopup="dialog"
                        className={cn("flex-1 h-9 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-[12px] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100", focusRing)}
                      >
                        {clarificationAwaiting
                          ? <><Clock className="w-3.5 h-3.5" aria-hidden="true" /> {REQUEST_COPY.clarification.requested}</>
                          : <><MailQuestion className="w-3.5 h-3.5" aria-hidden="true" /> {REQUEST_COPY.clarification.action}</>}
                      </button>
                    </div>
                  </>
                )}

              </div>
            )}

            {isProcessed && (
              <div ref={trackFooterHeight} className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => { onAction(expense.id, "Pending"); panelRef.current?.focus(); }}
                  className={cn("w-full py-2 text-[12px] text-slate-400 hover:text-slate-700 font-medium transition-colors", focusRing)}
                >
                  Undo action
                </button>
              </div>
            )}
            </div>

            {composerType && (
              <RequestComposer
                key={`${expense.id}-${composerType}`}
                ref={composerRef}
                type={composerType}
                expense={expense}
                onSend={(message) => sendRequest(composerType, message)}
                onCancel={() => closeComposer(triggerId(composerType))}
              />
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
