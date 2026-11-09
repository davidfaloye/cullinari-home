// Adds working days (Mon–Fri) to a date. Public holidays are not excluded;
// add them to HOLIDAYS (YYYY-MM-DD, Africa/Lagos) if you want them skipped.
const HOLIDAYS = new Set([]);

function isWorkingDay(d) {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  return !HOLIDAYS.has(d.toISOString().slice(0, 10));
}

export function addBusinessDays(from, days) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d)) added += 1;
  }
  return d;
}

// Delivery window promised after payment: 2 to 5 business days.
export function deliveryWindow(paidAt = new Date()) {
  return { etaStart: addBusinessDays(paidAt, 2), etaEnd: addBusinessDays(paidAt, 5) };
}
