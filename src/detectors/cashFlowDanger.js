function money(value, field) {
  if (value == null) return 0;
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number`);
  return value;
}

function uniqueById(items, label) {
  const seen = new Set();
  return (items || []).filter(item => {
    if (!item || !item.id) throw new Error(`${label} item requires id`);
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function classifyReceipts(receipts, asOf) {
  const today = new Date(asOf);
  if (Number.isNaN(today.getTime())) throw new Error('asOf must be a valid date');
  const result = { expected:0, due:0, overdue:0, unknownDate:0 };
  for (const r of uniqueById(receipts, 'receipt')) {
    const amount = money(r.amount, 'receipt amount');
    if (r.status === 'PAID') continue;
    result.expected += amount;
    if (!r.dueDate) { result.unknownDate += amount; continue; }
    const due = new Date(r.dueDate);
    if (Number.isNaN(due.getTime())) { result.unknownDate += amount; continue; }
    if (due < today) result.overdue += amount;
    else if (due.toDateString() === today.toDateString()) result.due += amount;
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
  const threshold = Number.isFinite(config.materialityThreshold) ? config.materialityThreshold : 0;
  const cashInBank = money(input.cashInBank, 'cashInBank');
  const receipts = classifyReceipts(input.receipts || [], input.asOf);
  const committedPayments = sumUnique(input.committedPayments || [], 'committed payment');
  const forecastPayments = sumUnique(input.forecastPayments || [], 'forecast payment');
  const production = classifyProductionRequirements(input.productionRequirements || []);

  // Bank cash plus receipts due today. Future, overdue and unknown-date receivables remain receivables, not cash.
  const availableLiquidity = cashInBank + receipts.due;
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