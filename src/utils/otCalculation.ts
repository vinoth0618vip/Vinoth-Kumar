import { AttendanceRecord, User } from '../types';

export interface OTSheetRow {
  id: string; // attendance record ID
  employeeId: string;
  employeeName: string;
  punchInDate: string; // Formatted date & time or date
  punchOutDate: string; // Formatted date & time or date, or '—'
  overtime: string; // e.g. "8 hrs 40 mins", "0 hrs 0 mins", or "—"
  overtimeMinutes: number;
  hasValidPunchTimes: boolean;
  siteId: string;
  siteName: string;
  rawDate: string;
}

/**
 * Parses date ('YYYY-MM-DD') and time ('HH:mm:ss' or 'HH:mm') into a valid Date object.
 */
export function parseAttendanceDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;

  try {
    const cleanTime = timeStr.trim();
    const isPm = /pm/i.test(cleanTime);
    const isAm = /am/i.test(cleanTime);
    const timeOnly = cleanTime.replace(/\s*(am|pm)/i, '').trim();
    const parts = timeOnly.split(':').map((p) => parseInt(p, 10));

    if (parts.length < 2 || parts.some((p) => isNaN(p))) return null;

    let [hours, minutes, seconds = 0] = parts;
    if (isPm && hours < 12) hours += 12;
    if (isAm && hours === 12) hours = 0;

    const [year, month, day] = dateStr.split('-').map((p) => parseInt(p, 10));
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch {
    return null;
  }
}

/**
 * Calculates overtime from an AttendanceRecord.
 * 
 * Rules:
 * 1. Calculate actual working duration using recorded Punch In and Punch Out date/time.
 * 2. Deduct exactly 1 hour (60 minutes) from working duration:
 *    Formula: Overtime = Actual Working Duration - 1 hour
 * 3. Display overtime in hours and minutes: e.g. "8 hrs 40 mins", "0 hrs 15 mins", "0 hrs 0 mins".
 * 4. Do not display negative overtime: If duration <= 1 hour, show "0 hrs 0 mins".
 * 5. Handle overnight shifts correctly using actual date & time.
 * 6. Use actual saved attendance records. Do not assume or generate missing punch times.
 */
export function calculateOvertimeForRecord(
  record: AttendanceRecord,
  userMap?: Map<string, User>
): OTSheetRow {
  // Fetch Employee ID and Employee Name from existing employee records if available
  const matchedUser = userMap?.get(record.employeeId);
  const employeeId = matchedUser ? matchedUser.id : record.employeeId;
  const employeeName = matchedUser ? matchedUser.name : record.employeeName;

  // Punch In Date & Time
  if (!record.punchInTime) {
    return {
      id: record.id,
      employeeId,
      employeeName,
      punchInDate: '—',
      punchOutDate: '—',
      overtime: '—',
      overtimeMinutes: 0,
      hasValidPunchTimes: false,
      siteId: record.siteId,
      siteName: record.siteName,
      rawDate: record.date,
    };
  }

  const inDate = parseAttendanceDateTime(record.date, record.punchInTime);
  const punchInDateDisplay = `${record.date} ${record.punchInTime}`;

  // If Punch Out is missing
  if (!record.punchOutTime) {
    return {
      id: record.id,
      employeeId,
      employeeName,
      punchInDate: punchInDateDisplay,
      punchOutDate: '—',
      overtime: '—',
      overtimeMinutes: 0,
      hasValidPunchTimes: false,
      siteId: record.siteId,
      siteName: record.siteName,
      rawDate: record.date,
    };
  }

  // Resolve Punch Out Date
  // If record has explicit punchOutDate, use it.
  // Otherwise check if punchOutTime is earlier in day than punchInTime -> overnight shift!
  let resolvedPunchOutDateStr = record.punchOutDate;
  if (!resolvedPunchOutDateStr) {
    const [inH = 0, inM = 0] = record.punchInTime.split(':').map((p) => parseInt(p, 10));
    const [outH = 0, outM = 0] = record.punchOutTime.split(':').map((p) => parseInt(p, 10));
    const inTotalMins = inH * 60 + inM;
    const outTotalMins = outH * 60 + outM;

    if (outTotalMins < inTotalMins) {
      // Overnight shift: next calendar day
      const d = new Date(`${record.date}T00:00:00`);
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dt = String(d.getDate()).padStart(2, '0');
      resolvedPunchOutDateStr = `${y}-${m}-${dt}`;
    } else {
      resolvedPunchOutDateStr = record.date;
    }
  }

  const outDate = parseAttendanceDateTime(resolvedPunchOutDateStr, record.punchOutTime);
  const punchOutDateDisplay = `${resolvedPunchOutDateStr} ${record.punchOutTime}`;

  if (!inDate || !outDate) {
    return {
      id: record.id,
      employeeId,
      employeeName,
      punchInDate: punchInDateDisplay,
      punchOutDate: punchOutDateDisplay,
      overtime: '0 hrs 0 mins',
      overtimeMinutes: 0,
      hasValidPunchTimes: true,
      siteId: record.siteId,
      siteName: record.siteName,
      rawDate: record.date,
    };
  }

  // Calculate actual working duration in minutes
  const diffMs = outDate.getTime() - inDate.getTime();
  const totalWorkingMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  // Deduct exactly 1 hour (60 minutes) from calculated working duration
  // Formula: Overtime = Actual Working Duration - 1 hour
  // If duration <= 1 hour (60 mins), overtime is 0 hours
  let otMinutes = 0;
  if (totalWorkingMinutes > 60) {
    otMinutes = totalWorkingMinutes - 60;
  }

  const otHours = Math.floor(otMinutes / 60);
  const otRemainingMins = otMinutes % 60;
  const overtimeFormatted = `${otHours} hrs ${otRemainingMins} mins`;

  return {
    id: record.id,
    employeeId,
    employeeName,
    punchInDate: punchInDateDisplay,
    punchOutDate: punchOutDateDisplay,
    overtime: overtimeFormatted,
    overtimeMinutes: otMinutes,
    hasValidPunchTimes: true,
    siteId: record.siteId,
    siteName: record.siteName,
    rawDate: record.date,
  };
}

/**
 * Process a list of attendance records into OT Sheet rows.
 */
export function generateOTSheetData(
  records: AttendanceRecord[],
  users: User[]
): OTSheetRow[] {
  const userMap = new Map<string, User>();
  for (const user of users) {
    userMap.set(user.id, user);
  }

  return records.map((record) => calculateOvertimeForRecord(record, userMap));
}

/**
 * Formats a YYYY-MM-DD date into DD-MM-YYYY format (e.g. 19-10-2026).
 */
export function formatDateToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '—';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }
  return dateStr;
}

/**
 * Returns today's date formatted as DD-MM-YYYY.
 */
export function getTodayDDMMYYYY(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export interface IndividualOTDayItem {
  id: string;
  rawDate: string; // YYYY-MM-DD
  date: string; // Formatted DD-MM-YYYY
  punchInTime: string; // e.g. "07:48:30" or "—"
  punchOutTime: string; // e.g. "17:35:45" or "—"
  overtime: string; // e.g. "8 hrs 47 mins", "0 hrs 0 mins", or "—"
  overtimeMinutes: number;
  status: 'Complete' | 'Missing Punch Out' | 'Leave';
  notes?: string;
}

/**
 * Calculates single day OT Sheet entry according to strict PMS status rules:
 * - If Punch In and Punch Out are both recorded: show Complete
 * - If Punch In is recorded but Punch Out is missing: show Missing Punch Out
 * - If neither Punch In nor Punch Out is recorded and marked absent/leave: show Leave
 * - Overtime = Actual Working Duration - 1 hour (deducts 1 hour break)
 */
export function calculateIndividualOTDay(record: AttendanceRecord): IndividualOTDayItem {
  const formattedDate = formatDateToDDMMYYYY(record.date);
  const hasIn = Boolean(record.punchInTime && record.punchInTime.trim());
  const hasOut = Boolean(record.punchOutTime && record.punchOutTime.trim());

  if (hasIn && hasOut) {
    // Complete
    const inDate = parseAttendanceDateTime(record.date, record.punchInTime!);
    let resolvedOutDateStr = record.punchOutDate || record.date;
    const [inH = 0, inM = 0] = record.punchInTime!.split(':').map((p) => parseInt(p, 10));
    const [outH = 0, outM = 0] = record.punchOutTime!.split(':').map((p) => parseInt(p, 10));
    if (!record.punchOutDate && outH * 60 + outM < inH * 60 + inM) {
      const d = new Date(`${record.date}T00:00:00`);
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dt = String(d.getDate()).padStart(2, '0');
      resolvedOutDateStr = `${y}-${m}-${dt}`;
    }
    const outDate = parseAttendanceDateTime(resolvedOutDateStr, record.punchOutTime!);

    let otMinutes = 0;
    if (inDate && outDate) {
      const diffMs = outDate.getTime() - inDate.getTime();
      const totalWorkingMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      if (totalWorkingMinutes > 60) {
        otMinutes = totalWorkingMinutes - 60;
      }
    }
    const otHours = Math.floor(otMinutes / 60);
    const otRemMins = otMinutes % 60;
    const overtime = `${otHours} hrs ${otRemMins} mins`;

    return {
      id: record.id,
      rawDate: record.date,
      date: formattedDate,
      punchInTime: record.punchInTime!,
      punchOutTime: record.punchOutTime!,
      overtime,
      overtimeMinutes: otMinutes,
      status: 'Complete',
      notes: record.notes,
    };
  }

  if (hasIn && !hasOut) {
    // Missing Punch Out
    return {
      id: record.id,
      rawDate: record.date,
      date: formattedDate,
      punchInTime: record.punchInTime!,
      punchOutTime: '—',
      overtime: '—',
      overtimeMinutes: 0,
      status: 'Missing Punch Out',
      notes: record.notes,
    };
  }

  // Neither punch in nor punch out recorded
  return {
    id: record.id,
    rawDate: record.date,
    date: formattedDate,
    punchInTime: '—',
    punchOutTime: '—',
    overtime: '—',
    overtimeMinutes: 0,
    status: 'Leave',
    notes: record.notes || 'Leave / Rest Day',
  };
}
