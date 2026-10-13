function money(value, field) {
  if (value == null) return 0;
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number`);
  return value;
}

function uniqueById(items, label) {
  const seen = new Map();
  return (items || []).filter(item => {
    if (!item || !item.id) throw new Error(`${label} item requires id`);
    if (seen.has(item.id)) {
      const previous = seen.get(item.id);
      // Financial fields always matter. Compare additional scalar fields as well
      // so conflicting currency, dates or classifications cannot be hidden by order.
      const scalar = value => value === null || typeof value !== 'object';
      const fields = new Set(['amount', 'status', 'dueDate', 'currency', ...Object.keys(previous), ...Object.keys(item)]);
      const conflicts = [...fields].filter(field =>
        (['amount', 'status', 'dueDate', 'currency'].includes(field) || scalar(previous[field]) || scalar(item[field])) &&
        !Object.is(previous[field], item[field]));
      if (conflicts.length) throw new Error(`${label} has conflicting duplicate id (${conflicts.join(', ')})`);
      return false;
    }
    seen.set(item.id, item);
    return true;
  });
}

// Date-only values are UTC calendar dates; timestamps must include a timezone.
// Reject rollover dates (e.g. February 30) instead of silently changing the day.
function utcDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return null;
  const datePart = value.slice(0, 10);
  const calendar = new Date(`${datePart}T00:00:00Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== datePart) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function classifyReceipts(receipts, asOf) {
  const today = utcDay(asOf);
  if (today === null) throw new Error('asOf must be a valid ISO date or timezone-qualified timestamp');
  const result = { expected:0, due:0, overdue:0, unknownDate:0 };
  for (const r of uniqueById(receipts, 'receipt')) {
    const amount = money(r.amount, 'receipt amount');
    if (r.status === 'PAID') continue;
    result.expected += amount;
    if (!r.dueDate) { result.unknownDate += amount; continue; }
    const due = utcDay(r.dueDate);
    if (due === null) { result.unknownDate += amount; continue; }
    if (due < today) result.overdue += amount;
    else if (due === today) result.due += amount;
  }
  return result;
}

function sumUnique(items, label) {
  return uniqueById(items, label).reduce((sum, item) => sum + money(item.amount, `${label} amount`), 0);
}

function classifyProductionRequirements(items) {
  let committed = 0;
  let forecast = 0;
  let unknown = 0;
  for (const item of uniqueById(items, 'production requirement')) {
    const amount = money(item.amount, 'production requirement amount');
    if (item.status === 'COMMITTED') committed += amount;
    else if (item.status === 'FORECAST') forecast += amount;
    else unknown += amount;
  }
  return { committed, forecast, unknown, total: committed + forecast + unknown };
}

function detectCashFlowDanger(input, config={}) {
  const threshold = money(config.materialityThreshold, 'materialityThreshold');
  const cashInBank = money(input.cashInBank, 'cashInBank');
  const receipts = classifyReceipts(input.receipts || [], input.asOf);
  const committedPayments = sumUnique(input.committedPayments || [], 'committed payment');
  const forecastPayments = sumUnique(input.forecastPayments || [], 'forecast payment');
  const production = classifyProductionRequirements(input.productionRequirements || []);

  // An invoice is not cleared cash, even when due today. Paid receipts are already
  // reflected in the supplied bank balance and must not be added a second time.
  const availableLiquidity = cashInBank;
  // Only explicitly committed production requirements enter the immediate liquidity requirement.
  const committedRequirement = committedPayments + production.committed;
  const gap = Math.max(0, committedRequirement - availableLiquidity);
  const material = gap > threshold;

  return {
    metrics: {
      cashInBank,
      expectedReceipts: receipts.expected,
      receiptsDue: receipts.due,
      receiptsOverdue: receipts.overdue,
      receiptsUnknownDate: receipts.unknownDate,
      committedPayments,
      forecastPayments,
      productionRequirements: production.total,
      committedProductionRequirements: production.committed,
      forecastProductionRequirements: production.forecast,
      unknownProductionRequirements: production.unknown,
      availableLiquidity,
      committedRequirement,
      liquidityGap: gap
    },
    signal: material ? { type:'CASH_FLOW_DANGER', severity: gap > Math.max(threshold * 2, threshold) ? 'HIGH' : 'MATERIAL', exposure:gap, currency:input.currency || 'ZAR', evidenceState:'CALCULATED' } : null
  };
}

module.exports = { classifyReceipts, classifyProductionRequirements, detectCashFlowDanger };
