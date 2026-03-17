import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X, FileText, CheckCircle2, HelpCircle, XCircle, Bot, AlertTriangle } from "lucide-react";
import { Expense, ExpenseStatus } from "@/data/mock-expenses";
import { ConfidenceBadge, FlagChip, RiskBadge } from "./badges";
import { formatCurrency } from "@/lib/utils";
import { useEffect } from "react";

interface ExpenseDrawerProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (id: string, action: ExpenseStatus) => void;
}

export function ExpenseDrawer({ expense, isOpen, onClose, onAction }: ExpenseDrawerProps) {
  
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!expense) return null;

  const isProcessed = expense.status !== "Pending";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
            animate={{ x: 0, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
            exit={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[440px] bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{expense.employeeName}</h2>
                <p className="text-sm text-slate-500">Expense Submission</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Processed Banner */}
              {isProcessed && (
                <div className={`p-3 rounded-lg border flex items-center gap-2 ${
                  expense.status === "Approved" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {expense.status === "Approved" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-medium">This expense has been {expense.status.toLowerCase()}.</span>
                </div>
              )}

              {/* Receipt Area */}
              <div className="w-full h-40 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center relative overflow-hidden group">
                {expense.receiptAvailable ? (
                  <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                    <FileText className="w-10 h-10 mb-2" />
                    <span className="text-sm font-medium">View Receipt Document</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-rose-400">
                    <AlertTriangle className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-sm font-medium">No Receipt Provided</span>
                  </div>
                )}
              </div>

              {/* Main Details */}
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-bold text-slate-900">{expense.merchant}</h3>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                  <span className="bg-slate-100 px-2 py-1 rounded-md">{expense.category}</span>
                  <span className="py-1">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                  <div className="flex items-center ml-auto">
                    <RiskBadge level={expense.riskLevel} />
                  </div>
                </div>
              </div>

              {/* Employee Note */}
              {expense.employeeNote && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Employee Note</h4>
                  <p className="text-slate-700 text-sm leading-relaxed">"{expense.employeeNote}"</p>
                </div>
              )}

              {/* Flags Section */}
              {expense.flags.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 mb-3">
                    <AlertTriangle className="w-4 h-4" /> Warning Flags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {expense.flags.map(flag => (
                      <FlagChip key={flag} flag={flag} />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis Card */}
              <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                    <Bot className="w-4 h-4" /> AI Analysis
                  </h4>
                  <ConfidenceBadge level={expense.aiConfidence} />
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {expense.aiReasoning}
                </p>
              </div>

            </div>

            {/* Action Footer */}
            {!isProcessed && (
              <div className="p-4 border-t border-slate-200 bg-slate-50/50 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onAction(expense.id, "Approved");
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => {
                    onAction(expense.id, "Rejected");
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  className="col-span-2 flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" /> Ask Employee for Clarification
                </button>
              </div>
            )}
            
            {isProcessed && (
               <div className="p-4 border-t border-slate-200 bg-white">
                 <button
                  onClick={() => onAction(expense.id, "Pending")}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
                 >
                   Undo Action
                 </button>
               </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
