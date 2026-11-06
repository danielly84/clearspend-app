import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { cn, focusRing } from "@/lib/utils";

interface ResetDemoDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  // Element to focus when the dialog closes (the Reset Demo button).
  returnFocusRef: RefObject<HTMLElement | null>;
}

// Confirmation for the destructive Reset Demo action. Focus starts on Cancel, Tab is
// trapped between the two buttons, and Escape or a backdrop click cancels.
export function ResetDemoDialog({ open, onCancel, onConfirm, returnFocusRef }: ResetDemoDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      // If focus is somehow outside the dialog, bring it back.
      if (e.key === "Tab" && !dialogRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        cancelRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  // Focus Cancel on open; return focus to the Reset Demo button on close.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
    else if (wasOpenRef.current) returnFocusRef.current?.focus();
    wasOpenRef.current = open;
  }, [open, returnFocusRef]);

  const trapFocus = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-demo-title"
            aria-describedby="reset-demo-description"
            onKeyDown={trapFocus}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ ease: "easeOut", duration: 0.16 }}
            className="relative w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="reset-demo-title" className="text-[15px] font-semibold text-slate-900 tracking-tight">
                  Reset demo data?
                </h2>
                <p id="reset-demo-description" className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                  This will restore the original sample expenses and clear all review decisions and employee requests. This can't be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className={cn("h-9 px-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-[13px] transition-colors", focusRing)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn("h-9 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold text-[13px] transition-colors shadow-sm", focusRing)}
              >
                Reset Demo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
