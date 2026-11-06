import { initialMockExpenses, type Expense } from "@/data/mock-expenses";
import {
  REQUEST_TYPES,
  type ExpenseRequests,
  type FollowUpRequest,
  type RequestType,
  type RequestsByExpense,
  type ReviewDecision,
} from "@/lib/requests";

// Demo changes are saved in this browser's localStorage as a small diff against the
// original mock data: review decisions for expenses that are no longer pending, plus any
// follow-up requests. Bump the key's version if this shape changes incompatibly.
export const DEMO_STORAGE_KEY = "clearspend-demo-v1";

const MAX_MESSAGE_LENGTH = 500;
const DECISIONS: readonly string[] = ["Approved", "Rejected"] satisfies ReviewDecision[];

// What is written to storage.
interface StoredDemoState {
  version: 1;
  // Only expenses whose status differs from the mock data (which are all Pending).
  decisions: Record<string, ReviewDecision>;
  requests: RequestsByExpense;
}

export interface DemoState {
  expenses: Expense[];
  requests: RequestsByExpense;
}

export const initialDemoState = (): DemoState => ({ expenses: initialMockExpenses, requests: {} });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Accessing localStorage can throw (e.g. blocked site data), so treat that as unavailable.
function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseRequest(type: RequestType, value: unknown, decision?: ReviewDecision): FollowUpRequest | null {
  if (!isRecord(value) || value.type !== type) return null;
  const { status, message, requestedAt } = value;
  if (status !== "awaiting_employee" && status !== "closed") return null;
  if (typeof message !== "string" || typeof requestedAt !== "number" || !Number.isFinite(requestedAt)) return null;
  const request = { type, message: message.slice(0, MAX_MESSAGE_LENGTH), requestedAt };
  // Keep request status consistent with the review status: a request is open only while
  // its expense is pending, and closed (by that decision) once it is approved or rejected.
  return decision
    ? { ...request, status: "closed", closedBy: decision }
    : { ...request, status: "awaiting_employee" };
}

// Merges saved changes onto the original mock data. Unknown expense ids, unsupported
// values, and malformed entries are ignored; anything unusable falls back to the defaults.
export function parseDemoState(data: unknown): DemoState {
  if (!isRecord(data) || data.version !== 1) return initialDemoState();
  const decisions = isRecord(data.decisions) ? data.decisions : {};
  const savedRequests = isRecord(data.requests) ? data.requests : {};
  const requests: RequestsByExpense = {};

  const expenses = initialMockExpenses.map(expense => {
    const saved = decisions[expense.id];
    const decision = typeof saved === "string" && DECISIONS.includes(saved) ? (saved as ReviewDecision) : undefined;

    const savedEntry = savedRequests[expense.id];
    if (isRecord(savedEntry)) {
      const entry: ExpenseRequests = {};
      for (const type of REQUEST_TYPES) {
        const request = parseRequest(type, savedEntry[type], decision);
        if (request) entry[type] = request;
      }
      if (Object.keys(entry).length > 0) requests[expense.id] = entry;
    }

    return decision ? { ...expense, status: decision } : expense;
  });

  return { expenses, requests };
}

// Reads saved demo state, falling back to the original mock data if storage is
// unavailable or the saved value is missing, unparseable, or invalid.
export function loadDemoState(): DemoState {
  try {
    const raw = getStorage()?.getItem(DEMO_STORAGE_KEY);
    return raw ? parseDemoState(JSON.parse(raw)) : initialDemoState();
  } catch {
    return initialDemoState();
  }
}

function serializeDemoState({ expenses, requests }: DemoState): StoredDemoState | null {
  const decisions: Record<string, ReviewDecision> = {};
  for (const expense of expenses) {
    if (expense.status !== "Pending") decisions[expense.id] = expense.status;
  }
  const savedRequests: RequestsByExpense = {};
  for (const [id, entry] of Object.entries(requests)) {
    if (REQUEST_TYPES.some(type => entry[type])) savedRequests[id] = entry;
  }
  if (Object.keys(decisions).length === 0 && Object.keys(savedRequests).length === 0) return null;
  return { version: 1, decisions, requests: savedRequests };
}

// Saves the current demo state (or removes the key when nothing differs from the mock
// data). Returns false if storage is unavailable or the write failed (e.g. quota).
export function saveDemoState(state: DemoState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const data = serializeDemoState(state);
    if (data) storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    else storage.removeItem(DEMO_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearDemoState(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(DEMO_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
