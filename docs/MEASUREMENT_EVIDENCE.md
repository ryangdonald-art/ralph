# Measurement evidence contract

Upgrade date: 13 October 2026. This is an intentional tightening of the former presence-only gate.

All 15 required metrics now require an object with `value`, `unit` and a nonblank `source` pointing to the underlying measurement record, supplier document, drawing or test. Bare numbers, strings such as `measured`, empty objects and arrays no longer pass. Existing records must be migrated from their actual source evidence; do not fill missing measurements with invented values.

```json
{
  "external_dimensions": {
    "value": { "width": 2400, "depth": 1500, "height": 2300 },
    "unit": "mm",
    "source": "drawing/DRM-MICRO/revision-3"
  },
  "power_load": {
    "value": 3.5,
    "unit": "kW",
    "source": "supplier-load-schedule/revision-2"
  },
  "service_access": {
    "value": "Rear removable panel, with supply isolation before opening.",
    "unit": "description",
    "source": "service-manual/revision-1/section-4"
  }
}
```

This example is illustrative, not a complete proposal or measured DRM specification.

| Metric | Value | Allowed units |
|---|---|---|
| external_dimensions | Positive finite width, depth, height | mm, cm, m |
| operator_clearances, reach_zones, service_clearances | Positive finite measured distance | mm, cm, m |
| storage_capacity | Positive finite capacity | L, m3 |
| tray_capacity | Positive safe integer count | trays |
| holding_capacity | Positive finite capacity; counts must be safe integers | items, trays, L |
| transactions_per_hour | Positive finite throughput | transactions/hour |
| power_load | Positive finite load | W, kW |
| cleaning_time, assembly_time | Positive finite duration | minutes, hours |
| service_access | Nonblank description | description |
| transport_volume | Positive finite volume | m3 |
| capex, bom_cost | Positive finite cost | ZAR, USD, GBP, EUR, AED |

The gate retains `passed` and `missing`, and adds `invalid: [{metric, reasons}]`. Null or absent fields are missing; malformed present fields are invalid. Both block readiness. Zero is deliberately insufficient for these required measurements; a legitimately inapplicable metric needs a future explicitly reviewed exception policy, not a silent zero bypass.

Passing means only structurally adequate input for specialist review. The gate cannot authenticate a cited source, judge safe clearances, verify cost completeness or certify a design. Reviewers must inspect the source and test physical and economic plausibility. A nonblank description alone does not establish safe service access. Review status remains `READY_FOR_SPECIALIST_REVIEW`; human approval and execution controls are unchanged.

## Cash date and liquidity clarification

Available liquidity equals supplied cleared bank cash. Unpaid invoices remain receivables regardless of their due date. Paid receipts must already be reflected in that bank balance; they are not added again.

`asOf` and receipt `dueDate` accept ISO `YYYY-MM-DD` or timezone-qualified timestamps with seconds. Classification uses UTC calendar days consistently. Same-day receipts remain due even after midnight. Invalid `asOf` is rejected; invalid or absent due dates remain in the unknown-date total. Date strings without a timezone (except date-only strings), rollover calendar dates, locale dates and numeric epoch values are not accepted.
