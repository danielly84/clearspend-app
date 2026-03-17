export type AIConfidence = "High" | "Medium" | "Low";
export type RiskLevel = "Low" | "Medium" | "High";
export type AIRecommendation = "Approve" | "Review" | "Reject";
export type ExpenseStatus = "Pending" | "Approved" | "Rejected";

export interface Expense {
  id: string;
  employeeName: string;
  merchant: string;
  amount: number;
  category: string;
  date: string;
  aiConfidence: AIConfidence;
  riskLevel: RiskLevel;
  aiRecommendation: AIRecommendation;
  employeeNote: string;
  aiReasoning: string;
  flags: string[];
  receiptAvailable: boolean;
  status: ExpenseStatus;
}

export const initialMockExpenses: Expense[] = [
  {
    id: "exp-001",
    employeeName: "Sarah Chen",
    merchant: "Marriott Hotel",
    amount: 289.00,
    category: "Travel",
    date: "2026-03-10",
    aiConfidence: "High",
    riskLevel: "Low",
    aiRecommendation: "Approve",
    employeeNote: "Team offsite accommodation",
    aiReasoning: "This expense matches company travel policy. Standard hotel rate within limits. Receipt is verified and itemized.",
    flags: [],
    receiptAvailable: true,
    status: "Pending"
  },
  {
    id: "exp-002",
    employeeName: "Marcus Rodriguez",
    merchant: "Delta Airlines",
    amount: 412.50,
    category: "Travel",
    date: "2026-03-09",
    aiConfidence: "High",
    riskLevel: "Low",
    aiRecommendation: "Approve",
    employeeNote: "Flight to NYC client meeting",
    aiReasoning: "Business class ticket within policy guidelines. Matches approved trip request #TR-2891. Receipt is present.",
    flags: [],
    receiptAvailable: true,
    status: "Pending"
  },
  {
    id: "exp-003",
    employeeName: "Jennifer Park",
    merchant: "Starbucks",
    amount: 127.40,
    category: "Meals",
    date: "2026-03-08",
    aiConfidence: "Medium",
    riskLevel: "Medium",
    aiRecommendation: "Review",
    employeeNote: "Team lunch meeting",
    aiReasoning: "Amount exceeds typical coffee/light meal per-person limit by 25%. Employee reported 8 attendees but only 6 found in corresponding calendar invite.",
    flags: ["Policy Violation"],
    receiptAvailable: true,
    status: "Pending"
  },
  {
    id: "exp-004",
    employeeName: "David Kim",
    merchant: "Uber",
    amount: 94.20,
    category: "Transportation",
    date: "2026-03-08",
    aiConfidence: "Low",
    riskLevel: "High",
    aiRecommendation: "Reject",
    employeeNote: "Airport to office",
    aiReasoning: "Possible duplicate charge detected. Another Uber expense of exactly $94.20 was submitted within 2 hours for a similar route by this employee.",
    flags: ["Duplicate Suspected"],
    receiptAvailable: true,
    status: "Pending"
  },
  {
    id: "exp-005",
    employeeName: "Lisa Thompson",
    merchant: "Amazon",
    amount: 340.00,
    category: "Office Supplies",
    date: "2026-03-07",
    aiConfidence: "Low",
    riskLevel: "High",
    aiRecommendation: "Reject",
    employeeNote: "Office equipment",
    aiReasoning: "No receipt attached to verify purchase contents. Amount is above the $300 threshold which requires manager pre-approval. No pre-approval record found.",
    flags: ["Missing Receipt", "Policy Violation"],
    receiptAvailable: false,
    status: "Pending"
  },
  {
    id: "exp-006",
    employeeName: "James Wilson",
    merchant: "Marriott Hotel",
    amount: 195.00,
    category: "Travel",
    date: "2026-03-06",
    aiConfidence: "High",
    riskLevel: "Low",
    aiRecommendation: "Approve",
    employeeNote: "Client dinner meeting",
    aiReasoning: "Restaurant charge billed to hotel room. Amount is well within the meal and entertainment policy limit for a 3-person meeting. Receipt provided.",
    flags: [],
    receiptAvailable: true,
    status: "Pending"
  },
  {
    id: "exp-007",
    employeeName: "Amy Foster",
    merchant: "Southwest Airlines",
    amount: 287.00,
    category: "Travel",
    date: "2026-03-05",
    aiConfidence: "High",
    riskLevel: "Low",
    aiRecommendation: "Approve",
    employeeNote: "Sales conference travel",
    aiReasoning: "Economy class ticket purchased 14 days in advance, demonstrating good compliance. Matches an approved travel request.",
    flags: [],
    receiptAvailable: true,
    status: "Pending"
  },
  {
    id: "exp-008",
    employeeName: "Robert Chang",
    merchant: "WeWork",
    amount: 850.00,
    category: "Office",
    date: "2026-03-04",
    aiConfidence: "Medium",
    riskLevel: "Medium",
    aiRecommendation: "Review",
    employeeNote: "Co-working space for remote team sprint",
    aiReasoning: "This appears to be a monthly co-working membership. Company policy requires department head approval for ongoing commitments or single amounts over $500.",
    flags: ["Policy Violation"],
    receiptAvailable: true,
    status: "Pending"
  },
  {
    id: "exp-009",
    employeeName: "Nina Patel",
    merchant: "Uber Eats",
    amount: 73.50,
    category: "Meals",
    date: "2026-03-03",
    aiConfidence: "Low",
    riskLevel: "Medium",
    aiRecommendation: "Review",
    employeeNote: "Late night team working dinner",
    aiReasoning: "Missing itemized receipt. Team working dinner was claimed, but no attendee list was provided in the submission details.",
    flags: ["Missing Receipt"],
    receiptAvailable: false,
    status: "Pending"
  },
  {
    id: "exp-010",
    employeeName: "Carlos Martinez",
    merchant: "Best Buy",
    amount: 1240.00,
    category: "Equipment",
    date: "2026-03-02",
    aiConfidence: "Low",
    riskLevel: "High",
    aiRecommendation: "Reject",
    employeeNote: "New laptop for home office",
    aiReasoning: "Hardware equipment purchases require IT department pre-approval and procurement processing. No approval on file. Furthermore, the required receipt is missing.",
    flags: ["Missing Receipt", "Policy Violation"],
    receiptAvailable: false,
    status: "Pending"
  }
];
