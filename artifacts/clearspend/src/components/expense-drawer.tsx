import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
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
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!expense) return null;

  const isProcessed = expense.status !== "Pending";

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case "High": return "bg-rose-500";
      case "Medium": return "bg-amber-400";
      case "Low": return "bg-emerald-500";
      default: return "bg-slate-200";
    }
  };

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
            initial={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
            animate={{ x: 0, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
            exit={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
            transition={{ ease: "easeOut", duration: 0.28 }}
            className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl"
            style={{ "--tw-shadow": "0 20px 40px -8px rgb(0 0 0 / 0.12), 0 8px 16px -4px rgb(0 0 0 / 0.06)" } as any}
          >
            {/* Top Accent Bar */}
            <div className={`h-[3px] w-full ${getRiskColor(expense.riskLevel)}`} />

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 bg-white relative">
              <div className="flex-1 pr-4">
                <h2 className="text-[17px] font-semibold text-slate-900 tracking-tight leading-tight mb-0.5">{expense.merchant}</h2>
                <p className="text-[13px] text-slate-400">{expense.employeeName}</p>
              </div>
              <div className="text-[20px] font-bold text-slate-900 tabular-nums">
                {formatCurrency(expense.amount)}
              </div>
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6">
              <div className="h-px w-full bg-slate-100" />
            </div>

            {/* Meta Row */}
            <div className="px-6 py-3 flex items-center gap-3">
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium">{expense.category}</span>
              <span className="text-[12px] text-slate-400">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
              <div className="ml-auto">
                <RiskBadge level={expense.riskLevel} />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              
              {isProcessed && (
                <div className={`p-3 rounded-lg border flex items-center gap-2 ${
                  expense.status === "Approved" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {expense.status === "Approved" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-medium text-sm">This expense has been {expense.status.toLowerCase()}.</span>
                </div>
              )}

              {/* Receipt Area */}
              <div className={`w-full h-32 rounded-xl border flex items-center justify-center relative overflow-hidden ${expense.receiptAvailable ? 'border-dashed border-slate-200 bg-slate-50/50' : 'bg-rose-50/50 border-rose-200/60'}`}>
                {expense.receiptAvailable ? (
                  <div className="flex flex-col items-center text-slate-400">
                    <FileText className="w-8 h-8 mb-1.5 opacity-50" />
                    <span className="text-[12px] font-medium">Receipt attached</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-rose-600">
                    <AlertTriangle className="w-8 h-8 mb-1.5 opacity-70" />
                    <span className="text-[12px] font-semibold">No Receipt</span>
                  </div>
                )}
              </div>

              {/* Expense Details */}
              <div>
                <dl className="divide-y divide-slate-100">
                  <div className="flex py-2">
                    <dt className="w-24 text-[11px] text-slate-400 uppercase tracking-wider flex-shrink-0 pt-0.5">Merchant</dt>
                    <dd className="text-[13px] font-medium text-slate-800">{expense.merchant}</dd>
                  </div>
                  <div className="flex py-2">
                    <dt className="w-24 text-[11px] text-slate-400 uppercase tracking-wider flex-shrink-0 pt-0.5">Category</dt>
                    <dd className="text-[13px] font-medium text-slate-800">{expense.category}</dd>
                  </div>
                  <div className="flex py-2">
                    <dt className="w-24 text-[11px] text-slate-400 uppercase tracking-wider flex-shrink-0 pt-0.5">Date</dt>
                    <dd className="text-[13px] font-medium text-slate-800">{format(new Date(expense.date), 'MMM d, yyyy')}</dd>
                  </div>
                  <div className="flex py-2">
                    <dt className="w-24 text-[11px] text-slate-400 uppercase tracking-wider flex-shrink-0 pt-0.5">Employee</dt>
                    <dd className="text-[13px] font-medium text-slate-800">{expense.employeeName}</dd>
                  </div>
                  <div className="flex py-2">
                    <dt className="w-24 text-[11px] text-slate-400 uppercase tracking-wider flex-shrink-0 pt-0.5">Submitted</dt>
                    <dd className="text-[13px] font-medium text-slate-800">{formatDistanceToNow(new Date(expense.date))} ago</dd>
                  </div>
                </dl>
              </div>

              {/* Employee Note */}
              {expense.employeeNote && (
                <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Employee Note</h4>
                  <p className="text-[13px] text-slate-600 leading-relaxed italic">"{expense.employeeNote}"</p>
                </div>
              )}

              {/* AI Analysis Card */}
              <div className="bg-indigo-950 rounded-xl p-4 shadow-sm border border-indigo-900/50">
                <div className="flex items-center justify-between mb-3 border-b border-indigo-800/60 pb-3">
                  <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-widest">
                    <Bot className="w-3.5 h-3.5" /> AI Analysis
                  </h4>
                  <ConfidenceBadge level={expense.aiConfidence} />
                </div>
                <p className="text-[13px] text-indigo-50 leading-relaxed">
                  {expense.aiReasoning}
                </p>

                {/* Flags Section Inside AI Card */}
                {expense.flags.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-indigo-800/60">
                    <div className="space-y-1.5">
                      {expense.flags.map(flag => (
                        <div key={flag} className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${flag === "Missing Receipt" ? "bg-rose-400" : "bg-amber-400"}`} />
                          <span className="text-[12px] text-indigo-200">{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Action Footer */}
            {!isProcessed && (
              <div className="p-5 border-t border-slate-100 bg-white flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    onAction(expense.id, "Approved");
                    onClose();
                  }}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[14px] transition-colors shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => {
                    onAction(expense.id, "Rejected");
                    onClose();
                  }}
                  className="w-full h-10 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-medium text-[13px] transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  className="mt-1 w-full text-center text-[12px] text-slate-400 hover:text-slate-700 underline-offset-2 hover:underline transition-colors"
                >
                  Ask for Clarification
                </button>
                <p className="text-[11px] text-slate-300 text-center mt-3">
                  Press E to approve · R to reject
                </p>
              </div>
            )}
            
            {isProcessed && (
               <div className="p-5 border-t border-slate-100 bg-white">
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
