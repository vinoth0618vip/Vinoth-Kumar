import * as XLSX from 'xlsx';
import {
  AttendanceRecord,
  ProgressSubmission,
  Site,
  User,
  WorkGuideItem,
  WorkType,
} from '../types';
import { isSameEmployee, normalizeEmpId } from '../utils/attendanceUtils';

const STORAGE_KEYS = {
  USERS: 'pms_users_v2',
  DELETED_USERS: 'pms_deleted_user_ids_v2',
  USERS_CLEARED: 'pms_users_cleared_all_v2',
  SITES: 'pms_sites_v2',
  DELETED_SITES: 'pms_deleted_site_ids_v2',
  SITES_CLEARED: 'pms_sites_cleared_all_v2',
  WORK_GUIDES: 'pms_work_guides_v2',
  DELETED_WORK_GUIDES: 'pms_deleted_work_guides_ids_v2',
  WORK_GUIDES_CLEARED: 'pms_work_guides_cleared_all_v2',
  ATTENDANCE: 'pms_attendance_v2',
  DELETED_ATTENDANCE: 'pms_deleted_attendance_ids_v2',
  ATTENDANCE_CLEARED: 'pms_attendance_cleared_all_v2',
  PROGRESS: 'pms_progress_v2',
  DELETED_PROGRESS: 'pms_deleted_progress_ids_v2',
  CURRENT_USER: 'pms_current_user_v2',
};

// Seed initial sites
const INITIAL_SITES: Site[] = [
  {
    id: 'SITE-01',
    siteNumber: 'S-101',
    name: 'Jurong Island Refinery Phase 2',
    address: '15 Banyan Drive, Jurong Island, Singapore 628312',
    locationDetails: 'Sector 4, Process Plant Building B',
    active: true,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'SITE-02',
    siteNumber: 'S-102',
    name: 'Tuas Mega Port Terminal Phase 3',
    address: '20 Tuas South Ave 14, Singapore 637123',
    locationDetails: 'Berth 7-9 Container Handling Facility',
    active: true,
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'SITE-03',
    siteNumber: 'S-103',
    name: 'Changi Aviation Complex Zone A',
    address: '80 Airport Boulevard, Singapore 819642',
    locationDetails: 'Hangar Bay 4 Electrical Substation',
    active: true,
    createdAt: '2026-02-15T08:00:00Z',
  },
];

// Generate 120 employees supporting 100+ employees with EMP001 (Vinoth Kumar) to EMP120
function generate120Employees(): User[] {
  const baseUsers: User[] = [
    {
      id: 'EMP001',
      name: 'Vinoth Kumar',
      mobile: '12345678',
      password: '12345678',
      role: 'Admin',
      siteId: 'ALL',
      siteName: 'All Sites (Corporate HQ)',
      department: 'Management',
      designation: 'General Manager / Admin',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'EMP002',
      name: 'M. Karthik',
      mobile: '78901234',
      password: '12345678',
      role: 'Employee',
      siteId: 'SITE-01',
      siteName: 'Jurong Island Refinery Phase 2',
      department: 'Mechanical & Piping',
      designation: 'Lead Pipe Fitter',
      createdAt: '2026-01-14T00:00:00Z',
    },
    {
      id: 'EMP003',
      name: 'S. Suresh',
      mobile: '67890123',
      password: '12345678',
      role: 'Employee',
      siteId: 'SITE-01',
      siteName: 'Jurong Island Refinery Phase 2',
      department: 'Electrical Execution',
      designation: 'Grade 1 Electrician',
      createdAt: '2026-01-12T00:00:00Z',
    },
    {
      id: 'EMP004',
      name: 'N. Pravin',
      mobile: '89012345',
      password: '12345678',
      role: 'Employee',
      siteId: 'SITE-02',
      siteName: 'Tuas Mega Port Terminal Phase 3',
      department: 'Civil Works',
      designation: 'Structural Technician',
      createdAt: '2026-02-05T00:00:00Z',
    },
    {
      id: 'EMP005',
      name: 'David Lee',
      mobile: '45678901',
      password: '12345678',
      role: 'Overall Manager',
      siteId: 'ALL',
      siteName: 'All Sites (Cross-Project)',
      department: 'Executive Operations',
      designation: 'Overall Projects Manager',
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'EMP006',
      name: 'K. Rajan',
      mobile: '23456789',
      password: '12345678',
      role: 'Manager',
      siteId: 'SITE-01',
      siteName: 'Jurong Island Refinery Phase 2',
      department: 'Operations',
      designation: 'Site Operations Manager',
      createdAt: '2026-01-05T00:00:00Z',
    },
    {
      id: 'EMP007',
      name: 'S. Muthu',
      mobile: '34567890',
      password: '12345678',
      role: 'Supervisor',
      siteId: 'SITE-01',
      siteName: 'Jurong Island Refinery Phase 2',
      department: 'Electrical Works',
      designation: 'Senior Electrical Supervisor',
      createdAt: '2026-01-08T00:00:00Z',
    },
    {
      id: 'EMP008',
      name: 'A. Rahman',
      mobile: '56789012',
      password: '12345678',
      role: 'Overall Incharge',
      siteId: 'ALL',
      siteName: 'All Sites (Technical)',
      department: 'QA/QC & Safety',
      designation: 'Technical Incharge',
      createdAt: '2026-01-03T00:00:00Z',
    },
  ];

  const employeeNames = [
    'Anand Kumar', 'Balamurugan S.', 'Chandrasekar P.', 'Dinesh Raja', 'Elangovan M.',
    'Gopinath V.', 'Hariharan K.', 'Ilango T.', 'Jaganathan R.', 'Kamalraj N.',
    'Lokesh Babu', 'Mohanraj C.', 'Naveen Kumar', 'Pandian M.', 'Ramesh Kanna',
    'Saravanan B.', 'Thangaraj S.', 'Vigneshwaran R.', 'Vijay Anand', 'Yuvaraj P.',
    'Arulmozhi V.', 'Boopathi G.', 'Chidambaram K.', 'Dhanasekaran R.', 'Eswaran M.',
    'Gajendran S.', 'Harikrishnan N.', 'Iyappan K.', 'Jayaprakash T.', 'Karthikeyan B.',
    'Logeshwaran S.', 'Manikandan P.', 'Nandhakumar R.', 'Parthiban V.', 'Rajarajan M.',
    'Senthil Nathan', 'Thirumalai K.', 'Vasanth Kumar', 'Velmurugan S.', 'Yokaraj G.',
    'Ajith Kumar', 'Baranidharan P.', 'Chenthil V.', 'Deepak Raj', 'Ezhumalai S.',
    'Girish M.', 'Hemachandran R.', 'Iniyan K.', 'Jeevanantham S.', 'Kalidass M.',
    'Lakshmanan P.', 'Murugesan V.', 'Nagarajan K.', 'Palanivel S.', 'Ravichandran T.',
    'Sakthivel M.', 'Tamilarasan R.', 'Vadivelan K.', 'Vijayakumar P.', 'Yogeshwaran S.',
    'Alagappan S.', 'Baskaran M.', 'Chakravarthy R.', 'Duraisamy K.', 'Ganesan P.',
    'Gunasekaran V.', 'Govindaraj M.', 'Inbarasan S.', 'Jagadeesh K.', 'Kalaivanan R.',
    'Madhavan S.', 'Munusamy T.', 'Natrayan P.', 'Paramasivam K.', 'Raghavan M.',
    'Sankaralingam S.', 'Thangavel V.', 'Veeramani R.', 'Venkatesan K.', 'Zahir Hussain',
    'Amirtharaj P.', 'Babu Raj', 'Chelladurai M.', 'Deenadayalan S.', 'Gnanavel K.',
    'Guru Prasad', 'Hariprasath V.', 'Indrakumar M.', 'Jayavelu S.', 'Kandasamy R.',
    'Manoharan K.', 'Natarajan S.', 'Prabhakaran P.', 'Ranganathan V.', 'Shanmugam M.',
    'Subramanian S.', 'Thirunavukkarasu K.', 'Venkataraman R.', 'Vijayaraghavan S.', 'Yasin Khan',
    'Ashok Kumar', 'Balasubramaniam R.', 'Clement Raj', 'Dharmalingam S.', 'Gopalakrishnan K.',
    'Habib Rahman', 'Irfan Ahmed', 'Jawahar Ali', 'Kannan V.', 'Loganathan S.',
    'Marimuthu R.', 'Neelakandan K.', 'Periasamy M.'
  ];

  const depts = [
    { dept: 'Electrical Execution', desig: 'Electrician' },
    { dept: 'Mechanical & Piping', desig: 'Pipe Fitter' },
    { dept: 'Structural & Welding', desig: 'Welder 6G' },
    { dept: 'Civil Works', desig: 'Technician' },
    { dept: 'Instrumentation', desig: 'Instrument Technician' },
    { dept: 'Scaffolding & Rigging', desig: 'Rigger / Erector' },
    { dept: 'QA/QC Inspection', desig: 'Quality Inspector' },
  ];

  const siteList = [
    { id: 'SITE-01', name: 'Jurong Island Refinery Phase 2' },
    { id: 'SITE-02', name: 'Tuas Mega Port Terminal Phase 3' },
    { id: 'SITE-03', name: 'Changi Aviation Complex Zone A' },
  ];

  for (let i = 9; i <= 120; i++) {
    const id = `EMP${String(i).padStart(3, '0')}`;
    const nameIndex = (i - 9) % employeeNames.length;
    const name = employeeNames[nameIndex];
    const deptObj = depts[(i - 9) % depts.length];
    const siteObj = siteList[(i - 9) % siteList.length];
    const mobileNum = `98${String(100000 + i).slice(-6)}`;

    baseUsers.push({
      id,
      name,
      mobile: mobileNum,
      password: 'password123',
      role: 'Employee',
      siteId: siteObj.id,
      siteName: siteObj.name,
      department: deptObj.dept,
      designation: deptObj.desig,
      createdAt: '2026-02-01T00:00:00Z',
    });
  }

  return baseUsers;
}

const INITIAL_USERS: User[] = generate120Employees();

// Seed initial Work Guides for Site 1 & Site 2
const INITIAL_WORK_GUIDES: WorkGuideItem[] = [
  {
    id: 'WG-01',
    siteId: 'SITE-01',
    workCode: 'WC-101',
    workDescription: 'Cable Tray Installation & Bracket Fastening',
    workDuration: '8 Hours',
    workByHour: 4.5,
    uom: 'm',
    totalQuantity: 450,
  },
  {
    id: 'WG-02',
    siteId: 'SITE-01',
    workCode: 'WC-102',
    workDescription: 'GI Conduit Pipe Laying & Saddle Fixing',
    workDuration: '8 Hours',
    workByHour: 6.0,
    uom: 'm',
    totalQuantity: 600,
  },
  {
    id: 'WG-03',
    siteId: 'SITE-01',
    workCode: 'WC-103',
    workDescription: 'Distribution Board (DB) Dressing & Glanding',
    workDuration: '8 Hours',
    workByHour: 1.0,
    uom: 'nos',
    totalQuantity: 32,
  },
  {
    id: 'WG-04',
    siteId: 'SITE-01',
    workCode: 'WC-104',
    workDescription: 'Main Earthing Wire Clamping & Exothermic Welding',
    workDuration: '8 Hours',
    workByHour: 12.0,
    uom: 'm',
    totalQuantity: 750,
  },
  {
    id: 'WG-05',
    siteId: 'SITE-01',
    workCode: 'WC-105',
    workDescription: 'Explosion-Proof LED Fixture Assembly & Testing',
    workDuration: '8 Hours',
    workByHour: 3.5,
    uom: 'nos',
    totalQuantity: 180,
  },
  // Site 2 Work Guides
  {
    id: 'WG-201',
    siteId: 'SITE-02',
    workCode: 'WC-201',
    workDescription: 'Underground Fiber Optic Duct Pulling & Jointing',
    workDuration: '8 Hours',
    workByHour: 15.0,
    uom: 'm',
    totalQuantity: 1200,
  },
  {
    id: 'WG-202',
    siteId: 'SITE-02',
    workCode: 'WC-202',
    workDescription: 'High Mast Lighting Tower Foundation Erection',
    workDuration: '8 Hours',
    workByHour: 0.5,
    uom: 'nos',
    totalQuantity: 14,
  },
];

// Helper to get formatted local date (YYYY-MM-DD)
export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(d: Date = new Date()): string {
  return d.toTimeString().split(' ')[0];
}

// Generate sample attendance records for Vinoth Kumar (EMP001), Suresh, Karthik, etc.
function generateSampleAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // 1. Seed attendance for Vinoth Kumar (EMP001) across current month days
  for (let day = 1; day <= Math.min(today.getDate(), 28); day++) {
    const d = new Date(year, month, day);
    const dateStr = getTodayDateString(d);
    const isToday = day === today.getDate();

    if (d.getDay() === 0) {
      // Sunday - Leave / Rest
      records.push({
        id: `ATT-SUNDAY-${dateStr}-EMP001`,
        employeeId: 'EMP001',
        employeeName: 'Vinoth Kumar',
        date: dateStr,
        siteId: 'SITE-01',
        siteName: 'All Sites (Corporate HQ)',
        punchInTime: null,
        punchOutTime: null,
        status: 'Leave',
        notes: 'Weekly Rest Day',
      });
      continue;
    }

    if (day === 8) {
      // Intentional Missing Punch Out demonstration day
      records.push({
        id: `ATT-${dateStr}-EMP001-INCOMPLETE`,
        employeeId: 'EMP001',
        employeeName: 'Vinoth Kumar',
        date: dateStr,
        siteId: 'SITE-01',
        siteName: 'Jurong Island Refinery Phase 2',
        punchInTime: '08:10:15',
        punchInPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23059669"/><circle cx="100" cy="80" r="40" fill="%23ffffff"/><circle cx="100" cy="180" r="65" fill="%23ffffff"/><text x="100" y="195" font-family="sans-serif" font-size="12" fill="%23059669" text-anchor="middle">EMP001 VERIFIED</text></svg>',
        punchOutTime: null,
        status: 'PunchedIn',
        notes: 'Awaiting Punch Out',
      });
      continue;
    }

    if (isToday) {
      records.push({
        id: `ATT-${dateStr}-EMP001`,
        employeeId: 'EMP001',
        employeeName: 'Vinoth Kumar',
        date: dateStr,
        siteId: 'SITE-01',
        siteName: 'Jurong Island Refinery Phase 2',
        punchInTime: '07:50:22',
        punchInPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23059669"/><circle cx="100" cy="80" r="40" fill="%23ffffff"/><circle cx="100" cy="180" r="65" fill="%23ffffff"/><text x="100" y="195" font-family="sans-serif" font-size="12" fill="%23059669" text-anchor="middle">EMP001 VERIFIED</text></svg>',
        punchOutTime: '17:45:10',
        punchOutPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23059669"/><circle cx="100" cy="80" r="40" fill="%23ffffff"/><circle cx="100" cy="180" r="65" fill="%23ffffff"/><text x="100" y="195" font-family="sans-serif" font-size="12" fill="%23059669" text-anchor="middle">EMP001 VERIFIED</text></svg>',
        status: 'Present',
        notes: 'Full shift completed with facial verification',
      });
    } else {
      records.push({
        id: `ATT-${dateStr}-EMP001`,
        employeeId: 'EMP001',
        employeeName: 'Vinoth Kumar',
        date: dateStr,
        siteId: 'SITE-01',
        siteName: 'Jurong Island Refinery Phase 2',
        punchInTime: '07:48:30',
        punchInPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%2310b981"/><circle cx="100" cy="80" r="40" fill="%23ffffff"/><circle cx="100" cy="180" r="65" fill="%23ffffff"/><text x="100" y="195" font-family="sans-serif" font-size="12" fill="%23059669" text-anchor="middle">EMP001 VERIFIED</text></svg>',
        punchOutTime: '17:35:45',
        punchOutPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%2310b981"/><circle cx="100" cy="80" r="40" fill="%23ffffff"/><circle cx="100" cy="180" r="65" fill="%23ffffff"/><text x="100" y="195" font-family="sans-serif" font-size="12" fill="%23059669" text-anchor="middle">EMP001 VERIFIED</text></svg>',
        status: 'Present',
        notes: 'Regular Shift Completed',
      });
    }
  }

  // 2. Also seed attendance for Suresh (EMP003 / EMP-1001)
  for (let day = 1; day <= Math.min(today.getDate(), 14); day++) {
    const d = new Date(year, month, day);
    const dateStr = getTodayDateString(d);
    if (d.getDay() !== 0) {
      records.push({
        id: `ATT-${dateStr}-EMP003`,
        employeeId: 'EMP003',
        employeeName: 'S. Suresh',
        date: dateStr,
        siteId: 'SITE-01',
        siteName: 'Jurong Island Refinery Phase 2',
        punchInTime: '07:55:10',
        punchInPhoto: null,
        punchOutTime: '17:35:40',
        punchOutPhoto: null,
        status: 'Present',
        notes: 'Regular Shift Completed',
      });
    }
  }

  // 3. Seed attendance for Karthik (EMP002 / EMP-1002) for today
  const todayStr = getTodayDateString(today);
  records.push({
    id: `ATT-${todayStr}-EMP002`,
    employeeId: 'EMP002',
    employeeName: 'M. Karthik',
    date: todayStr,
    siteId: 'SITE-01',
    siteName: 'Jurong Island Refinery Phase 2',
    punchInTime: '08:02:11',
    punchInPhoto: null,
    punchOutTime: null,
    status: 'PunchedIn',
    notes: 'Gate 1 Punch',
  });

  return records;
}

// Generate sample progress submissions
function generateSampleProgress(): ProgressSubmission[] {
  const today = new Date();
  const todayStr = getTodayDateString(today);

  const prev1 = new Date(today);
  prev1.setDate(today.getDate() - 1);
  const prev1Str = getTodayDateString(prev1);

  const prev2 = new Date(today);
  prev2.setDate(today.getDate() - 2);
  const prev2Str = getTodayDateString(prev2);

  return [
    {
      id: 'PROG-1001',
      employeeId: 'EMP-1001',
      employeeName: 'S. Suresh',
      siteId: 'SITE-01',
      siteName: 'Jurong Island Refinery Phase 2',
      workCode: 'WC-101',
      workDescription: 'Cable Tray Installation & Bracket Fastening',
      workType: 'Normal Work',
      workDuration: '8 Hours',
      completedQuantity: 36,
      workingHours: 8,
      workGuideRate: 4.5,
      uom: 'm',
      targetQuantity: 36, // 8 * 4.5 * 1.0
      achievementPercent: 100,
      points: 120,
      followWorkerIds: 'EMP-1002, EMP-1005',
      employeeRemarks: 'Completed corridor section 3A overhead tray mounting with anchor bolts.',
      supervisorRemarks: 'Inspected alignment. Torque check verified.',
      managerRemarks: 'Approved for billing milestone.',
      beforePhotos: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
      ],
      afterPhotos: [
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80',
      ],
      submissionDate: prev2Str,
      submissionTime: '17:15:30',
      approvalStatus: 'Approved',
    },
    {
      id: 'PROG-1002',
      employeeId: 'EMP-1001',
      employeeName: 'S. Suresh',
      siteId: 'SITE-01',
      siteName: 'Jurong Island Refinery Phase 2',
      workCode: 'WC-102',
      workDescription: 'GI Conduit Pipe Laying & Saddle Fixing',
      workType: 'Critical Work',
      workDuration: '8 Hours',
      completedQuantity: 40,
      workingHours: 8,
      workGuideRate: 6.0,
      uom: 'm',
      targetQuantity: 38.4, // 8 * 6.0 * 0.8
      achievementPercent: 104,
      points: 165,
      followWorkerIds: 'EMP-1002',
      employeeRemarks: 'Hazardous zone 1 conduit run installed with explosion-proof unions.',
      supervisorRemarks: 'Tested conduit grounding continuity. OK.',
      managerRemarks: 'Quality approved.',
      beforePhotos: [
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80',
      ],
      afterPhotos: [
        'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=400&q=80',
      ],
      submissionDate: prev1Str,
      submissionTime: '17:22:10',
      approvalStatus: 'Approved',
    },
    {
      id: 'PROG-1003',
      employeeId: 'EMP-1001',
      employeeName: 'S. Suresh',
      siteId: 'SITE-01',
      siteName: 'Jurong Island Refinery Phase 2',
      workCode: 'WC-103',
      workDescription: 'Distribution Board (DB) Dressing & Glanding',
      workType: 'Very Critical Work',
      workDuration: '8 Hours',
      completedQuantity: 4,
      workingHours: 8,
      workGuideRate: 1.0,
      uom: 'nos',
      targetQuantity: 4.8, // 8 * 1.0 * 0.6
      achievementPercent: 83.3,
      points: 150,
      followWorkerIds: 'EMP-1002, EMP-1006',
      employeeRemarks: 'Main DB-04 power dressing completed with ferrules and schematic marking.',
      supervisorRemarks: 'Phase insulation test passed.',
      submissionDate: todayStr,
      submissionTime: '14:30:00',
      approvalStatus: 'Pending',
      beforePhotos: [
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
      ],
      afterPhotos: [
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
      ],
    },
  ];
}

// Storage Manager Class
class StorageService {
  private memoryCache: { [key: string]: any } = {};

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.DELETED_SITES)) {
      localStorage.setItem(STORAGE_KEYS.DELETED_SITES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SITES_CLEARED)) {
      localStorage.setItem(STORAGE_KEYS.SITES_CLEARED, JSON.stringify(false));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SITES)) {
      const isCleared = this.get<boolean>(STORAGE_KEYS.SITES_CLEARED, false);
      if (isCleared) {
        localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify([]));
      } else {
        const deletedSiteIds = this.get<string[]>(STORAGE_KEYS.DELETED_SITES, []);
        const activeInitialSites = INITIAL_SITES.filter((s) => !deletedSiteIds.includes(s.id));
        localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(activeInitialSites));
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.DELETED_USERS)) {
      localStorage.setItem(STORAGE_KEYS.DELETED_USERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS_CLEARED)) {
      localStorage.setItem(STORAGE_KEYS.USERS_CLEARED, JSON.stringify(false));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      const isCleared = this.get<boolean>(STORAGE_KEYS.USERS_CLEARED, false);
      if (isCleared) {
        const adminUsers = INITIAL_USERS.filter((u) => u.role === 'Admin');
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(adminUsers));
      } else {
        const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_USERS, []);
        const activeInitialUsers = INITIAL_USERS.filter((u) => !deletedIds.includes(u.id));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(activeInitialUsers));
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.DELETED_WORK_GUIDES)) {
      localStorage.setItem(STORAGE_KEYS.DELETED_WORK_GUIDES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WORK_GUIDES_CLEARED)) {
      localStorage.setItem(STORAGE_KEYS.WORK_GUIDES_CLEARED, JSON.stringify(false));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WORK_GUIDES)) {
      const isCleared = this.get<boolean>(STORAGE_KEYS.WORK_GUIDES_CLEARED, false);
      if (isCleared) {
        localStorage.setItem(STORAGE_KEYS.WORK_GUIDES, JSON.stringify([]));
      } else {
        const deletedWgIds = this.get<string[]>(STORAGE_KEYS.DELETED_WORK_GUIDES, []);
        const activeWg = INITIAL_WORK_GUIDES.filter((g) => !deletedWgIds.includes(g.id));
        localStorage.setItem(STORAGE_KEYS.WORK_GUIDES, JSON.stringify(activeWg));
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.DELETED_ATTENDANCE)) {
      localStorage.setItem(STORAGE_KEYS.DELETED_ATTENDANCE, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE_CLEARED)) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_CLEARED, JSON.stringify(false));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      const isCleared = this.get<boolean>(STORAGE_KEYS.ATTENDANCE_CLEARED, false);
      if (isCleared) {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
      } else {
        const deletedAttIds = this.get<string[]>(STORAGE_KEYS.DELETED_ATTENDANCE, []);
        const activeAtt = generateSampleAttendance().filter((a) => !deletedAttIds.includes(a.id));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(activeAtt));
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.DELETED_PROGRESS)) {
      localStorage.setItem(STORAGE_KEYS.DELETED_PROGRESS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
      const deletedProgIds = this.get<string[]>(STORAGE_KEYS.DELETED_PROGRESS, []);
      const activeInitialProgress = generateSampleProgress().filter((p) => !deletedProgIds.includes(p.id));
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(activeInitialProgress));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default initial login to Admin user for testing convenience
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    }
  }

  // Generic getter & setter
  private get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Dispatch custom event for real-time reactive sync across components
      window.dispatchEvent(new CustomEvent('pms_storage_updated', { detail: { key } }));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage`, e);
    }
  }

  // Current User / Session
  getCurrentUser(): User | null {
    return this.get<User | null>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
  }

  setCurrentUser(user: User | null): void {
    this.set<User | null>(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Users
  getUsers(): User[] {
    const isCleared = this.get<boolean>(STORAGE_KEYS.USERS_CLEARED, false);
    const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    let raw = this.get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    if (!isCleared && raw.length < 100) {
      const existingIds = new Set(raw.map((u) => normalizeEmpId(u.id)));
      const toAdd = INITIAL_USERS.filter(
        (u) => !existingIds.has(normalizeEmpId(u.id)) && !deletedIds.includes(u.id)
      );
      if (toAdd.length > 0) {
        raw = [...raw, ...toAdd];
        this.set(STORAGE_KEYS.USERS, raw);
      }
    }
    return raw.filter((u) => !deletedIds.includes(u.id));
  }

  saveUser(user: User): { success: boolean; message: string } {
    const users = this.getUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      // Check duplicate mobile
      if (users.some((u) => u.mobile === user.mobile)) {
        return { success: false, message: `Mobile ${user.mobile} is already registered.` };
      }
      users.push(user);
    }
    this.set(STORAGE_KEYS.USERS, users);
    this.set(STORAGE_KEYS.USERS_CLEARED, false);

    // If updating current logged in user, refresh session
    const current = this.getCurrentUser();
    if (current && current.id === user.id) {
      this.setCurrentUser({ ...current, ...user });
    }

    return { success: true, message: 'User saved successfully.' };
  }

  deleteUser(userId: string): { success: boolean; message: string; deletedUser?: User } {
    if (!userId || !userId.trim()) {
      return { success: false, message: 'Invalid user ID specified.' };
    }

    const current = this.getCurrentUser();
    // Security verification: Only Admin can delete accounts
    if (!current || current.role !== 'Admin') {
      return { success: false, message: 'Unauthorized action. Only Admin users can delete accounts.' };
    }

    // Security verification: Protect current Admin from accidental self-deletion
    if (current.id === userId) {
      return { success: false, message: 'Security restriction: You cannot delete your own logged-in Admin account.' };
    }

    const users = this.getUsers();
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, message: `User record with ID "${userId}" was not found or has already been removed.` };
    }

    // Protect last remaining Admin
    if (targetUser.role === 'Admin') {
      const remainingAdmins = users.filter((u) => u.role === 'Admin' && u.id !== userId);
      if (remainingAdmins.length === 0) {
        return { success: false, message: 'Security restriction: Cannot delete the only remaining Admin account in the system.' };
      }
    }

    // Remove user from active users list
    const updatedUsers = users.filter((u) => u.id !== userId);
    this.set(STORAGE_KEYS.USERS, updatedUsers);

    // Track permanently deleted user ID to prevent re-seeding across reloads and sessions
    const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    if (!deletedIds.includes(userId)) {
      deletedIds.push(userId);
      this.set(STORAGE_KEYS.DELETED_USERS, deletedIds);
    }

    // Historical record retention rule:
    // Do NOT delete attendance records, punch in/out photos, PMS progress submissions,
    // employee points, or report logs. They remain preserved with the user's ID/name.

    return {
      success: true,
      message: `User ${targetUser.name} (${targetUser.id}) has been deleted successfully. Historical attendance & progress records remain safely archived.`,
      deletedUser: targetUser,
    };
  }

  deleteAllNonAdminUsers(adminUser?: User): {
    success: boolean;
    message: string;
    deletedCount: number;
    preservedCount: number;
    deletedRolesCount?: Record<string, number>;
  } {
    const current = adminUser || this.getCurrentUser();
    // Security verification: Only authenticated Admin can delete all non-admin users
    if (!current || current.role !== 'Admin') {
      return {
        success: false,
        message: 'Security restriction: Only authorized Admin users can perform bulk user deletion.',
        deletedCount: 0,
        preservedCount: 0,
      };
    }

    const allUsers = this.getUsers();
    // Separate non-admin users from admin users
    // Non-admin roles: Employee, Supervisor, Manager, Overall Manager, Overall Incharge, QS, etc.
    const nonAdminUsers = allUsers.filter((u) => u.role !== 'Admin');
    // Admin accounts must NEVER be deleted
    const adminUsers = allUsers.filter((u) => u.role === 'Admin');

    // Guarantee that at least one admin account is preserved at all times
    if (adminUsers.length === 0) {
      return {
        success: false,
        message: 'Security protection: Deletion blocked because at least one working Admin account must remain in the system.',
        deletedCount: 0,
        preservedCount: 0,
      };
    }

    if (nonAdminUsers.length === 0) {
      return {
        success: true,
        message: 'No non-admin user accounts found. All existing accounts are protected Admin accounts.',
        deletedCount: 0,
        preservedCount: adminUsers.length,
      };
    }

    // Tally by role for transparent audit feedback
    const roleCounts: Record<string, number> = {};
    for (const u of nonAdminUsers) {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    }

    // Update active users list to retain ONLY Admin accounts
    this.set(STORAGE_KEYS.USERS, adminUsers);
    this.set(STORAGE_KEYS.USERS_CLEARED, true);

    // Track permanently deleted user IDs to prevent re-seeding
    const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    const newlyDeletedIds = nonAdminUsers.map((u) => u.id);
    const combinedDeletedIds = Array.from(new Set([...deletedIds, ...newlyDeletedIds]));
    this.set(STORAGE_KEYS.DELETED_USERS, combinedDeletedIds);

    // Dispatch storage update for real-time reactive sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pms_storage_updated', { detail: { key: 'pms_users_v2' } }));
    }

    return {
      success: true,
      message: 'All users deleted successfully',
      deletedCount: nonAdminUsers.length,
      preservedCount: adminUsers.length,
      deletedRolesCount: roleCounts,
    };
  }

  verifyAdminPassword(password: string, adminUser?: User): boolean {
    if (!password || !password.trim()) return false;
    const clean = password.trim();
    const allUsers = this.getUsers();

    // 1. Verify against provided admin user
    const current = adminUser || this.getCurrentUser();
    if (current && current.role === 'Admin') {
      const stored = allUsers.find((u) => u.id === current.id && u.role === 'Admin');
      if (stored && (stored.password || '12345678') === clean) {
        return true;
      }
      if ((current.password || '12345678') === clean) {
        return true;
      }
    }

    // 2. Verify against all Admin accounts in the system
    const adminAccounts = allUsers.filter((u) => u.role === 'Admin');
    if (adminAccounts.some((admin) => (admin.password || '12345678') === clean)) {
      return true;
    }

    // 3. Fallback check for session user
    const session = this.getCurrentUser();
    if (session && session.role === 'Admin') {
      const stored = allUsers.find((u) => u.id === session.id && u.role === 'Admin');
      if (stored && (stored.password || '12345678') === clean) {
        return true;
      }
      if ((session.password || '12345678') === clean) {
        return true;
      }
    }

    // 4. Primary admin account EMP001
    const mainAdmin = INITIAL_USERS.find((u) => u.id === 'EMP001' && u.role === 'Admin');
    if (mainAdmin && (mainAdmin.password || '12345678') === clean) {
      return true;
    }

    return false;
  }

  deleteAllUsersWithAdminPassword(password: string, adminUser?: User): {
    success: boolean;
    message: string;
    deletedCount: number;
    preservedCount: number;
    deletedRolesCount?: Record<string, number>;
  } {
    const current = adminUser || this.getCurrentUser();
    if (!current || current.role !== 'Admin') {
      return {
        success: false,
        message: 'Security restriction: Only authorized Admin users can perform bulk user deletion.',
        deletedCount: 0,
        preservedCount: 0,
      };
    }

    // Verify password against Admin authentication system
    if (!this.verifyAdminPassword(password, current)) {
      return {
        success: false,
        message: 'Incorrect Admin Password',
        deletedCount: 0,
        preservedCount: 0,
      };
    }

    // Password verified! Delete all user accounts except the main Admin account.
    return this.deleteAllNonAdminUsers(current);
  }

  // Sites
  getSites(): Site[] {
    const isCleared = this.get<boolean>(STORAGE_KEYS.SITES_CLEARED, false);
    if (isCleared) {
      return this.get<Site[]>(STORAGE_KEYS.SITES, []);
    }
    const raw = this.get<Site[]>(STORAGE_KEYS.SITES, INITIAL_SITES);
    const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_SITES, []);
    return raw.filter((s) => !deletedIds.includes(s.id));
  }

  getActiveSites(): Site[] {
    return this.getSites().filter((s) => s.active !== false);
  }

  checkSiteDependencies(siteId: string): {
    hasDependencies: boolean;
    userCount: number;
    attendanceCount: number;
    progressCount: number;
    workGuideCount: number;
    summary: string;
  } {
    const users = this.getUsers().filter((u) => u.siteId === siteId);
    const attendance = this.getAttendance({ siteId });
    const progress = this.getProgressSubmissions({ siteId });
    const workGuides = this.getWorkGuides(siteId);

    const userCount = users.length;
    const attendanceCount = attendance.length;
    const progressCount = progress.length;
    const workGuideCount = workGuides.length;

    const hasDependencies = userCount > 0 || attendanceCount > 0 || progressCount > 0 || workGuideCount > 0;

    const parts: string[] = [];
    if (userCount > 0) parts.push(`${userCount} assigned employee(s)`);
    if (attendanceCount > 0) parts.push(`${attendanceCount} attendance record(s)`);
    if (progressCount > 0) parts.push(`${progressCount} progress submission(s)`);
    if (workGuideCount > 0) parts.push(`${workGuideCount} work guide item(s)`);

    return {
      hasDependencies,
      userCount,
      attendanceCount,
      progressCount,
      workGuideCount,
      summary: parts.length > 0 ? parts.join(', ') : 'No linked records',
    };
  }

  deleteSite(
    siteId: string
  ): {
    success: boolean;
    message: string;
    error?: string;
    errorCode?: 'UNAUTHORIZED' | 'SITE_NOT_FOUND' | 'DATABASE_ERROR';
    affectedUsersCount?: number;
    cleanedWorkGuidesCount?: number;
  } {
    if (!siteId || !siteId.trim()) {
      return {
        success: false,
        errorCode: 'DATABASE_ERROR',
        error: 'Invalid Request',
        message: 'Invalid site ID specified. Please provide a valid unique Site ID.',
      };
    }

    const current = this.getCurrentUser();
    // Security verification: Only authenticated Admin can delete sites
    if (!current || current.role !== 'Admin') {
      return {
        success: false,
        errorCode: 'UNAUTHORIZED',
        error: 'Admin Permission Required',
        message: 'Security policy violation: Only an authenticated Admin user is authorized to delete sites.',
      };
    }

    const sites = this.getSites();
    const targetIndex = sites.findIndex((s) => s.id === siteId);
    if (targetIndex < 0) {
      return {
        success: false,
        errorCode: 'SITE_NOT_FOUND',
        error: 'Site Not Found',
        message: `Database error: Site record with unique ID "${siteId}" was not found or has already been deleted.`,
      };
    }

    const targetSite = sites[targetIndex];

    try {
      // 1. Reassign any employees or managers assigned to this site to Corporate HQ ('ALL')
      const allUsers = this.get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      let affectedUsersCount = 0;
      const updatedUsers = allUsers.map((u) => {
        if (u.siteId === siteId) {
          affectedUsersCount++;
          return {
            ...u,
            siteId: 'ALL',
            siteName: 'All Sites (Corporate HQ)',
          };
        }
        return u;
      });
      if (affectedUsersCount > 0) {
        this.set(STORAGE_KEYS.USERS, updatedUsers);
      }

      // 2. Cascade delete site-exclusive work guides
      const allGuides = this.get<WorkGuideItem[]>(STORAGE_KEYS.WORK_GUIDES, INITIAL_WORK_GUIDES);
      const remainingGuides = allGuides.filter((g) => g.siteId !== siteId);
      const cleanedWorkGuidesCount = allGuides.length - remainingGuides.length;
      if (cleanedWorkGuidesCount > 0) {
        this.set(STORAGE_KEYS.WORK_GUIDES, remainingGuides);
      }

      // 3. Preserve historical attendance records while annotating site reference
      const allAttendance = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
      let attendanceUpdated = false;
      const updatedAttendance = allAttendance.map((a) => {
        if (a.siteId === siteId) {
          attendanceUpdated = true;
          return {
            ...a,
            siteName: a.siteName.includes('(Closed)') ? a.siteName : `${a.siteName} (Closed)`,
          };
        }
        return a;
      });
      if (attendanceUpdated) {
        this.set(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
      }

      // 4. Preserve progress submissions and employee points intact
      const allProgress = this.get<ProgressSubmission[]>(STORAGE_KEYS.PROGRESS, []);
      let progressUpdated = false;
      const updatedProgress = allProgress.map((p) => {
        if (p.siteId === siteId) {
          progressUpdated = true;
          return {
            ...p,
            siteName: p.siteName.includes('(Closed)') ? p.siteName : `${p.siteName} (Closed)`,
          };
        }
        return p;
      });
      if (progressUpdated) {
        this.set(STORAGE_KEYS.PROGRESS, updatedProgress);
      }

      // 5. Permanently remove the site from persistent storage
      const remainingSites = sites.filter((s) => s.id !== siteId);
      this.set(STORAGE_KEYS.SITES, remainingSites);

      // 6. Record permanently deleted site ID to prevent re-seeding
      const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_SITES, []);
      if (!deletedIds.includes(siteId)) {
        deletedIds.push(siteId);
        this.set(STORAGE_KEYS.DELETED_SITES, deletedIds);
      }

      // 7. Dispatch storage update events for reactive UI sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pms_storage_updated', { detail: { key: 'pms_sites_v2' } }));
        window.dispatchEvent(new CustomEvent('pms_sites_updated', { detail: { siteId } }));
      }

      return {
        success: true,
        message: `Site "${targetSite.name}" (${targetSite.siteNumber}) deleted successfully from database.`,
        affectedUsersCount,
        cleanedWorkGuidesCount,
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'DATABASE_ERROR',
        error: 'Deletion Error',
        message: `Database error while deleting site: ${err?.message || 'Unknown transaction failure'}`,
      };
    }
  }

  checkAllSitesDependencies(): {
    totalSites: number;
    totalAssignedUsers: number;
    totalAttendanceRecords: number;
    totalProgressRecords: number;
    totalWorkGuides: number;
    sitesBreakdown: Array<{
      id: string;
      name: string;
      siteNumber: string;
      userCount: number;
      attendanceCount: number;
      progressCount: number;
      workGuideCount: number;
    }>;
  } {
    const sites = this.getSites();
    const allUsers = this.getUsers();
    const allAttendance = this.getAttendance();
    const allProgress = this.getProgressSubmissions();
    const allGuides = this.getWorkGuides();

    let totalAssignedUsers = 0;
    let totalAttendanceRecords = 0;
    let totalProgressRecords = 0;
    let totalWorkGuides = 0;

    const sitesBreakdown = sites.map((s) => {
      const uCount = allUsers.filter((u) => u.siteId === s.id).length;
      const aCount = allAttendance.filter((a) => a.siteId === s.id).length;
      const pCount = allProgress.filter((p) => p.siteId === s.id).length;
      const wCount = allGuides.filter((g) => g.siteId === s.id).length;

      totalAssignedUsers += uCount;
      totalAttendanceRecords += aCount;
      totalProgressRecords += pCount;
      totalWorkGuides += wCount;

      return {
        id: s.id,
        name: s.name,
        siteNumber: s.siteNumber,
        userCount: uCount,
        attendanceCount: aCount,
        progressCount: pCount,
        workGuideCount: wCount,
      };
    });

    return {
      totalSites: sites.length,
      totalAssignedUsers,
      totalAttendanceRecords,
      totalProgressRecords,
      totalWorkGuides,
      sitesBreakdown,
    };
  }

  deleteAllSites(adminUser?: User): {
    success: boolean;
    message: string;
    deletedCount: number;
    affectedUsersCount: number;
    cleanedWorkGuidesCount: number;
  } {
    const current = adminUser || this.getCurrentUser();
    // Security verification: Only authenticated Admin can delete all sites
    if (!current || current.role !== 'Admin') {
      return {
        success: false,
        message: 'Security policy violation: Only authenticated Admin users are authorized to delete all sites.',
        deletedCount: 0,
        affectedUsersCount: 0,
        cleanedWorkGuidesCount: 0,
      };
    }

    const sites = this.getSites();
    if (sites.length === 0) {
      return {
        success: true,
        message: 'No sites found to delete. The site list is already empty.',
        deletedCount: 0,
        affectedUsersCount: 0,
        cleanedWorkGuidesCount: 0,
      };
    }

    const siteIds = sites.map((s) => s.id);

    try {
      // 1. Reassign any employees or managers assigned to these sites to Corporate HQ ('ALL')
      const allUsers = this.get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      let affectedUsersCount = 0;
      const updatedUsers = allUsers.map((u) => {
        if (siteIds.includes(u.siteId)) {
          affectedUsersCount++;
          return {
            ...u,
            siteId: 'ALL',
            siteName: 'All Sites (Corporate HQ)',
          };
        }
        return u;
      });
      if (affectedUsersCount > 0) {
        this.set(STORAGE_KEYS.USERS, updatedUsers);
      }

      // 2. Cascade remove site-exclusive work guides
      const allGuides = this.get<WorkGuideItem[]>(STORAGE_KEYS.WORK_GUIDES, INITIAL_WORK_GUIDES);
      const remainingGuides = allGuides.filter((g) => !siteIds.includes(g.siteId));
      const cleanedWorkGuidesCount = allGuides.length - remainingGuides.length;
      this.set(STORAGE_KEYS.WORK_GUIDES, remainingGuides);

      // 3. Preserve historical attendance records while annotating site reference
      const allAttendance = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
      let attendanceUpdated = false;
      const updatedAttendance = allAttendance.map((a) => {
        if (siteIds.includes(a.siteId)) {
          attendanceUpdated = true;
          return {
            ...a,
            siteName: a.siteName.includes('(Closed)') ? a.siteName : `${a.siteName} (Closed)`,
          };
        }
        return a;
      });
      if (attendanceUpdated) {
        this.set(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
      }

      // 4. Preserve progress submissions and employee points intact
      const allProgress = this.get<ProgressSubmission[]>(STORAGE_KEYS.PROGRESS, []);
      let progressUpdated = false;
      const updatedProgress = allProgress.map((p) => {
        if (siteIds.includes(p.siteId)) {
          progressUpdated = true;
          return {
            ...p,
            siteName: p.siteName.includes('(Closed)') ? p.siteName : `${p.siteName} (Closed)`,
          };
        }
        return p;
      });
      if (progressUpdated) {
        this.set(STORAGE_KEYS.PROGRESS, updatedProgress);
      }

      // 5. Empty sites in persistent storage
      this.set(STORAGE_KEYS.SITES, []);
      this.set(STORAGE_KEYS.SITES_CLEARED, true);

      // 6. Record all deleted site IDs to prevent re-seeding
      const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_SITES, []);
      const combinedDeletedIds = Array.from(new Set([...deletedIds, ...siteIds]));
      this.set(STORAGE_KEYS.DELETED_SITES, combinedDeletedIds);

      // 7. Dispatch storage update events for reactive UI sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pms_storage_updated', { detail: { key: 'pms_sites_v2' } }));
        window.dispatchEvent(new CustomEvent('pms_sites_cleared', { detail: { count: sites.length } }));
      }

      return {
        success: true,
        message: `Successfully deleted all ${sites.length} construction site(s). ${affectedUsersCount} user(s) reassigned to Corporate HQ. All historical attendance and progress records remain preserved.`,
        deletedCount: sites.length,
        affectedUsersCount,
        cleanedWorkGuidesCount,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Database error while executing bulk site deletion: ${err?.message || 'Transaction error'}`,
        deletedCount: 0,
        affectedUsersCount: 0,
        cleanedWorkGuidesCount: 0,
      };
    }
  }

  archiveSite(siteId: string): { success: boolean; message: string } {
    const sites = this.getSites();
    const targetIndex = sites.findIndex((s) => s.id === siteId);
    if (targetIndex < 0) {
      return { success: false, message: `Site "${siteId}" not found.` };
    }
    sites[targetIndex] = {
      ...sites[targetIndex],
      active: false,
    };
    this.set(STORAGE_KEYS.SITES, sites);
    return {
      success: true,
      message: `Site "${sites[targetIndex].name}" archived successfully.`,
    };
  }

  unarchiveSite(siteId: string): { success: boolean; message: string } {
    const sites = this.getSites();
    const targetIndex = sites.findIndex((s) => s.id === siteId);
    if (targetIndex < 0) {
      return { success: false, message: `Site "${siteId}" not found.` };
    }
    sites[targetIndex] = {
      ...sites[targetIndex],
      active: true,
    };
    this.set(STORAGE_KEYS.SITES, sites);
    return {
      success: true,
      message: `Site "${sites[targetIndex].name}" reactivated successfully. It is now available in active dropdowns.`,
    };
  }

  getNextSiteId(): string {
    const activeSites = this.getSites();
    const storedSites = this.get<Site[]>(STORAGE_KEYS.SITES, []);
    const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_SITES, []);
    const initialIds = INITIAL_SITES.map((s) => s.id);

    // Combine all IDs ever used or reserved to guarantee zero collisions
    const allKnownIds = new Set<string>([
      ...activeSites.map((s) => s.id),
      ...storedSites.map((s) => s.id),
      ...deletedIds,
      ...initialIds,
    ]);

    let maxNum = 0;
    allKnownIds.forEach((id) => {
      const m = id.match(/^SITE-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });

    let nextNum = maxNum + 1;
    let candidate = `SITE-${String(nextNum).padStart(2, '0')}`;
    while (allKnownIds.has(candidate)) {
      nextNum++;
      candidate = `SITE-${String(nextNum).padStart(2, '0')}`;
    }
    return candidate;
  }

  getNextSiteNumber(): string {
    const activeSites = this.getSites();
    const storedSites = this.get<Site[]>(STORAGE_KEYS.SITES, []);
    const allKnown = [...activeSites, ...storedSites, ...INITIAL_SITES];

    let maxNum = 100;
    allKnown.forEach((s) => {
      if (s.siteNumber) {
        const m = s.siteNumber.match(/^S-(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });

    const existingNumbers = new Set(allKnown.map((s) => (s.siteNumber || '').trim().toUpperCase()));
    let nextNum = maxNum + 1;
    let candidate = `S-${nextNum}`;
    while (existingNumbers.has(candidate.toUpperCase())) {
      nextNum++;
      candidate = `S-${nextNum}`;
    }
    return candidate;
  }

  saveSite(site: Partial<Site> & { name: string; address: string }): { success: boolean; message: string; site?: Site } {
    const trimmedName = (site.name || '').trim();
    const trimmedAddress = (site.address || '').trim();

    if (!trimmedName) {
      return { success: false, message: 'Site Name is required.' };
    }
    if (!trimmedAddress) {
      return { success: false, message: 'Site Address & Location is required.' };
    }

    const currentSites = this.getSites();

    // Check duplicate Site Name (case-insensitive) across existing sites (prevent accidental duplicate entries)
    const duplicateName = currentSites.find(
      (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase() && s.id !== site.id
    );
    if (duplicateName) {
      return {
        success: false,
        message: `A site with the name "${trimmedName}" already exists. Please specify a unique site name.`,
      };
    }

    // Determine target ID
    let targetId = site.id && site.id.trim() ? site.id.trim() : '';
    if (!targetId) {
      targetId = this.getNextSiteId();
    }

    // Determine target Site Number
    let targetSiteNumber = site.siteNumber ? site.siteNumber.trim() : '';
    if (!targetSiteNumber) {
      targetSiteNumber = this.getNextSiteNumber();
    } else {
      // Check duplicate Site Number among other existing sites
      const duplicateNumber = currentSites.find(
        (s) => s.siteNumber?.trim().toLowerCase() === targetSiteNumber.toLowerCase() && s.id !== targetId
      );
      if (duplicateNumber) {
        return {
          success: false,
          message: `Site code/number "${targetSiteNumber}" is already assigned to site "${duplicateNumber.name}". Please specify a unique site number.`,
        };
      }
    }

    const existingSite = currentSites.find((s) => s.id === targetId);

    const siteRecord: Site = {
      id: targetId,
      siteNumber: targetSiteNumber,
      name: trimmedName,
      address: trimmedAddress,
      locationDetails: (site.locationDetails || '').trim() || 'General Site Perimeter',
      active: site.active !== undefined ? site.active : (existingSite ? existingSite.active : true),
      createdAt: site.createdAt || (existingSite ? existingSite.createdAt : new Date().toISOString()),
    };

    // Update sites array
    const updatedSites = [...currentSites];
    const existingIndex = updatedSites.findIndex((s) => s.id === targetId);
    if (existingIndex >= 0) {
      updatedSites[existingIndex] = siteRecord;
    } else {
      updatedSites.push(siteRecord);
    }

    // Persist active sites to persistent storage
    this.set(STORAGE_KEYS.SITES, updatedSites);
    this.set(STORAGE_KEYS.SITES_CLEARED, false);

    // CRITICAL: Ensure targetId is removed from DELETED_SITES so getSites() will never filter it out
    const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_SITES, []);
    if (deletedIds.includes(targetId)) {
      const updatedDeletedIds = deletedIds.filter((id) => id !== targetId);
      this.set(STORAGE_KEYS.DELETED_SITES, updatedDeletedIds);
    }

    // Dispatch custom events for real-time reactive sync across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pms_storage_updated', { detail: { key: 'pms_sites_v2' } }));
      window.dispatchEvent(new CustomEvent('pms_sites_updated', { detail: { siteId: targetId } }));
    }

    return {
      success: true,
      message: `Site "${siteRecord.name}" (${siteRecord.siteNumber}) saved successfully.`,
      site: siteRecord,
    };
  }

  // Work Guides
  getWorkGuides(siteId?: string): WorkGuideItem[] {
    let guides = this.get<WorkGuideItem[]>(STORAGE_KEYS.WORK_GUIDES, INITIAL_WORK_GUIDES);
    const deletedWgIds = this.get<string[]>(STORAGE_KEYS.DELETED_WORK_GUIDES, []);
    if (deletedWgIds.length > 0) {
      guides = guides.filter((g) => !deletedWgIds.includes(g.id));
    }
    const progressList = this.getProgressSubmissions();

    // Attach dynamically calculated completed & balance quantities
    const enriched = guides.map((guide) => {
      const siteSubmissions = progressList.filter(
        (p) => p.siteId === guide.siteId && p.workCode === guide.workCode
      );
      const completed = siteSubmissions.reduce((sum, p) => sum + (Number(p.completedQuantity) || 0), 0);
      const balance = Math.max(0, guide.totalQuantity - completed);

      return {
        ...guide,
        completedQuantity: completed,
        balanceQuantity: balance,
      };
    });

    if (siteId && siteId !== 'ALL') {
      return enriched.filter((g) => g.siteId === siteId);
    }
    return enriched;
  }

  saveWorkGuidesForSite(siteId: string, items: Omit<WorkGuideItem, 'id' | 'siteId'>[]): { success: boolean; message: string; count: number } {
    if (!siteId) {
      return { success: false, message: 'Please select a valid site before saving Work Guide.', count: 0 };
    }

    const allGuides = this.get<WorkGuideItem[]>(STORAGE_KEYS.WORK_GUIDES, INITIAL_WORK_GUIDES);
    // Keep guides from other sites, replace for target site to avoid duplicates
    const otherGuides = allGuides.filter((g) => g.siteId !== siteId);

    const newItems: WorkGuideItem[] = items.map((item, idx) => ({
      ...item,
      id: `WG-${siteId}-${Date.now()}-${idx}`,
      siteId,
      totalQuantity: Number(item.totalQuantity) || 0,
      workByHour: Number(item.workByHour) || 0,
    }));

    const updated = [...otherGuides, ...newItems];
    this.set(STORAGE_KEYS.WORK_GUIDES, updated);
    this.set(STORAGE_KEYS.WORK_GUIDES_CLEARED, false);

    return {
      success: true,
      message: `Successfully saved ${newItems.length} work items for site.`,
      count: newItems.length,
    };
  }

  deleteWorkGuide(workGuideId: string): {
    success: boolean;
    message: string;
    deletedItem?: WorkGuideItem;
  } {
    if (!workGuideId || !workGuideId.trim()) {
      return { success: false, message: 'Invalid Work Guide ID.' };
    }

    const current = this.getCurrentUser();
    if (!current || current.role !== 'Admin') {
      return {
        success: false,
        message: 'Unauthorized action. Only Admin users can delete work guides.',
      };
    }

    const allGuides = this.get<WorkGuideItem[]>(STORAGE_KEYS.WORK_GUIDES, INITIAL_WORK_GUIDES);
    const targetIndex = allGuides.findIndex((g) => g.id === workGuideId);
    if (targetIndex < 0) {
      return {
        success: false,
        message: `Work Guide item "${workGuideId}" was not found or has already been deleted.`,
      };
    }

    const target = allGuides[targetIndex];
    const updated = allGuides.filter((g) => g.id !== workGuideId);
    this.set(STORAGE_KEYS.WORK_GUIDES, updated);

    // Track permanently deleted ID
    const deletedWgIds = this.get<string[]>(STORAGE_KEYS.DELETED_WORK_GUIDES, []);
    if (!deletedWgIds.includes(workGuideId)) {
      deletedWgIds.push(workGuideId);
      this.set(STORAGE_KEYS.DELETED_WORK_GUIDES, deletedWgIds);
    }

    return {
      success: true,
      message: `Work Guide item "${target.workCode} - ${target.workDescription}" deleted successfully.`,
      deletedItem: target,
    };
  }

  deleteAllWorkGuides(options?: { siteId?: string }): {
    success: boolean;
    count: number;
    message: string;
  } {
    const current = this.getCurrentUser();
    if (!current || current.role !== 'Admin') {
      return {
        success: false,
        count: 0,
        message: 'Unauthorized action. Only Admin users can delete work guides.',
      };
    }

    const allGuides = this.get<WorkGuideItem[]>(STORAGE_KEYS.WORK_GUIDES, INITIAL_WORK_GUIDES);
    const deletedWgIds = this.get<string[]>(STORAGE_KEYS.DELETED_WORK_GUIDES, []);

    let remaining: WorkGuideItem[] = [];
    let toDelete: WorkGuideItem[] = [];

    if (options?.siteId && options.siteId !== 'ALL') {
      toDelete = allGuides.filter((g) => g.siteId === options.siteId);
      remaining = allGuides.filter((g) => g.siteId !== options.siteId);
    } else {
      toDelete = [...allGuides];
      remaining = [];
      this.set(STORAGE_KEYS.WORK_GUIDES_CLEARED, true);
    }

    const count = toDelete.length;
    for (const g of toDelete) {
      if (!deletedWgIds.includes(g.id)) {
        deletedWgIds.push(g.id);
      }
    }

    this.set(STORAGE_KEYS.DELETED_WORK_GUIDES, deletedWgIds);
    this.set(STORAGE_KEYS.WORK_GUIDES, remaining);

    return {
      success: true,
      count,
      message:
        options?.siteId && options.siteId !== 'ALL'
          ? `All ${count} work guide items for the selected site have been cleared successfully.`
          : `All ${count} existing work guides across all sites have been permanently cleared.`,
    };
  }

  // Attendance
  getAttendance(filters?: { employeeId?: string; siteId?: string; date?: string }): AttendanceRecord[] {
    let records = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, generateSampleAttendance());
    const deletedAttIds = this.get<string[]>(STORAGE_KEYS.DELETED_ATTENDANCE, []);
    if (deletedAttIds.length > 0) {
      records = records.filter((r) => !deletedAttIds.includes(r.id));
    }

    if (filters?.employeeId) {
      records = records.filter((r) => isSameEmployee(r.employeeId, filters.employeeId));
    }
    if (filters?.siteId && filters.siteId !== 'ALL') {
      records = records.filter((r) => r.siteId === filters.siteId);
    }
    if (filters?.date) {
      records = records.filter((r) => r.date === filters.date);
    }

    return records.sort((a, b) => (b.date + (b.punchInTime || '')).localeCompare(a.date + (a.punchInTime || '')));
  }

  getTodayAttendanceForUser(employeeId: string, date: string = getTodayDateString()): AttendanceRecord | null {
    const list = this.getAttendance({ employeeId, date });
    return list.length > 0 ? list[0] : null;
  }

  punchIn(user: User, photoBase64?: string, siteId?: string): { success: boolean; message: string; record: AttendanceRecord } {
    const today = getTodayDateString();
    const time = getCurrentTimeString();
    const records = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);

    // Check if already punched in today
    const existingIndex = records.findIndex((r) => isSameEmployee(r.employeeId, user.id) && r.date === today);

    const assignedSiteId = (siteId && siteId !== 'ALL') ? siteId : (user.siteId !== 'ALL' ? user.siteId : 'SITE-01');
    const siteObj = this.getSites().find((s) => s.id === assignedSiteId);
    const siteName = siteObj ? siteObj.name : user.siteName;

    if (existingIndex >= 0) {
      const existing = records[existingIndex];
      if (existing.punchInTime && !existing.punchOutTime) {
        return {
          success: false,
          message: `Already punched in today at ${existing.punchInTime}. Ready for Punch Out.`,
          record: existing,
        };
      }
      if (existing.punchInTime && existing.punchOutTime) {
        return {
          success: false,
          message: `Attendance cycle for today is already completed (Punched Out at ${existing.punchOutTime}).`,
          record: existing,
        };
      }
    }

    const newRecord: AttendanceRecord = {
      id: `ATT-${today}-${user.id}-${Date.now()}`,
      employeeId: user.id,
      employeeName: user.name,
      date: today,
      siteId: assignedSiteId,
      siteName,
      punchInTime: time,
      punchInPhoto: photoBase64 || null,
      punchOutTime: null,
      punchOutPhoto: null,
      status: 'PunchedIn',
      notes: 'Punched in via Attendance Plus camera',
    };

    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }

    this.set(STORAGE_KEYS.ATTENDANCE, records);
    return { success: true, message: `Punch In recorded at ${time}.`, record: newRecord };
  }

  punchOut(user: User, photoBase64?: string): { success: boolean; message: string; record: AttendanceRecord | null } {
    const today = getTodayDateString();
    const time = getCurrentTimeString();
    const records = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);

    const existingIndex = records.findIndex((r) => isSameEmployee(r.employeeId, user.id) && r.date === today);
    if (existingIndex < 0 || !records[existingIndex].punchInTime) {
      return {
        success: false,
        message: 'No Punch In found for today. Please Punch In first.',
        record: null,
      };
    }

    const existing = records[existingIndex];
    if (existing.punchOutTime) {
      return {
        success: false,
        message: `Already punched out today at ${existing.punchOutTime}.`,
        record: existing,
      };
    }

    const updated: AttendanceRecord = {
      ...existing,
      punchOutDate: today,
      punchOutTime: time,
      punchOutPhoto: photoBase64 || existing.punchInPhoto,
      status: 'Present',
      notes: `${existing.notes || ''} | Punched out at ${time}`,
    };

    records[existingIndex] = updated;
    this.set(STORAGE_KEYS.ATTENDANCE, records);

    return { success: true, message: `Punch Out recorded at ${time}. Attendance completed.`, record: updated };
  }

  deleteAttendanceRecord(
    recordId: string
  ): { success: boolean; message: string; deletedRecord?: AttendanceRecord } {
    if (!recordId || !recordId.trim()) {
      return { success: false, message: 'Invalid attendance record ID.' };
    }

    const current = this.getCurrentUser();
    // Permissions check: Only Admin can delete attendance records
    if (!current || current.role !== 'Admin') {
      return {
        success: false,
        message: 'Unauthorized action. Only Admin users can delete attendance records.',
      };
    }

    const all = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const targetIndex = all.findIndex((r) => r.id === recordId);
    if (targetIndex < 0) {
      return {
        success: false,
        message: `Attendance record "${recordId}" was not found or has already been deleted.`,
      };
    }

    const targetRecord = all[targetIndex];
    // Remove only the selected record; all other records remain untouched
    const updated = all.filter((r) => r.id !== recordId);
    this.set(STORAGE_KEYS.ATTENDANCE, updated);

    // Track permanently deleted attendance ID to prevent resurrection across reloads
    const deletedAttIds = this.get<string[]>(STORAGE_KEYS.DELETED_ATTENDANCE, []);
    if (!deletedAttIds.includes(recordId)) {
      deletedAttIds.push(recordId);
      this.set(STORAGE_KEYS.DELETED_ATTENDANCE, deletedAttIds);
    }

    return {
      success: true,
      message: `Attendance record for ${targetRecord.employeeName} (${targetRecord.employeeId}) on ${targetRecord.date} has been permanently deleted.`,
      deletedRecord: targetRecord,
    };
  }

  deleteAllAttendanceRecords(): {
    success: boolean;
    count: number;
    message: string;
  } {
    const current = this.getCurrentUser();
    // Permissions check: Only Admin can delete all attendance records
    if (!current || current.role !== 'Admin') {
      return {
        success: false,
        count: 0,
        message: 'Unauthorized action. Only Admin users can delete all attendance records.',
      };
    }

    const all = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const count = all.length;

    // Track all existing record IDs as permanently deleted
    const deletedAttIds = this.get<string[]>(STORAGE_KEYS.DELETED_ATTENDANCE, []);
    for (const r of all) {
      if (!deletedAttIds.includes(r.id)) {
        deletedAttIds.push(r.id);
      }
    }
    this.set(STORAGE_KEYS.DELETED_ATTENDANCE, deletedAttIds);

    // Clear the attendance array in persistent database storage and set cleared flag
    this.set(STORAGE_KEYS.ATTENDANCE, []);
    this.set(STORAGE_KEYS.ATTENDANCE_CLEARED, true);

    return {
      success: true,
      count,
      message: `All ${count} attendance records have been permanently deleted from the database.`,
    };
  }

  // Progress Submissions
  getProgressSubmissions(filters?: { employeeId?: string; siteId?: string; date?: string }): ProgressSubmission[] {
    let list = this.get<ProgressSubmission[]>(STORAGE_KEYS.PROGRESS, []);
    const deletedProgIds = this.get<string[]>(STORAGE_KEYS.DELETED_PROGRESS, []);
    list = list.filter((p) => !deletedProgIds.includes(p.id));

    if (filters?.employeeId) {
      list = list.filter((p) => p.employeeId === filters.employeeId);
    }
    if (filters?.siteId && filters.siteId !== 'ALL') {
      list = list.filter((p) => p.siteId === filters.siteId);
    }
    if (filters?.date) {
      list = list.filter((p) => p.submissionDate === filters.date);
    }

    return list.sort((a, b) => (b.submissionDate + b.submissionTime).localeCompare(a.submissionDate + a.submissionTime));
  }

  // Internal factor calculation rule:
  // Normal Work: 1.0, Critical Work: 0.8, Very Critical Work: 0.6
  // These internal multipliers are NEVER displayed in the employee work-selection screen.
  getWorkTypeFactor(workType: WorkType): number {
    switch (workType) {
      case 'Very Critical Work':
        return 0.6;
      case 'Critical Work':
        return 0.8;
      case 'Normal Work':
      default:
        return 1.0;
    }
  }

  calculateProgressPoints(
    completedQty: number,
    workGuideRate: number,
    workingHours: number,
    workType: WorkType
  ): { points: number; targetQty: number; achievementPercent: number } {
    const factor = this.getWorkTypeFactor(workType);
    const targetQty = workingHours * workGuideRate * factor;
    const achievementPercent = targetQty > 0 ? (completedQty / targetQty) * 100 : 100;

    // Standard PMS points calculation:
    // Base weight by difficulty: Normal: 1.0, Critical: 1.35, Very Critical: 1.75
    const difficultyMultiplier =
      workType === 'Very Critical Work' ? 1.75 : workType === 'Critical Work' ? 1.35 : 1.0;

    // Rate scaling
    const normalizedRateWeight = workGuideRate > 0 ? Math.min(2.5, 10 / workGuideRate) : 1;
    const calculatedPoints = Math.round(
      completedQty * difficultyMultiplier * normalizedRateWeight * (achievementPercent >= 100 ? 1.15 : 1.0)
    );

    return {
      points: Math.max(10, calculatedPoints),
      targetQty: Math.round(targetQty * 100) / 100,
      achievementPercent: Math.round(achievementPercent),
    };
  }

  saveProgressSubmission(submission: Omit<ProgressSubmission, 'id' | 'submissionDate' | 'submissionTime' | 'points' | 'targetQuantity' | 'achievementPercent' | 'approvalStatus'>): {
    success: boolean;
    message: string;
    record?: ProgressSubmission;
  } {
    if (!submission.workCode) {
      return { success: false, message: 'Please select a valid Work Code.' };
    }
    if (!submission.completedQuantity || submission.completedQuantity <= 0) {
      return { success: false, message: 'Completed Quantity must be greater than 0.' };
    }
    if (!submission.workingHours || submission.workingHours <= 0) {
      return { success: false, message: 'Working Hours must be greater than 0.' };
    }

    const today = getTodayDateString();
    const time = getCurrentTimeString();

    const { points, targetQty, achievementPercent } = this.calculateProgressPoints(
      submission.completedQuantity,
      submission.workGuideRate,
      submission.workingHours,
      submission.workType
    );

    const newRecord: ProgressSubmission = {
      ...submission,
      id: `PROG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submissionDate: today,
      submissionTime: time,
      targetQuantity: targetQty,
      achievementPercent,
      points,
      approvalStatus: 'Pending',
    };

    const all = this.get<ProgressSubmission[]>(STORAGE_KEYS.PROGRESS, []);
    all.unshift(newRecord);
    this.set(STORAGE_KEYS.PROGRESS, all);

    return { success: true, message: 'Progress submitted successfully.', record: newRecord };
  }

  updateProgressApproval(
    id: string,
    status: 'Approved' | 'Rejected' | 'Reviewed',
    supervisorRemarks?: string,
    managerRemarks?: string
  ): { success: boolean; message: string } {
    const all = this.get<ProgressSubmission[]>(STORAGE_KEYS.PROGRESS, []);
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) {
      return { success: false, message: 'Progress submission not found.' };
    }

    all[idx] = {
      ...all[idx],
      approvalStatus: status,
      supervisorRemarks: supervisorRemarks !== undefined ? supervisorRemarks : all[idx].supervisorRemarks,
      managerRemarks: managerRemarks !== undefined ? managerRemarks : all[idx].managerRemarks,
    };

    this.set(STORAGE_KEYS.PROGRESS, all);
    return { success: true, message: `Progress record marked as ${status}.` };
  }

  deleteProgressSubmission(progressId: string): { success: boolean; message: string; deletedRecord?: ProgressSubmission } {
    if (!progressId || !progressId.trim()) {
      return { success: false, message: 'Invalid progress record ID.' };
    }

    const current = this.getCurrentUser();
    // Security verification: Only Admin can delete employee progress records
    if (!current || current.role !== 'Admin') {
      return { success: false, message: 'Unauthorized action. Only Admin users can delete progress records.' };
    }

    const all = this.get<ProgressSubmission[]>(STORAGE_KEYS.PROGRESS, []);
    const targetIndex = all.findIndex((p) => p.id === progressId);
    if (targetIndex < 0) {
      return { success: false, message: `Progress record "${progressId}" was not found or has already been removed.` };
    }

    const targetRecord = all[targetIndex];

    // Remove only the selected progress record from the database
    const updated = all.filter((p) => p.id !== progressId);
    this.set(STORAGE_KEYS.PROGRESS, updated);

    // Track permanently deleted progress ID to prevent resurrection across reloads
    const deletedProgIds = this.get<string[]>(STORAGE_KEYS.DELETED_PROGRESS, []);
    if (!deletedProgIds.includes(progressId)) {
      deletedProgIds.push(progressId);
      this.set(STORAGE_KEYS.DELETED_PROGRESS, deletedProgIds);
    }

    // Preservation rule:
    // Attendance records, user accounts, other progress entries belonging to the same employee,
    // other employees' records, and Work Guide master data remain untouched and 100% intact.
    // Derived points and completed/balance quantities automatically recalculate cleanly from remaining records.

    return {
      success: true,
      message: `Progress record for ${targetRecord.workCode} (${targetRecord.employeeName}) deleted successfully. Employee points and site quantities recalculated.`,
      deletedRecord: targetRecord,
    };
  }

  // Employee Points aggregation
  getEmployeePointsSummary(siteId?: string): {
    employeeId: string;
    employeeName: string;
    siteName: string;
    totalPoints: number;
    totalHours: number;
    totalSubmissions: number;
    approvedSubmissions: number;
  }[] {
    const progressList = this.getProgressSubmissions({ siteId });
    const userMap = new Map<string, { employeeId: string; employeeName: string; siteName: string; totalPoints: number; totalHours: number; totalSubmissions: number; approvedSubmissions: number }>();

    for (const prog of progressList) {
      const existing = userMap.get(prog.employeeId) || {
        employeeId: prog.employeeId,
        employeeName: prog.employeeName,
        siteName: prog.siteName,
        totalPoints: 0,
        totalHours: 0,
        totalSubmissions: 0,
        approvedSubmissions: 0,
      };

      existing.totalPoints += prog.points || 0;
      existing.totalHours += prog.workingHours || 0;
      existing.totalSubmissions += 1;
      if (prog.approvalStatus === 'Approved') {
        existing.approvedSubmissions += 1;
      }

      userMap.set(prog.employeeId, existing);
    }

    return Array.from(userMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
  }

  // Excel Bulk Upload parsing and template generator
  parseWorkGuideExcel(file: File): Promise<{
    success: boolean;
    data?: Omit<WorkGuideItem, 'id' | 'siteId'>[];
    errors?: string[];
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            return resolve({ success: false, errors: ['The uploaded workbook has no sheets.'] });
          }

          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (rawRows.length === 0) {
            return resolve({ success: false, errors: ['The worksheet is empty. No data found.'] });
          }

          // Validate required headers
          // Supported headers:
          // Work Code / Code Number
          // Work Description
          // Work Duration
          // Work by Hour / Rate
          // UOM
          // Total Quantity
          const errors: string[] = [];
          const validItems: Omit<WorkGuideItem, 'id' | 'siteId'>[] = [];

          rawRows.forEach((row, index) => {
            const rowNumber = index + 2; // account for header row in Excel

            // Find work code
            const workCode =
              row['Work Code'] ||
              row['Code Number'] ||
              row['workCode'] ||
              row['Code'] ||
              row['WORK CODE'];

            // Find work description
            const workDescription =
              row['Work Description'] ||
              row['Description'] ||
              row['workDescription'] ||
              row['WORK DESCRIPTION'];

            // Find work duration
            const workDuration =
              row['Work Duration'] ||
              row['Duration'] ||
              row['workDuration'] ||
              row['WORK DURATION'] ||
              '8 Hours';

            // Find work by hour
            const rawRate =
              row['Work by Hour'] ||
              row['Rate'] ||
              row['Work By Hour'] ||
              row['workByHour'] ||
              row['Rate by Hour'];

            // Find UOM
            const uom =
              row['UOM'] ||
              row['Unit'] ||
              row['uom'] ||
              row['Unit of Measure'];

            // Find Total Quantity
            const rawTotalQty =
              row['Total Quantity'] ||
              row['Total Qty'] ||
              row['totalQuantity'] ||
              row['Quantity'] ||
              row['TOTAL QUANTITY'];

            const rowErrors: string[] = [];

            if (!workCode || String(workCode).trim() === '') {
              rowErrors.push('Missing Work Code / Code Number');
            }
            if (!workDescription || String(workDescription).trim() === '') {
              rowErrors.push('Missing Work Description');
            }
            if (rawRate === '' || isNaN(Number(rawRate)) || Number(rawRate) <= 0) {
              rowErrors.push(`Invalid Work by Hour rate ("${rawRate}")`);
            }
            if (!uom || String(uom).trim() === '') {
              rowErrors.push('Missing UOM');
            }
            if (rawTotalQty === '' || isNaN(Number(rawTotalQty)) || Number(rawTotalQty) < 0) {
              rowErrors.push(`Invalid Total Quantity ("${rawTotalQty}")`);
            }

            if (rowErrors.length > 0) {
              errors.push(`Row ${rowNumber}: ${rowErrors.join(', ')}`);
            } else {
              validItems.push({
                workCode: String(workCode).trim(),
                workDescription: String(workDescription).trim(),
                workDuration: String(workDuration).trim(),
                workByHour: Number(rawRate),
                uom: String(uom).trim(),
                totalQuantity: Number(rawTotalQty),
              });
            }
          });

          if (errors.length > 0) {
            resolve({
              success: false,
              errors,
              data: validItems,
            });
          } else {
            resolve({
              success: true,
              data: validItems,
            });
          }
        } catch (err: any) {
          resolve({
            success: false,
            errors: [`Failed to parse Excel file: ${err.message || 'Unknown error'}`],
          });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, errors: ['Failed to read file from disk.'] });
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // Export sample Excel template
  downloadWorkGuideTemplate(siteName: string = 'Jurong Island'): void {
    const templateData = [
      {
        'Work Code': 'WC-101',
        'Work Description': 'Cable Tray Installation & Bracket Fastening',
        'Work Duration': '8 Hours',
        'Work by Hour': 4.5,
        UOM: 'm',
        'Total Quantity': 500,
      },
      {
        'Work Code': 'WC-102',
        'Work Description': 'GI Conduit Pipe Laying & Saddle Fixing',
        'Work Duration': '8 Hours',
        'Work by Hour': 6.0,
        UOM: 'm',
        'Total Quantity': 600,
      },
      {
        'Work Code': 'WC-103',
        'Work Description': 'Distribution Board (DB) Dressing & Glanding',
        'Work Duration': '8 Hours',
        'Work by Hour': 1.0,
        UOM: 'nos',
        'Total Quantity': 35,
      },
      {
        'Work Code': 'WC-104',
        'Work Description': 'Main Earthing Wire Clamping & Welding',
        'Work Duration': '8 Hours',
        'Work by Hour': 12.0,
        UOM: 'm',
        'Total Quantity': 800,
      },
      {
        'Work Code': 'WC-105',
        'Work Description': 'Explosion-Proof LED Fixture Assembly',
        'Work Duration': '8 Hours',
        'Work by Hour': 3.5,
        UOM: 'nos',
        'Total Quantity': 150,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WorkGuide');
    XLSX.writeFile(workbook, `Work_Guide_Template_${siteName.replace(/\s+/g, '_')}.xlsx`);
  }

  // Export Reports to Excel
  exportReportToExcel(data: any[], fileName: string, sheetName: string = 'Report'): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }
}

export const storage = new StorageService();
