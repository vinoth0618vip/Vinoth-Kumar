import { AttendanceRecord } from '../types';

/**
 * Normalizes an employee ID by stripping hyphens, underscores, and spaces,
 * and converting to uppercase, ensuring robust matching (e.g. "EMP001" === "EMP-001").
 */
export function normalizeEmpId(id: string | null | undefined): string {
  if (!id) return '';
  return id.replace(/[-_ ]/g, '').toUpperCase();
}

/**
 * Checks if two employee IDs refer to the same employee.
 */
export function isSameEmployee(id1: string | null | undefined, id2: string | null | undefined): boolean {
  if (!id1 || !id2) return false;
  return id1 === id2 || normalizeEmpId(id1) === normalizeEmpId(id2);
}

/**
 * Calculates working duration in minutes and human-readable format ("Xh Ym").
 * Handles overnight shifts automatically.
 */
export function calculateDailyWorkingHours(
  inTime: string | null | undefined,
  outTime: string | null | undefined,
  dateStr: string,
  punchOutDateStr?: string | null
): {
  totalMinutes: number;
  hours: number;
  minutes: number;
  formatted: string;
} {
  if (!inTime || !outTime) {
    return { totalMinutes: 0, hours: 0, minutes: 0, formatted: '—' };
  }

  try {
    const [inH = 0, inM = 0, inS = 0] = inTime.split(':').map((p) => parseInt(p, 10));
    const [outH = 0, outM = 0, outS = 0] = outTime.split(':').map((p) => parseInt(p, 10));

    const inDateObj = new Date(
      `${dateStr}T${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')}:${String(inS).padStart(2, '0')}`
    );

    let resolvedOutDateStr = punchOutDateStr;
    if (!resolvedOutDateStr) {
      if (outH * 60 + outM < inH * 60 + inM) {
        // Overnight shift: punch out occurred next calendar day
        const d = new Date(`${dateStr}T00:00:00`);
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dt = String(d.getDate()).padStart(2, '0');
        resolvedOutDateStr = `${y}-${m}-${dt}`;
      } else {
        resolvedOutDateStr = dateStr;
      }
    }

    const outDateObj = new Date(
      `${resolvedOutDateStr}T${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}:${String(outS).padStart(2, '0')}`
    );

    const diffMs = outDateObj.getTime() - inDateObj.getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      totalMinutes,
      hours,
      minutes,
      formatted: `${hours}h ${minutes}m`,
    };
  } catch {
    return { totalMinutes: 0, hours: 0, minutes: 0, formatted: '—' };
  }
}

export interface MonthDayInfo {
  dateString: string; // "YYYY-MM-DD"
  dayNumber: number; // 1..31
  dayName: string; // "Mon", "Tue", etc.
  dayOfWeek: number; // 0..6 (0 = Sunday)
  isSunday: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

/**
 * Generates all calendar dates for a given month and year (from 1st to last day).
 */
export function getMonthDays(year: number, month: number, todayDateStr: string): MonthDayInfo[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: MonthDayInfo[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const yStr = dateObj.getFullYear();
    const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dStr = String(dateObj.getDate()).padStart(2, '0');
    const dateString = `${yStr}-${mStr}-${dStr}`;
    const dayOfWeek = dateObj.getDay();

    result.push({
      dateString,
      dayNumber: day,
      dayName: dayNames[dayOfWeek],
      dayOfWeek,
      isSunday: dayOfWeek === 0,
      isToday: dateString === todayDateStr,
      isPast: dateString < todayDateStr,
      isFuture: dateString > todayDateStr,
    });
  }

  return result;
}
