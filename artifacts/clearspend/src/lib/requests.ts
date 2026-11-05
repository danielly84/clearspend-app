import { format } from "date-fns";
import type { Expense, ExpenseStatus } from "@/data/mock-expenses";
import { formatCurrency } from "@/lib/utils";

// Simulated follow-up requests from the manager to the employee. They live in React
// state only: nothing is sent, stored, or persisted across reloads.

export type RequestType = "clarification" | "receipt";

// "awaiting_employee": open and waiting on the employee.
// "closed": closed automatically because the expense was approved or rejected.
// Cancelled requests are removed rather than kept as a status.
export type RequestStatus = "awaiting_employee" | "closed";

export type ReviewDecision = Exclude<ExpenseStatus, "Pending">;

export interface FollowUpRequest {
  type: RequestType;
  status: RequestStatus;
  message: string;
  requestedAt: number;
  // Set when status is "closed": the decision that closed it.
  closedBy?: ReviewDecision;
}

// At most one request of each type per expense, tracked independently.
export type ExpenseRequests = Partial<Record<RequestType, FollowUpRequest>>;
export type RequestsByExpense = Record<string, ExpenseRequests>;

export const REQUEST_TYPES: readonly RequestType[] = ["clarification", "receipt"];

export const REQUEST_COPY: Record<
  RequestType,
  { action: string; dialogTitle: string; awaiting: string; requested: string; name: string }
> = {
  clarification: {
    action: "Request Clarification",
    dialogTitle: "Request clarification",
    awaiting: "Awaiting clarification",
    requested: "Clarification requested",
    name: "clarification request",
  },
  receipt: {
    action: "Request receipt from employee",
    dialogTitle: "Request receipt",
    awaiting: "Awaiting receipt",
    requested: "Receipt requested",
    name: "receipt request",
  },
};

export const isAwaiting = (request?: FollowUpRequest) => request?.status === "awaiting_employee";

export function awaitingTypes(requests?: ExpenseRequests): RequestType[] {
  return REQUEST_TYPES.filter(type => isAwaiting(requests?.[type]));
}

// Approving or rejecting an expense closes its open requests.
export function closeRequests(requests: ExpenseRequests, decision: ReviewDecision): ExpenseRequests {
  const next: ExpenseRequests = { ...requests };
  for (const type of REQUEST_TYPES) {
    const request = next[type];
    if (request?.status === "awaiting_employee") next[type] = { ...request, status: "closed", closedBy: decision };
  }
  return next;
}

// Undoing a decision reopens the requests that decision closed.
export function reopenRequests(requests: ExpenseRequests): ExpenseRequests {
  const next: ExpenseRequests = { ...requests };
  for (const type of REQUEST_TYPES) {
    const request = next[type];
    if (request?.status === "closed") next[type] = { ...request, status: "awaiting_employee", closedBy: undefined };
  }
  return next;
}

export const closedTypes = (requests?: ExpenseRequests): RequestType[] =>
  REQUEST_TYPES.filter(type => requests?.[type]?.status === "closed");

// "clarification request", "clarification and receipt requests"
export function describeRequestTypes(types: RequestType[]): string {
  if (types.length === 1) return REQUEST_COPY[types[0]].name;
  return `${types.join(" and ")} requests`;
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

export function defaultRequestMessage(expense: Expense, type: RequestType): string {
  const firstName = expense.employeeName.split(" ")[0];
  const summary = `your ${expense.merchant} expense (${formatCurrency(expense.amount)} on ${format(new Date(expense.date), "MMM d")})`;

  if (type === "receipt") {
    return `Hi ${firstName}, please upload an itemized receipt for ${summary}. Company policy requires receipts for expenses over $25.`;
  }
  if (expense.flags.includes("Duplicate Suspected")) {
    return `Hi ${firstName}, ${summary} looks similar to another charge you submitted. Can you confirm whether this is a separate purchase?`;
  }
  if (expense.flags.includes("Policy Violation")) {
    return `Hi ${firstName}, ${summary} may exceed policy limits or need pre-approval. Can you share the business purpose and whether it was approved in advance?`;
  }
  if (expense.flags.includes("Missing Receipt")) {
    return `Hi ${firstName}, can you share more context on ${summary}, including the business purpose and who attended?`;
  }
  return `Hi ${firstName}, can you share a bit more context on the business purpose of ${summary}?`;
}
