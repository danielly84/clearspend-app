import { useState, useMemo } from "react";
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
} from "lucide-react";
import { initialMockExpenses, Expense, ExpenseStatus } from "@/data/mock-expenses";
import { ConfidenceBadge, RecommendationBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { formatCurrency, cn } from "@/lib/utils";
import { ExpenseDrawer } from "@/components/expense-drawer";
import { useToast } from "@/hooks/use-toast";

type FilterTab = "All" | "Low Risk" | "Needs Review" | "High Risk";
type SortOption = "Date" | "Amount" | "Risk";

export default function Dashboard() {
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>(initialMockExpenses);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Risk");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerExpenseId, setDrawerExpenseId] = useState<string | null>(null);

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

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedExpenses.map(e => e.id)));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAction = (id: string, action: ExpenseStatus) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: action } : e));
    if (action !== "Pending") {
      toast({ title: `Expense ${action}`, description: `Marked as ${action.toLowerCase()}.` });
    }
  };

  const handleBulkAction = (action: ExpenseStatus) => {
    const count = selectedIds.size;
    setExpenses(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, status: action } : e));
    setSelectedIds(new Set());
    toast({ title: `${count} expenses ${action.toLowerCase()}`, description: `Bulk action applied successfully.` });
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
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-6 h-[60px] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="ClearSpend" className="w-7 h-7 rounded object-cover" />
            <span className="font-semibold text-[17px] tracking-[-0.01em] text-slate-900">ClearSpend</span>
          </div>
          <div className="hidden md:block h-5 w-px bg-slate-200" />
          <h1 className="hidden md:block font-medium text-slate-400 text-sm">Manager Review Dashboard</h1>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-medium text-slate-700 leading-tight">Sarah Miller</p>
            <p className="text-[11px] text-slate-400 mt-0.5">VP of Engineering</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 shadow-sm flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">SM</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 lg:p-8 space-y-5">

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
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[13px] pb-2.5 transition-colors whitespace-nowrap",
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
                className="appearance-none bg-white border border-slate-200 text-slate-600 text-[12px] font-medium rounded-lg px-3 py-1.5 pr-7 hover:border-slate-300 focus:outline-none cursor-pointer transition-colors shadow-sm"
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
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={selectedIds.size === filteredAndSortedExpenses.length && filteredAndSortedExpenses.length > 0}
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
                      onClick={() => setDrawerExpenseId(expense.id)}
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
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={isSelected}
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
                            <div className="text-[13px] font-medium text-slate-800 leading-tight">{expense.employeeName}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{expense.category}</div>
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
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-1" title={expense.flags.join(', ')} />
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
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAction(expense.id, "Approved"); }}
                                className="text-[11px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium flex items-center gap-1 transition-colors"
                                title="Approve"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAction(expense.id, "Rejected"); }}
                                className="text-[11px] px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium flex items-center gap-1 transition-colors"
                                title="Reject"
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
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-3 bg-slate-900 text-white rounded-2xl px-5 py-3 shadow-2xl shadow-slate-900/40 border border-white/10">
              <div className="flex items-center gap-2 mr-2">
                <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] font-bold">{selectedIds.size}</div>
                <span className="text-[13px] font-medium text-slate-300">selected</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <button
                onClick={() => handleBulkAction("Approved")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[12px] font-semibold transition-colors shadow-md shadow-emerald-500/30"
              >
                <Check className="w-3.5 h-3.5" /> Approve {selectedIds.size > 1 ? "All" : ""}
              </button>
              <button
                onClick={() => handleBulkAction("Rejected")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-[12px] font-semibold transition-colors shadow-md shadow-rose-500/30"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject {selectedIds.size > 1 ? "All" : ""}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Clear selection"
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
      />
    </div>
  );
}
