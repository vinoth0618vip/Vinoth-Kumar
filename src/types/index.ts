export type UserRole =
  | 'Admin'
  | 'Supervisor'
  | 'Manager'
  | 'Overall Manager'
  | 'Overall Incharge'
  | 'Employee';

export interface User {
  id: string; // e.g. "EMP-1001"
  name: string;
  mobile: string;
  password?: string;
  role: UserRole;
  siteId: string; // e.g. "SITE-01" or "ALL"
  siteName: string;
  department?: string;
  designation?: string;
  avatar?: string;
  createdAt: string;
}

export interface Site {
  id: string; // e.g. "SITE-01"
  siteNumber: string; // e.g. "S-101"
  name: string;
  address: string;
  locationDetails?: string;
  active: boolean;
  createdAt: string;
}

export interface WorkGuideItem {
  id: string;
  siteId: string;
  workCode: string; // e.g. "WC-101"
  workDescription: string;
  workDuration: string; // e.g. "8 Hours" or "Daily"
  workByHour: number; // Work guide rate
  uom: string; // e.g. "m", "nos", "m²", "kg"
  totalQuantity: number; // Target total quantity
  completedQuantity?: number;
  balanceQuantity?: number;
}

export type WorkType = 'Normal Work' | 'Critical Work' | 'Very Critical Work';

export interface ProgressSubmission {
  id: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName: string;
  workCode: string;
  workDescription: string;
  workType: WorkType;
  workDuration: string;
  completedQuantity: number;
  workingHours: number;
  workGuideRate: number; // Work by Hour
  uom: string;
  targetQuantity?: number; // Calculated internally
  achievementPercent?: number; // Calculated internally
  points: number;
  followWorkerIds: string;
  employeeRemarks: string;
  supervisorRemarks?: string;
  managerRemarks?: string;
  beforePhotos: string[]; // Base64 or image URLs (up to 3)
  afterPhotos: string[]; // Base64 or image URLs (up to 3)
  submissionDate: string; // YYYY-MM-DD
  submissionTime: string; // HH:mm:ss
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | 'Reviewed';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  siteId: string;
  siteName: string;
  punchInTime: string | null; // HH:mm:ss
  punchInPhoto?: string | null;
  punchOutDate?: string | null; // YYYY-MM-DD
  punchOutTime: string | null; // HH:mm:ss
  punchOutPhoto?: string | null;
  status: 'PunchedIn' | 'Present' | 'Leave' | 'Incomplete';
  notes?: string;
}
