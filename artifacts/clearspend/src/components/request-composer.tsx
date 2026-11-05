import { useEffect, useId, useRef, useState, type Ref } from "react";
import { motion } from "framer-motion";
import { Info, Send } from "lucide-react";
import type { Expense } from "@/data/mock-expenses";
import { REQUEST_COPY, defaultRequestMessage, type RequestType } from "@/lib/requests";
import { cn, focusRing } from "@/lib/utils";

interface RequestComposerProps {
  type: RequestType;
  expense: Expense;
  onSend: (message: string) => void;
  onCancel: () => void;
  ref?: Ref<HTMLDivElement>;
}

// Small modal sheet inside the expense drawer for composing a simulated follow-up
// request. The drawer marks its own content inert and owns Escape and the focus trap.
export function RequestComposer({ type, expense, onSend, onCancel, ref }: RequestComposerProps) {
  const copy = REQUEST_COPY[type];
  const firstName = expense.employeeName.split(" ")[0];
  const [message, setMessage] = useState(() => defaultRequestMessage(expense, type));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  // Focus the message with the cursor at the end of the suggested text.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/30"
        onClick={onCancel}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description ${id}-notice`}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeOut", duration: 0.18 }}
        className="relative max-h-full overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white px-5 pt-5 pb-4 shadow-2xl"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); onSend(message.trim()); }}
          className="space-y-3.5"
        >
          <div>
            <h3 id={`${id}-title`} className="text-[15px] font-semibold text-slate-900 tracking-tight">
              {copy.dialogTitle}
            </h3>
            <p id={`${id}-description`} className="text-[12px] text-slate-500 mt-0.5 leading-snug">
              {type === "receipt"
                ? `Ask ${expense.employeeName} to upload a receipt for ${expense.merchant}.`
                : `Ask ${expense.employeeName} for more information about ${expense.merchant}.`}{" "}
              The expense stays in Pending Review.
            </p>
          </div>

          <div>
            <label htmlFor={`${id}-message`} className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              Message to {firstName} <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              ref={textareaRef}
              id={`${id}-message`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              className={cn(
                "w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-700 placeholder:text-slate-400",
                focusRing,
                "focus-visible:ring-offset-0"
              )}
              placeholder="Add a note for the employee"
            />
          </div>

          <p id={`${id}-notice`} className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-slate-500 leading-snug">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px text-slate-400" aria-hidden="true" />
            Demo only: no email or notification is sent. The request is tracked in this browser tab until you reload.
          </p>

          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={onCancel}
              className={cn("flex-1 h-9 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-[12px] transition-colors", focusRing)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn("flex-1 h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-[12px] transition-colors flex items-center justify-center gap-1.5 shadow-sm", focusRing)}
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send request
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
