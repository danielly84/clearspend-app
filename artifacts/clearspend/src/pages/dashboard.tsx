import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { 
  Sparkles, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Activity,
  Check,
  XCircle
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
        // Primary sort by risk, secondary by amount
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

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">ClearSpend</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider ml-1">AI Verify</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-slate-200" />
          <h1 className="hidden md:block font-medium text-slate-600">Manager Review Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900 leading-tight">Sarah Miller</p>
            <p className="text-xs text-slate-500">VP of Engineering</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
            <span className="text-sm font-bold text-slate-500">SM</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Pending</h3>
              <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                <Inbox className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.pending}</div>
            <p className="text-sm text-slate-500 mt-1">Awaiting manager action</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4 relative">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">AI Approved</h3>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-600 relative">{stats.aiApproved}</div>
            <p className="text-sm text-slate-500 mt-1 relative">Low risk, clear policy match</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4 relative">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Needs Review</h3>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-600 relative">{stats.needsReview}</div>
            <p className="text-sm text-slate-500 mt-1 relative">Medium risk or edge cases</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4 relative">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">High Risk</h3>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-rose-600 relative">{stats.highRisk}</div>
            <p className="text-sm text-slate-500 mt-1 relative">Violations or missing docs</p>
          </div>

        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-2 pl-4 rounded-xl border border-slate-200 shadow-sm">
          
          {/* Tabs */}
          <div className="flex space-x-1 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {(["All", "Low Risk", "Needs Review", "High Risk"] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-slate-100 text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pr-2">
            
            {/* Bulk Actions (Conditional) */}
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
                    className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md text-sm font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-4 h-4" /> Approve All
                  </button>
                  <button 
                    onClick={() => handleBulkAction("Rejected")}
                    className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-md text-sm font-semibold flex items-center gap-1 transition-colors"
                  >
                    Reject All
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sort Dropdown Placeholder (visual only for prototype) */}
            <div className="relative">
              <select 
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-4 py-2 pr-8 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="Risk">Sort by: Risk Level</option>
                <option value="Amount">Sort by: Amount</option>
                <option value="Date">Sort by: Date</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-4 px-6 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={selectedIds.size === filteredAndSortedExpenses.length && filteredAndSortedExpenses.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Merchant & Date</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Suggestion</th>
                  <th className="py-4 px-6 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
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
                        "group cursor-pointer transition-all duration-200",
                        isSelected ? "bg-blue-50/50" : "hover:bg-slate-50",
                        isProcessed && "opacity-60 grayscale-[0.2]"
                      )}
                    >
                      <td className="py-4 px-6">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(expense.id, e)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-900">{expense.employeeName}</div>
                        <div className="text-sm text-slate-500">{expense.category}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-900">{expense.merchant}</div>
                        <div className="text-sm text-slate-500">{format(new Date(expense.date), 'MMM d, yyyy')}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</div>
                      </td>
                      <td className="py-4 px-4">
                        <RiskBadge level={expense.riskLevel} />
                      </td>
                      <td className="py-4 px-4">
                        <RecommendationBadge recommendation={expense.aiRecommendation} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isProcessed ? (
                           <div className="flex justify-end">
                             <StatusBadge status={expense.status} />
                           </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAction(expense.id, "Approved"); }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors tooltip-trigger"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAction(expense.id, "Rejected"); }}
                              className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-md transition-colors tooltip-trigger"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                
                {filteredAndSortedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
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

      {/* Slide-out Detail Drawer */}
      <ExpenseDrawer 
        expense={expenses.find(e => e.id === drawerExpenseId) || null}
        isOpen={drawerExpenseId !== null}
        onClose={() => setDrawerExpenseId(null)}
        onAction={handleAction}
      />
    </div>
  );
}
