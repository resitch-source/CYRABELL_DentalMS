// ═══════════════════════════════════════════════════════════════════════════

function parseLocalDate(s) {
  if (!s) return null;
  if (s instanceof Date) {
    if (s.getFullYear() < 1970) return null;
    return s;
  }
  const str = String(s);
  if (str.indexOf('1899-12-30') === 0) return null;
  const datePart = str.length > 10 && str.indexOf('T') === 10 ? str.substring(0, 10) : str;
  const parts = datePart.split('-');
  if (parts.length !== 3) {
    const d = new Date(str);
    if (isNaN(d.getTime()) || d.getFullYear() < 1970) return null;
    return d;
  }
  const y = +parts[0], m = +parts[1], dd = +parts[2];
  if (y < 1970 || isNaN(y) || isNaN(m) || isNaN(dd)) return null;
  const d = new Date(y, m - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDateLong(s) {
  const d = parseLocalDate(s);
  if (!d) return s || '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateShort(s) {
  const d = parseLocalDate(s);
  if (!d) return s || '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateWithDay(s) {
  const d = parseLocalDate(s);
  if (!d) return s || '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtDateFull(s) {
  const d = parseLocalDate(s);
  if (!d) return s || '';
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtTime(s) {
  // Accept 0 (midnight as fraction-of-day = 0, or time '00:00')
  if (s === null || s === undefined || s === '') return '';
  let hh, mm;
  if (s instanceof Date) {
    hh = s.getHours();
    mm = String(s.getMinutes()).padStart(2, '0');
  } else if (typeof s === 'number' && s < 1 && s >= 0) {
    const totalMin = Math.round(s * 24 * 60);
    hh = Math.floor(totalMin / 60);
    mm = String(totalMin % 60).padStart(2, '0');
  } else if (typeof s === 'string' && s.indexOf('1899-12-30') === 0) {
    const m = s.match(/T(\d{1,2}):(\d{2})/);
    if (m) { hh = +m[1]; mm = m[2]; } else return '';
  } else if (typeof s === 'string' && s.match(/T\d{1,2}:\d{2}/)) {
    const m = s.match(/T(\d{1,2}):(\d{2})/);
    if (m) { hh = +m[1]; mm = m[2]; } else return s;
  } else {
    const str = String(s).trim();
    if (/[AP]M$/i.test(str)) return str;
    const parts = str.split(':');
    if (parts.length < 2) return s;
    hh = +parts[0];
    mm = String(parts[1]).substring(0, 2).padStart(2, '0');
  }
  if (isNaN(hh)) return '';
  const ampm = hh >= 12 ? 'PM' : 'AM';
  if (hh === 0) hh = 12;
  else if (hh > 12) hh -= 12;
  return hh + ':' + mm + ' ' + ampm;
}

function fmtDateRelative(s) {
  const d = parseLocalDate(s);
  if (!d) return s || '';
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(d);
  target.setHours(0,0,0,0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return 'In ' + diffDays + ' days · ' + d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  if (diffDays < 0 && diffDays > -7) {
    return Math.abs(diffDays) + ' days ago';
  }
  return fmtDateWithDay(s);
}

function dateTimeValue(date, time) {
  const d = parseLocalDate(date);
  if (!d) return 0;
  if (time) {
    const [hh, mm] = String(time).split(':');
    d.setHours(+hh || 0, +mm || 0, 0, 0);
  }
  return d.getTime();
}

function sanitizeDate(s) {
  if (!s) return '';
  if (s instanceof Date) {
    if (s.getFullYear() < 1970) return '';
    return toLocalDateStr(s);
  }
  if (typeof s === 'string') {
    if (s.indexOf('1899-12-30') === 0) return '';
    if (s.length > 10 && s.indexOf('T') === 10) return s.substring(0, 10);
  }
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ APPOINTMENT AVAILABILITY CHECKER
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SLOT_MIN = CONFIG.DEFAULT_SLOT_MIN;

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':');
  return (+h || 0) * 60 + (+m || 0);
}

function intervalsOverlap(a1, a2, b1, b2) {
  return a1 < b2 && b1 < a2;
}

function appointmentsOnDate(appointments, date, excludeId) {
  if (!date) return [];
  return appointments.filter(a =>
    a.date === date &&
    a.id !== excludeId &&
    a.status !== 'cancelled' &&
    a.status !== 'completed'
  );
}

function checkAvailability(appointments, date, time, service, excludeId) {
  if (!date || !time) {
    return { available: false, conflicts: [], reason: 'incomplete', message: 'Pick date and time' };
  }
  const now = new Date();
  const todayStr = toLocalDateStr(now);
  if (date < todayStr) {
    return { available: false, conflicts: [], reason: 'past', message: '⏱ Date is in the past' };
  }
  if (date === todayStr) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const slotMin = timeToMinutes(time);
    if (slotMin <= nowMin) {
      return { available: false, conflicts: [], reason: 'past', message: '⏱ Time has already passed today' };
    }
  }
  const d = parseLocalDate(date);
  if (d && d.getDay() === 0) {
    return { available: false, conflicts: [], reason: 'closed', message: '🏥 Clinic closed on Sundays' };
  }
  const duration = SERVICE_DURATIONS[service] || DEFAULT_SLOT_MIN;
  const start = timeToMinutes(time);
  const end = start + duration;
  const onDate = appointmentsOnDate(appointments, date, excludeId);
  const conflicts = onDate.filter(a => {
    const aStart = timeToMinutes(a.time);
    const aEnd = aStart + (SERVICE_DURATIONS[a.service] || DEFAULT_SLOT_MIN);
    return intervalsOverlap(start, end, aStart, aEnd);
  });
  if (conflicts.length > 0) {
    const c = conflicts[0];
    return {
      available: false,
      conflicts: conflicts,
      reason: conflicts[0].time === time ? 'booked' : 'overlapping',
      message: conflicts[0].time === time
        ? '❌ Already booked: ' + c.patientName + ' (' + svcStr(c) + ')'
        : '⚠ Overlaps with ' + c.patientName + ' at ' + fmtTime(c.time) + ' (' + svcStr(c) + ', needs ' + (SERVICE_DURATIONS[c.service]||DEFAULT_SLOT_MIN) + ' min)'
    };
  }
  return { available: true, conflicts: [], reason: '', message: '✅ Available' };
}

function slotStatusForDate(appointments, date, service, excludeId) {
  const result = {};
  TIMES.forEach(t => {
    const check = checkAvailability(appointments, date, t, service, excludeId);
    if (check.available) {
      result[t] = { status: 'available', label: 'Available' };
    } else {
      const map = { past:'past', closed:'closed', booked:'booked', overlapping:'overlap', incomplete:'available' };
      result[t] = { status: map[check.reason] || 'unavailable', label: check.message, conflicts: check.conflicts };
    }
  });
  return result;
}

function TimeSlotGrid({appointments, selectedDate, selectedService, selectedTime, onTimeChange, excludeId}) {
  const statuses = selectedDate
    ? slotStatusForDate(appointments, selectedDate, selectedService, excludeId)
    : {};
  return h('div', {className: 'tsg'},
    TIMES.map(t => {
      const slot = statuses[t] || { status: 'available' };
      const isSelected = selectedTime === t;
      const disabled = ['booked','past','closed','overlap','unavailable'].includes(slot.status);
      return h('button', {
        key: t, type: 'button',
        className: 'tsl tsl-' + slot.status + (isSelected ? ' sel' : ''),
        onClick: () => onTimeChange(t),
        disabled: disabled && !isSelected,
        title: slot.label || ''
      },
        h('div', {style: {fontSize: 13, fontWeight: isSelected ? 700 : 500}}, fmtTime(t)),
        slot.status === 'booked' && h('div', {className: 'tsl-mark'}, '🔒 Booked'),
        slot.status === 'overlap' && h('div', {className: 'tsl-mark'}, '⚠ Overlap'),
        slot.status === 'past' && h('div', {className: 'tsl-mark'}, '⏱ Past'),
        slot.status === 'closed' && h('div', {className: 'tsl-mark'}, '🏥 Closed'),
        slot.status === 'available' && !isSelected && h('div', {className: 'tsl-mark tsl-ok'}, '✓ Open')
      );
    })
  );
}

function AvailabilityBanner({appointments, date, time, service, excludeId}) {
  if (!date || !time) {
    return h('div', {className: 'avail-banner avail-info'},
      h('span', null, '📅 Pick a date and time to check availability')
    );
  }
  const check = checkAvailability(appointments, date, time, service, excludeId);
  const cls = check.available ? 'avail-ok' : check.reason === 'past' || check.reason === 'closed' ? 'avail-warn' : 'avail-error';
  const duration = SERVICE_DURATIONS[service] || DEFAULT_SLOT_MIN;
  return h('div', {className: 'avail-banner ' + cls},
    h('div', {style: {fontWeight: 600, fontSize: 13}}, check.message),
    check.available && h('div', {style: {fontSize: 11.5, color: 'var(--md)', marginTop: 3}},
      fmtDateFull(date) + ' · ' + fmtTime(time) + ' · ' + duration + ' min slot'
    ),
    check.conflicts && check.conflicts.length > 1 && h('div', {style: {fontSize: 11, marginTop: 4, color: 'var(--md)'}},
      '+ ' + (check.conflicts.length - 1) + ' more conflict(s) on this day'
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 APPOINTMENT AUTOMATION & CONFLICT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function autoConfirmEnabled() {
  try { return localStorage.getItem(LS_KEYS.AUTO_CONFIRM) === 'true'; }
  catch (e) { return false; }
}

function analyzeAppointmentConflicts(appointments) {
  const active = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed' && a.date && a.time);
  const conflicts = [];
  const nearMisses = [];
  const byDate = {};
  active.forEach(a => {
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  });
  for (const date in byDate) {
    const dayAppts = byDate[date];
    for (let i = 0; i < dayAppts.length; i++) {
      for (let j = i + 1; j < dayAppts.length; j++) {
        const a = dayAppts[i];
        const b = dayAppts[j];
        const aStart = timeToMinutes(a.time);
        const aEnd = aStart + (SERVICE_DURATIONS[a.service] || DEFAULT_SLOT_MIN);
        const bStart = timeToMinutes(b.time);
        const bEnd = bStart + (SERVICE_DURATIONS[b.service] || DEFAULT_SLOT_MIN);
        if (intervalsOverlap(aStart, aEnd, bStart, bEnd)) {
          conflicts.push({ a, b, date });
        } else {
          const gap = Math.min(Math.abs(aEnd - bStart), Math.abs(bEnd - aStart));
          if (gap < 15) {
            nearMisses.push({ a, b, date, gap });
          }
        }
      }
    }
  }
  const pending = active.filter(a => a.status === 'pending').length;
  const confirmed = active.filter(a => a.status === 'confirmed').length;
  const arrived = active.filter(a => a.arrived).length;
  return { conflicts, nearMisses, pending, confirmed, arrived, totalActive: active.length };
}

function runAutoConfirm(appointments) {
  if (!autoConfirmEnabled()) return [];
  const pending = appointments.filter(a => a.status === 'pending' && a.date && a.time);
  const confirmedIds = [];
  for (const a of pending) {
    const check = checkAvailability(appointments, a.date, a.time, a.service, a.id);
    if (check.available) {
      confirmedIds.push(a.id);
    }
  }
  return confirmedIds;
}


// ═══════════════════════════════════════════════════════════════════════════
