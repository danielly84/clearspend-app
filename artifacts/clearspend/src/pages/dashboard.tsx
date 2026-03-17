import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Activity,
  Check,
  XCircle,
  X
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
  
  // Data State
  const [expenses, setExpenses] = useState<Expense[]>(initialMockExpenses);
  
  // UI State
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Risk");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerExpenseId, setDrawerExpenseId] = useState<string | null>(null);

  // Derived State: Stats
  const stats = useMemo(() => {
    const pending = expenses.filter(e => e.status === "Pending");
    return {
      pending: pending.length,
      aiApproved: pending.filter(e => e.riskLevel === "Low" && e.aiRecommendation === "Approve").length,
      needsReview: pending.filter(e => e.riskLevel === "Medium" || e.aiRecommendation === "Review").length,
      highRisk: pending.filter(e => e.riskLevel === "High").length,
    };
  }, [expenses]);

  // Derived State: Filtered & Sorted Expenses
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...expenses];
    
    // Apply Tab Filter
    if (activeTab === "Low Risk") filtered = filtered.filter(e => e.riskLevel === "Low");
    if (activeTab === "Needs Review") filtered = filtered.filter(e => e.riskLevel === "Medium" || e.aiRecommendation === "Review");
    if (activeTab === "High Risk") filtered = filtered.filter(e => e.riskLevel === "High");

    // Apply Sort
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

  // Actions
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
      toast({
        title: `Expense ${action}`,
        description: `The expense has been marked as ${action.toLowerCase()}.`,
      });
    }
  };

  const handleBulkAction = (action: ExpenseStatus) => {
    setExpenses(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, status: action } : e));
    setSelectedIds(new Set());
    toast({
      title: `Bulk Action: ${action}`,
      description: `${selectedIds.size} expenses have been marked as ${action.toLowerCase()}.`,
    });
  };

  const getAvatarColor = (name: string) => {
    const initials = name.charAt(0).toUpperCase();
    if (["A", "B", "C", "D", "E"].includes(initials)) return "bg-indigo-100 text-indigo-700";
    if (["F", "G", "H", "I", "J"].includes(initials)) return "bg-blue-100 text-blue-700";
    if (["K", "L", "M", "N", "O"].includes(initials)) return "bg-slate-100 text-slate-700";
    if (["P", "Q", "R", "S", "T"].includes(initials)) return "bg-cyan-100 text-cyan-700";
    return "bg-slate-200 text-slate-800";
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans relative">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-6 h-[60px] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="ClearSpend" className="w-7 h-7 rounded object-cover" />
            <span className="font-semibold text-[17px] tracking-[-0.01em] text-slate-900">ClearSpend</span>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 ml-1">AI VERIFY</span>
          </div>
          <div className="hidden md:block h-5 w-px bg-slate-200" />
          <h1 className="hidden md:block font-medium text-slate-400 text-sm">Manager Review Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-3.5">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-medium text-slate-700 leading-tight">Sarah Miller</p>
            <p className="text-[11px] text-slate-400 mt-0.5">VP of Engineering</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 shadow-sm flex items-center justify-center">
            <span className="text-sm font-bold text-white">SM</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Pending</h3>
              <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-slate-900 tracking-tight">{stats.pending}</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-2 border-l-emerald-400 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">AI Approved</h3>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-emerald-600 tracking-tight">{stats.aiApproved}</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-2 border-l-amber-400 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Needs Review</h3>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-amber-600 tracking-tight">{stats.needsReview}</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-2 border-l-rose-400 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">High Risk</h3>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-rose-600 tracking-tight">{stats.highRisk}</div>
          </div>

        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 border-b border-slate-200 mb-0 pb-0">
          
          {/* Tabs */}
          <div className="flex space-x-6 overflow-x-auto w-full sm:w-auto">
            {(["All", "Low Risk", "Needs Review", "High Risk"] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[13px] pb-2 transition-colors whitespace-nowrap",
                  activeTab === tab 
                    ? "border-b-2 border-blue-600 text-slate-900 font-semibold" 
                    : "text-slate-400 hover:text-slate-600 border-b-2 border-transparent"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pb-2 w-full sm:w-auto justify-end">
            
            {/* Bulk Actions */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  className="flex items-center gap-2 mr-2"
                >
                  <span className="text-sm text-slate-500 font-medium mr-2">{selectedIds.size} selected</span>
                  <button 
                    onClick={() => handleBulkAction("Approved")}
                    className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve All
                  </button>
                  <button 
                    onClick={() => handleBulkAction("Rejected")}
                    className="px-3 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    Reject All
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <select 
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-[13px] font-medium rounded-lg px-3 py-1.5 pr-8 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors shadow-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="Risk">Sort by: Risk Level</option>
                <option value="Amount">Sort by: Amount</option>
                <option value="Date">Sort by: Date</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="py-3 px-5 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={selectedIds.size === filteredAndSortedExpenses.length && filteredAndSortedExpenses.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Employee</th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">AI Confidence</th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Merchant & Date</th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Risk Level</th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">AI Suggestion</th>
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
                        "group cursor-pointer transition-colors duration-100 relative",
                        isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/80",
                        isProcessed && "opacity-50 grayscale-0"
                      )}
                    >
                      {isSelected && (
                        <td className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                      )}
                      <td className="py-3.5 px-5">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(expense.id, e)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", getAvatarColor(expense.employeeName))}>
                            {getInitials(expense.employeeName)}
                          </div>
                          <div>
                            <div className="text-[13.5px] font-medium text-slate-800">{expense.employeeName}</div>
                            <div className="text-[12px] text-slate-400">{expense.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <ConfidenceBadge level={expense.aiConfidence} />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="text-[13.5px] font-medium text-slate-700">{expense.merchant}</div>
                        <div className="text-[12px] text-slate-400">{format(new Date(expense.date), 'MMM d, yyyy')}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className={cn("text-[14px] font-semibold text-slate-900 tabular-nums", isProcessed && "line-through text-slate-400")}>
                          {formatCurrency(expense.amount)}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <RiskBadge level={expense.riskLevel} />
                      </td>
                      <td className="py-3.5 px-5">
                        <RecommendationBadge recommendation={expense.aiRecommendation} />
                      </td>
                      <td className="py-3.5 px-5 text-right align-middle">
                        <div className="h-8 flex items-center justify-end">
                          {isProcessed ? (
                            <StatusBadge status={expense.status} />
                          ) : (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAction(expense.id, "Approved"); }}
                                className="text-[11px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAction(expense.id, "Rejected"); }}
                                className="text-[11px] px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium flex items-center gap-1 transition-colors"
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
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="font-medium text-slate-600">No expenses found</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ExpenseDrawer 
        expense={expenses.find(e => e.id === drawerExpenseId) || null}
        isOpen={drawerExpenseId !== null}
        onClose={() => setDrawerExpenseId(null)}
        onAction={handleAction}
      />
    </div>
  );
}
