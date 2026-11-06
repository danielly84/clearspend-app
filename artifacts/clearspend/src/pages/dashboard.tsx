import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Search,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Activity,
  Check,
  XCircle,
  X,
  Sparkles,
  AlertTriangle,
  Copy,
  ShieldAlert,
  Clock,
  RotateCcw,
} from "lucide-react";
import { initialMockExpenses, Expense, ExpenseStatus } from "@/data/mock-expenses";
import { ConfidenceBadge, RecommendationBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { formatCurrency, cn, focusRing } from "@/lib/utils";
import { ExpenseDrawer } from "@/components/expense-drawer";
import { ResetDemoDialog } from "@/components/reset-demo-dialog";
import { clearDemoState, loadDemoState, saveDemoState } from "@/lib/demo-storage";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  REQUEST_COPY,
  awaitingTypes,
  closeRequests,
  closedTypes,
  describeRequestTypes,
  isAwaiting,
  pluralize,
  reopenRequests,
  type RequestType,
  type RequestsByExpense,
  type ReviewDecision,
} from "@/lib/requests";

// Toasts that offer Undo stay up a little longer than the 5s default.
const UNDO_TOAST_DURATION = 8000;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type FilterTab = "All" | "Low Risk" | "Needs Review" | "High Risk";
type SortOption = "Date" | "Amount" | "Risk";

export default function Dashboard() {
  const { toast, toasts } = useToast();

  // Saved demo changes are read synchronously on first render, so the default data never
  // flashes before the restored state.
  const [initialState] = useState(loadDemoState);
  const [expenses, setExpenses] = useState<Expense[]>(initialState.expenses);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Risk");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerExpenseId, setDrawerExpenseId] = useState<string | null>(null);
  // Simulated follow-up requests, kept separate from each expense's review status.
  const [requests, setRequests] = useState<RequestsByExpense>(initialState.requests);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  // Skip saving the state that was just loaded, and warn at most once if saving fails.
  const hydratedRef = useRef(false);
  const storageWarnedRef = useRef(false);
  const [storageWarningPending, setStorageWarningPending] = useState(false);
  // Element to return focus to when the drawer closes.
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  // Latest state for toast Undo handlers, which run after later renders.
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  // Persist review decisions and follow-up requests (not filters, selection, or other UI state).
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    if (!saveDemoState({ expenses, requests }) && !storageWarnedRef.current) {
      storageWarnedRef.current = true;
      setStorageWarningPending(true);
    }
  }, [expenses, requests]);

  // Show the storage warning (once per page load) only when no other toast is open, so it
  // never replaces an action's confirmation or its Undo button.
  const toastOpen = toasts.some(t => t.open);
  useEffect(() => {
    if (!storageWarningPending || toastOpen) return;
    setStorageWarningPending(false);
    toast({
      title: "Changes won't be saved",
      description: "This browser isn't letting ClearSpend save data, so your changes will reset when you reload. Everything else works normally.",
    });
  }, [storageWarningPending, toastOpen, toast]);

  const resetDemo = () => {
    setExpenses(initialMockExpenses);
    setRequests({});
    setSelectedIds(new Set());
    setDrawerExpenseId(null);
    setResetDialogOpen(false);
    clearDemoState();
    // Replaces any open Undo toast, so a stale Undo can't be used after the reset.
    toast({ title: "Demo reset", description: "All sample expenses have been restored." });
  };

  const stats = useMemo(() => {
    const pending = expenses.filter(e => e.status === "Pending");
    return {
      pending: pending.length,
      readyToApprove: pending.filter(e => e.riskLevel === "Low" && e.aiRecommendation === "Approve").length,
      needsReview: pending.filter(e => e.riskLevel === "Medium" || e.aiRecommendation === "Review").length,
      highRisk: pending.filter(e => e.riskLevel === "High").length,
    };
  }, [expenses]);

  // AI Summary insights derived from pending expenses
  const aiSummary = useMemo(() => {
    const pending = expenses.filter(e => e.status === "Pending");
    const flagged = pending.filter(e => e.flags.length > 0);
    const policyViolations = pending.filter(e => e.flags.includes("Policy Violation"));
    const duplicates = pending.filter(e => e.flags.includes("Duplicate Suspected"));
    const missingReceipts = pending.filter(e => e.flags.includes("Missing Receipt"));
    return { flagged: flagged.length, policyViolations: policyViolations.length, duplicates: duplicates.length, missingReceipts: missingReceipts.length };
  }, [expenses]);

  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...expenses];
    if (activeTab === "Low Risk") filtered = filtered.filter(e => e.riskLevel === "Low");
    if (activeTab === "Needs Review") filtered = filtered.filter(e => e.riskLevel === "Medium" || e.aiRecommendation === "Review");
    if (activeTab === "High Risk") filtered = filtered.filter(e => e.riskLevel === "High");

    filtered.sort((a, b) => {
      if (sortBy === "Date") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "Amount") return b.amount - a.amount;
      if (sortBy === "Risk") {
        const riskVal = { High: 3, Medium: 2, Low: 1 };
        const primaryDiff = riskVal[b.riskLevel] - riskVal[a.riskLevel];
        if (primaryDiff !== 0) return primaryDiff;
        return b.amount - a.amount;
      }
      return 0;
    });

    return filtered;
  }, [expenses, activeTab, sortBy]);

  // Only pending expenses in the current view can be selected or bulk-actioned.
  const selectableIds = useMemo(
    () => filteredAndSortedExpenses.filter(e => e.status === "Pending").map(e => e.id),
    [filteredAndSortedExpenses]
  );
  const actionableSelectedIds = useMemo(
    () => selectableIds.filter(id => selectedIds.has(id)),
    [selectableIds, selectedIds]
  );
  const selectedCount = actionableSelectedIds.length;
  const allSelected = selectableIds.length > 0 && selectedCount === selectableIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const changeTab = (tab: FilterTab) => {
    setActiveTab(tab);
    // A new filter starts a new selection, so hidden rows can't be bulk-actioned.
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  const toggleSelectRow = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const openDrawer = (id: string, trigger: HTMLElement | null) => {
    drawerTriggerRef.current = trigger;
    setDrawerExpenseId(id);
  };

  // Restore expenses to Pending Review and reopen the requests their decision closed.
  // With no `decision`, any approved or rejected expense among `ids` is restored.
  const undoDecision = (ids: string[], decision?: ReviewDecision) => {
    const targets = expensesRef.current.filter(e =>
      ids.includes(e.id) && e.status !== "Pending" && (!decision || e.status === decision)
    );
    if (targets.length === 0) return;
    const targetIds = new Set(targets.map(e => e.id));
    const reopened = targets.flatMap(e => closedTypes(requestsRef.current[e.id]));

    setExpenses(prev => prev.map(e => targetIds.has(e.id) ? { ...e, status: "Pending" } : e));
    setRequests(prev => {
      const next = { ...prev };
      targetIds.forEach(id => { if (next[id]) next[id] = reopenRequests(next[id]); });
      return next;
    });

    const statuses = new Set(targets.map(e => e.status));
    const title = statuses.size === 1
      ? `${targets[0].status === "Approved" ? "Approval" : "Rejection"} undone`
      : "Decisions undone";
    const single = targets.length === 1 ? targets[0] : null;
    const reopenedText = reopened.length === 0 ? "" : single
      ? ` ${capitalize(describeRequestTypes(reopened))} reopened.`
      : ` ${pluralize(reopened.length, "request")} reopened.`;
    toast({
      title,
      description: `${single ? `${single.merchant} is` : `${pluralize(targets.length, "expense")} are`} back in Pending Review.${reopenedText}`,
    });
  };

  // Approve or reject pending expenses, closing any open requests, with a one-step Undo.
  const decide = (ids: string[], decision: ReviewDecision) => {
    const targets = expensesRef.current.filter(e => ids.includes(e.id) && e.status === "Pending");
    if (targets.length === 0) return;
    const targetIds = new Set(targets.map(e => e.id));
    const closed = targets.flatMap(e => awaitingTypes(requestsRef.current[e.id]));

    setExpenses(prev => prev.map(e => targetIds.has(e.id) ? { ...e, status: decision } : e));
    setRequests(prev => {
      const next = { ...prev };
      targetIds.forEach(id => { if (next[id]) next[id] = closeRequests(next[id], decision); });
      return next;
    });
    setSelectedIds(prev => {
      if (!targets.some(e => prev.has(e.id))) return prev;
      const next = new Set(prev);
      targetIds.forEach(id => next.delete(id));
      return next;
    });

    const verb = decision.toLowerCase();
    const noun = decision === "Approved" ? "approval" : "rejection";
    const single = targets.length === 1 ? targets[0] : null;
    const closedText = closed.length === 0 ? "" : single
      ? ` Open ${describeRequestTypes(closed)} closed.`
      : ` ${pluralize(closed.length, "open request")} closed.`;
    const undoIds = [...targetIds];
    toast({
      title: single ? `Expense ${verb}` : `${pluralize(targets.length, "expense")} ${verb}`,
      description: single
        ? `${single.merchant} · ${formatCurrency(single.amount)} from ${single.employeeName}.${closedText}`
        : `Moved out of Pending Review.${closedText}`,
      duration: UNDO_TOAST_DURATION,
      action: (
        <ToastAction
          altText={`Undo ${noun}`}
          aria-label={single ? `Undo ${noun} of ${single.merchant}` : `Undo ${noun} of ${pluralize(targets.length, "expense")}`}
          onClick={() => undoDecision(undoIds, decision)}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  const handleAction = (id: string, action: ExpenseStatus) => {
    if (action === "Pending") undoDecision([id]);
    else decide([id], action);
  };

  const handleBulkAction = (action: ReviewDecision) => {
    decide(actionableSelectedIds, action);
  };

  // The row's Approve/Reject buttons unmount after an action; keep keyboard focus in the row.
  const handleRowAction = (e: React.MouseEvent<HTMLButtonElement>, id: string, action: ReviewDecision) => {
    e.stopPropagation();
    const row = e.currentTarget.closest("tr");
    const hadFocus = e.currentTarget === document.activeElement;
    handleAction(id, action);
    if (hadFocus) requestAnimationFrame(() => row?.querySelector<HTMLElement>("[data-drawer-trigger]")?.focus());
  };

  const sendRequest = (id: string, type: RequestType, message: string) => {
    const expense = expensesRef.current.find(e => e.id === id);
    if (!expense || expense.status !== "Pending") return;
    const copy = REQUEST_COPY[type];
    // One open request of each type per expense.
    if (isAwaiting(requestsRef.current[id]?.[type])) {
      toast({ title: `${copy.requested} already`, description: `${expense.employeeName} already has an open ${copy.name} for ${expense.merchant}.` });
      return;
    }
    setRequests(prev => ({
      ...prev,
      [id]: { ...prev[id], [type]: { type, status: "awaiting_employee", message, requestedAt: Date.now() } },
    }));
    toast({
      title: copy.requested,
      description: `Simulated request to ${expense.employeeName}; no message was sent. ${expense.merchant} stays in Pending Review.`,
    });
  };

  const cancelRequest = (id: string, type: RequestType) => {
    const expense = expensesRef.current.find(e => e.id === id);
    if (!expense || !isAwaiting(requestsRef.current[id]?.[type])) return;
    setRequests(prev => {
      const { [type]: _removed, ...rest } = prev[id] ?? {};
      return { ...prev, [id]: rest };
    });
    toast({
      title: `${capitalize(REQUEST_COPY[type].name)} cancelled`,
      description: `${expense.merchant} stays in Pending Review.`,
    });
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-indigo-100 text-indigo-700",
      "bg-blue-100 text-blue-700",
      "bg-violet-100 text-violet-700",
      "bg-cyan-100 text-cyan-700",
      "bg-teal-100 text-teal-700",
      "bg-slate-100 text-slate-600",
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const rowRiskStyle = (expense: Expense) => {
    if (expense.status !== "Pending") return "";
    if (expense.riskLevel === "High") return "border-l-[3px] border-l-rose-400 bg-rose-50/30";
    if (expense.riskLevel === "Medium") return "border-l-[3px] border-l-amber-400 bg-amber-50/20";
    return "border-l-[3px] border-l-transparent";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-6 h-[60px] flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="ClearSpend" className="w-7 h-7 rounded object-cover" />
            <span className="font-semibold text-[17px] tracking-[-0.01em] text-slate-900">ClearSpend</span>
          </div>
          <div className="hidden md:block h-5 w-px bg-slate-200" />
          <h1 className="hidden md:block font-medium text-slate-400 text-sm">Manager Review Dashboard</h1>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            ref={resetButtonRef}
            type="button"
            onClick={() => setResetDialogOpen(true)}
            aria-haspopup="dialog"
            className={cn("flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 whitespace-nowrap transition-colors", focusRing)}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset Demo
          </button>
          <div className="hidden sm:block h-5 w-px bg-slate-200" />
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-medium text-slate-700 leading-tight">Sarah Miller</p>
            <p className="text-[11px] text-slate-400 mt-0.5">VP of Engineering</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 shadow-sm flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">SM</span>
          </div>
        </div>
      </header>

      {/* Extra bottom padding while the bulk bar is visible keeps the last rows reachable. */}
      <main className={cn("flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 lg:p-8 space-y-5", selectedCount > 0 && "pb-28 md:pb-28 lg:pb-28")}>

        {/* AI Summary Banner */}
        {aiSummary.flagged > 0 && (
          <div className="flex items-start gap-3 bg-indigo-950 text-white rounded-xl px-5 py-3.5 shadow-md">
            <Sparkles className="w-4 h-4 text-indigo-300 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-indigo-100">AI flagged {aiSummary.flagged} expense{aiSummary.flagged !== 1 ? "s" : ""} needing attention.</span>
              <span className="text-[13px] text-indigo-300 ml-1">
                {[
                  aiSummary.policyViolations > 0 && `${aiSummary.policyViolations} may violate policy`,
                  aiSummary.duplicates > 0 && `${aiSummary.duplicates} possible duplicate${aiSummary.duplicates > 1 ? "s" : ""} detected`,
                  aiSummary.missingReceipts > 0 && `${aiSummary.missingReceipts} missing receipt${aiSummary.missingReceipts > 1 ? "s" : ""}`,
                ].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              {aiSummary.policyViolations > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                  <ShieldAlert className="w-3 h-3" /> {aiSummary.policyViolations} Policy
                </span>
              )}
              {aiSummary.duplicates > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-0.5">
                  <Copy className="w-3 h-3" /> {aiSummary.duplicates} Duplicate
                </span>
              )}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Pending</h3>
              <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400">
                <Inbox className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-slate-900 tracking-tight leading-none">{stats.pending}</div>
            <p className="text-[11px] text-slate-400 mt-1.5">Awaiting manager action</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-[3px] border-l-emerald-400 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Ready to Approve</h3>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-emerald-600 tracking-tight leading-none">{stats.readyToApprove}</div>
            <p className="text-[11px] text-slate-400 mt-1.5">Low risk · AI suggests approve</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-[3px] border-l-amber-400 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Needs Review</h3>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-amber-600 tracking-tight leading-none">{stats.needsReview}</div>
            <p className="text-[11px] text-slate-400 mt-1.5">Medium risk or edge cases</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-[3px] border-l-rose-400 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">High Risk</h3>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-rose-600 tracking-tight leading-none">{stats.highRisk}</div>
            <p className="text-[11px] text-slate-400 mt-1.5">Violations or missing docs</p>
          </div>

        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-2 border-b border-slate-200 pb-0">
          <div className="flex gap-6 overflow-x-auto w-full sm:w-auto">
            {(["All", "Low Risk", "Needs Review", "High Risk"] as FilterTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => changeTab(tab)}
                aria-pressed={activeTab === tab}
                className={cn(
                  "text-[13px] pb-2.5 transition-colors whitespace-nowrap rounded-sm",
                  focusRing,
                  activeTab === tab
                    ? "border-b-2 border-blue-600 text-slate-900 font-semibold"
                    : "text-slate-400 hover:text-slate-600 border-b-2 border-transparent font-medium"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 pb-2">
            <div className="relative">
              <select
                aria-label="Sort expenses"
                className={cn("appearance-none bg-white border border-slate-200 text-slate-600 text-[12px] font-medium rounded-lg px-3 py-1.5 pr-7 hover:border-slate-300 cursor-pointer transition-colors shadow-sm", focusRing)}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="Risk">Sort: Risk Level</option>
                <option value="Amount">Sort: Amount</option>
                <option value="Date">Sort: Date</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="py-3 px-5 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all pending expenses in this view"
                      className={cn("w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed", focusRing)}
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      disabled={selectableIds.length === 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Employee</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Merchant & Date</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Risk</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">AI Confidence</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">AI Suggestion</th>
                  <th className="py-3 px-5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedExpenses.map((expense) => {
                  const isSelected = selectedIds.has(expense.id);
                  const isProcessed = expense.status !== "Pending";

                  return (
                    <tr
                      key={expense.id}
                      onClick={(e) => openDrawer(expense.id, e.currentTarget.querySelector<HTMLElement>("[data-drawer-trigger]"))}
                      className={cn(
                        "group cursor-pointer transition-colors duration-100",
                        rowRiskStyle(expense),
                        isSelected && "bg-blue-50/60 !border-l-blue-500",
                        !isSelected && expense.riskLevel === "Low" && expense.status === "Pending" && "hover:bg-slate-50/80",
                        !isSelected && expense.riskLevel === "Medium" && expense.status === "Pending" && "hover:bg-amber-50/40",
                        !isSelected && expense.riskLevel === "High" && expense.status === "Pending" && "hover:bg-rose-50/50",
                        isProcessed && "opacity-40"
                      )}
                    >
                      <td className="py-3.5 px-5">
                        <input
                          type="checkbox"
                          aria-label={isProcessed
                            ? `${expense.employeeName}, ${expense.merchant}: already ${expense.status.toLowerCase()}`
                            : `Select ${expense.employeeName}, ${expense.merchant}`}
                          className={cn("w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed", focusRing)}
                          checked={isSelected && !isProcessed}
                          disabled={isProcessed}
                          onChange={(e) => toggleSelectRow(expense.id, e)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0", getAvatarColor(expense.employeeName))}>
                            {getInitials(expense.employeeName)}
                          </div>
                          <div>
                            <button
                              type="button"
                              data-drawer-trigger
                              onClick={(e) => { e.stopPropagation(); openDrawer(expense.id, e.currentTarget); }}
                              aria-label={[
                                `${expense.employeeName}: view details for ${expense.merchant}, ${formatCurrency(expense.amount)}`,
                                ...(isProcessed ? [] : awaitingTypes(requests[expense.id]).map(type => REQUEST_COPY[type].awaiting.toLowerCase())),
                              ].join(", ")}
                              className={cn("block text-left text-[13px] font-medium text-slate-800 leading-tight rounded-sm", focusRing)}
                            >
                              {expense.employeeName}
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                              <span className="text-[11px] text-slate-400">{expense.category}</span>
                              {!isProcessed && awaitingTypes(requests[expense.id]).map(type => (
                                <span
                                  key={type}
                                  className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-1.5 text-[10px] font-medium leading-[14px] text-sky-700"
                                >
                                  <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                                  {REQUEST_COPY[type].awaiting}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-[13px] font-medium text-slate-700 leading-tight">{expense.merchant}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{format(new Date(expense.date), 'MMM d, yyyy')}</div>
                          </div>
                          {expense.flags.length > 0 && (
                            // LucideProps doesn't type `title`; the spread keeps the existing SVG attribute as rendered before.
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-1" {...{ title: expense.flags.join(', ') }} />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={cn("text-[14px] font-semibold tabular-nums", isProcessed ? "line-through text-slate-400" : "text-slate-900")}>
                          {formatCurrency(expense.amount)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <RiskBadge level={expense.riskLevel} />
                      </td>
                      <td className="py-3.5 px-4">
                        <ConfidenceBadge level={expense.aiConfidence} />
                      </td>
                      <td className="py-3.5 px-4">
                        <RecommendationBadge recommendation={expense.aiRecommendation} />
                      </td>
                      <td className="py-3.5 px-5 text-right align-middle">
                        <div className="h-7 flex items-center justify-end">
                          {isProcessed ? (
                            <StatusBadge status={expense.status} />
                          ) : (
                            // Revealed on row hover, on keyboard focus inside the row, and always on touch devices.
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => handleRowAction(e, expense.id, "Approved")}
                                className={cn("text-[11px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium flex items-center gap-1 transition-colors", focusRing)}
                                title="Approve"
                                aria-label={`Approve ${expense.employeeName}, ${expense.merchant}`}
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRowAction(e, expense.id, "Rejected")}
                                className={cn("text-[11px] px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium flex items-center gap-1 transition-colors", focusRing)}
                                title="Reject"
                                aria-label={`Reject ${expense.employeeName}, ${expense.merchant}`}
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredAndSortedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="w-8 h-8 text-slate-200 mb-3" />
                        <p className="font-medium text-slate-500 text-sm">No expenses found</p>
                        <p className="text-[12px] text-slate-400 mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Sticky Bulk Action Bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          // Full-width, click-through wrapper: the bar is centered without a 50%-width
          // cap, so it never overflows narrow screens or blocks the table beside it.
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="pointer-events-none fixed inset-x-0 bottom-4 sm:bottom-6 z-40 flex justify-center px-4"
          >
            <div
              role="toolbar"
              aria-label="Bulk actions"
              className="pointer-events-auto flex max-w-full items-center gap-2 sm:gap-3 bg-slate-900 text-white rounded-2xl px-3 sm:px-5 py-3 shadow-2xl shadow-slate-900/40 border border-white/10"
            >
              <div className="flex items-center gap-2 sm:mr-2" aria-live="polite">
                <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] font-bold">{selectedCount}</div>
                <span className="text-[13px] font-medium text-slate-300 whitespace-nowrap">selected</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <button
                type="button"
                onClick={() => handleBulkAction("Approved")}
                className={cn("flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors shadow-md shadow-emerald-500/30 focus-visible:ring-offset-slate-900", focusRing)}
              >
                <Check className="w-3.5 h-3.5" /> <span>Approve{selectedCount > 1 && <span className="hidden sm:inline"> All</span>}</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("Rejected")}
                className={cn("flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors shadow-md shadow-rose-500/30 focus-visible:ring-offset-slate-900", focusRing)}
              >
                <XCircle className="w-3.5 h-3.5" /> <span>Reject{selectedCount > 1 && <span className="hidden sm:inline"> All</span>}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className={cn("p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10 focus-visible:ring-offset-slate-900", focusRing)}
                title="Clear selection"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExpenseDrawer
        expense={expenses.find(e => e.id === drawerExpenseId) || null}
        isOpen={drawerExpenseId !== null}
        onClose={() => setDrawerExpenseId(null)}
        onAction={handleAction}
        returnFocusRef={drawerTriggerRef}
        requests={requests}
        onSendRequest={sendRequest}
        onCancelRequest={cancelRequest}
      />

      <ResetDemoDialog
        open={resetDialogOpen}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={resetDemo}
        returnFocusRef={resetButtonRef}
      />
    </div>
  );
}
