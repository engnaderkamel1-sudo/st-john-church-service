/**
 * أدوات مساعدة لحساب نافذة فتح وإغلاق الامتحانات المجدولة وفترة السماح
 */

export function parseScheduleMs(value) {
  if (!value) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value?.seconds) return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getExamStartStorageKey(userId, examId) {
  return `st_john_exam_start_${userId || 'guest'}_${examId}`;
}

export function getRecordedExamStartMs(userId, examId) {
  try {
    const raw = localStorage.getItem(getExamStartStorageKey(userId, examId));
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch {
    return null;
  }
}

export function recordExamStartIfNeeded(userId, examId, nowMs = Date.now()) {
  try {
    const key = getExamStartStorageKey(userId, examId);
    const existing = localStorage.getItem(key);
    if (existing) {
      const num = Number(existing);
      if (Number.isFinite(num) && num > 0) return num;
    }
    localStorage.setItem(key, String(nowMs));
    return nowMs;
  } catch {
    return nowMs;
  }
}

export function getExamScheduleState(exam, nowMs = Date.now(), startedAtMs = null) {
  if (!exam) {
    return {
      phase: 'closed',
      isVisibleToStudent: false,
      canStart: false,
      canSubmit: false,
      inGrace: false,
      openAtMs: null,
      closeAtMs: null,
      graceEndAtMs: null
    };
  }

  const openAtMs = parseScheduleMs(exam.openAt);
  const closeAtMs = parseScheduleMs(exam.closeAt);
  const graceMinutes = Number(exam.graceMinutes) || 0;
  const graceEndAtMs = closeAtMs ? closeAtMs + graceMinutes * 60 * 1000 : null;

  // Before open time
  if (openAtMs && nowMs < openAtMs) {
    return {
      phase: 'before_open',
      isVisibleToStudent: !exam.hideBeforeOpen,
      canStart: false,
      canSubmit: false,
      inGrace: false,
      openAtMs,
      closeAtMs,
      graceEndAtMs
    };
  }

  // After hard close (+ grace)
  if (closeAtMs && nowMs > (graceEndAtMs || closeAtMs)) {
    return {
      phase: 'closed',
      isVisibleToStudent: false,
      canStart: false,
      canSubmit: false,
      inGrace: false,
      openAtMs,
      closeAtMs,
      graceEndAtMs
    };
  }

  // Within grace window (between closeAt and closeAt + graceMinutes)
  if (closeAtMs && nowMs > closeAtMs) {
    const startedBeforeClose = Boolean(startedAtMs && startedAtMs <= closeAtMs);
    return {
      phase: startedBeforeClose ? 'grace' : 'closed',
      isVisibleToStudent: startedBeforeClose,
      canStart: false,
      canSubmit: startedBeforeClose,
      inGrace: startedBeforeClose,
      openAtMs,
      closeAtMs,
      graceEndAtMs
    };
  }

  // Open window (or unscheduled)
  return {
    phase: 'open',
    isVisibleToStudent: true,
    canStart: true,
    canSubmit: true,
    inGrace: false,
    openAtMs,
    closeAtMs,
    graceEndAtMs
  };
}

export function formatCairoDateTime(value) {
  const ms = parseScheduleMs(value);
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return new Date(ms).toLocaleString('ar-EG');
  }
}

export function toDatetimeLocalCairoValue(value) {
  const ms = parseScheduleMs(value);
  if (!ms) return '';
  try {
    // Format YYYY-MM-DDTHH:mm in Africa/Cairo timezone
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(new Date(ms));
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const hh = map.hour === '24' ? '00' : map.hour;
    return `${map.year}-${map.month}-${map.day}T${hh}:${map.minute}`;
  } catch {
    return '';
  }
}
