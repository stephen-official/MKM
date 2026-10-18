import { formatCount, formatMoney, formatPct, formatQty, plural } from "./format.js";

const rangeText = (meta) => `${meta.from} to ${meta.to}`;

const line = (label, value, format = "money", extra = {}) => ({ label, value, format, ...extra });

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const pctText = (n) => (isNum(n) ? `${n.toFixed(1)}%` : "—");
const shareOf = (part, whole) => (isNum(part) && isNum(whole) && whole !== 0 ? (part / whole) * 100 : null);
const per = (value, n) => (isNum(value) && n ? value / n : null);
const sumOf = (rows, key = "count") => rows.reduce((total, row) => total + (row[key] || 0), 0);
const countText = (n, one, many) => `${formatCount(n)} ${plural(n, one, many)}`;
const statusText = (status) => status.replace(/_/g, " ");
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const sectionData = (report, name) => (report.sections?.[name]?.status === "ok" ? report.sections[name].data : null);
const periodDays = (meta, points) => meta.days || points?.length || 0;
const unvaluedNote = (n) => (n ? `${countText(n, "unvalued line", "unvalued lines")} excluded` : undefined);

const generatedText = (meta) => {
  const at = new Date(meta.generatedAt);
  if (!meta.generatedAt || Number.isNaN(at.getTime())) return "the time the report was generated";
  try {
    return at.toLocaleString("en-IN", { timeZone: meta.timezone, dateStyle: "medium", timeStyle: "short" });
  } catch {
    return at.toISOString();
  }
};

/** "(₹120 − ₹100) ÷ |₹100| × 100 = +20.0%", or why no percentage exists. */
const changeFormula = (current, previous, deltaPct) => (deltaPct === null || deltaPct === undefined
  ? `No percentage change: the previous period recorded no value (${formatMoney(previous)}), so there is nothing to divide by.`
  : `Change = (${formatMoney(current)} − ${formatMoney(previous)}) ÷ |${formatMoney(previous)}| × 100 = ${formatPct(deltaPct)}.`);

// --- Daily consumption helpers, shared by the trend, kitchen and KPI explanations ---

const activeDays = (points) => points.filter((point) => point.value !== 0 || point.unvaluedLines > 0);

const dailyPattern = (points, total, meta) => {
  const active = activeDays(points);
  const valued = active.filter((point) => point.value !== 0);
  const highest = valued.reduce((best, point) => (!best || point.value > best.value ? point : best), null);
  const lowest = valued.reduce((best, point) => (!best || point.value < best.value ? point : best), null);
  const days = periodDays(meta, points);
  return {
    heading: "Daily pattern",
    lines: [
      line("Days in the period", days, "count"),
      line("Days with recorded consumption", active.length, "count", { note: `${countText(days - active.length, "day", "days")} with nothing recorded` }),
      line("Average per calendar day", per(total, days), "money", { note: "Period total ÷ every day in the period" }),
      line("Average per active day", per(total, active.length), "money", { note: "Period total ÷ days with recorded consumption" }),
      ...(highest ? [line("Highest day", highest.value, "money", { note: highest.date })] : []),
      ...(lowest && lowest !== highest ? [line("Lowest day with a value", lowest.value, "money", { note: lowest.date })] : []),
    ],
    formula: `Average per calendar day = ${formatMoney(total)} ÷ ${countText(days, "day", "days")} = ${formatMoney(per(total, days))}.`,
  };
};

const dailyWorking = (points, total) => {
  const active = activeDays(points);
  const skipped = points.length - active.length;
  return {
    heading: "Daily working",
    text: skipped > 0 ? `${countText(skipped, "day", "days")} with no recorded consumption ${plural(skipped, "is", "are")} left out below; they add nothing to the total.` : undefined,
    lines: [
      ...active.map((point) => line(point.date, point.value, "money", { op: "+", note: unvaluedNote(point.unvaluedLines) })),
      line("Period total", total, "money", { op: "=", total: true }),
    ],
    formula: "Period total = Σ daily valued consumption. Returns reduce the value on the day they are recorded, so a day can be negative.",
  };
};

// --- Status meanings, used when a single status row is selected ---

const STATUS_KINDS = {
  indents: {
    record: ["indent", "indents"],
    title: "Indents",
    basis: "Purchase indents raised in the period, grouped by their status now.",
    valueLabel: "Recorded indent value",
    valueBasis: "the total recorded on each indent when it was raised",
    meanings: {
      pending: "Raised and waiting to be purchased.",
      purchased: "Marked as purchased by an admin. No purchase order has been recorded against it yet.",
      stock_received: "A purchase order has been recorded against the indent, so the goods have reached the store.",
    },
  },
  supply: {
    record: ["supply request", "supply requests"],
    title: "Supply requests",
    basis: "Kitchen supply requests raised in the period, grouped by their status now.",
    meanings: {
      pending: "Raised by the kitchen and waiting for an admin to review it.",
      confirmed: "Reviewed by an admin: each item was approved or rejected, and the approved items are ready for the kitchen to receive.",
      partially_received: "The kitchen has recorded receipt of some, but not all, of the approved quantities.",
      received: "The kitchen has recorded receipt of every approved quantity.",
      rejected: "Rejected in full by an admin (only possible before delivery starts). Nothing will be delivered.",
    },
  },
  requests: {
    record: ["request", "requests"],
    title: "Requests",
    basis: "Kitchen usage requests raised in the period, grouped by their status now.",
    meanings: {
      pending: "Waiting for an admin decision. No stock has moved yet.",
      approved: "Approved by an admin. On approval the kitchen’s stock was reduced and a usage record was written.",
      rejected: "Rejected by an admin. No stock moved.",
    },
  },
  transfers: {
    record: ["transfer", "transfers"],
    title: "Transfers",
    basis: "Kitchen-to-kitchen transfers raised in the period where the kitchen scope is the sender or the receiver, grouped by their status now.",
    meanings: {
      pending: "Sent and waiting for the receiving kitchen to accept it. No stock has moved yet.",
      accepted: "Accepted by the receiving kitchen. The stock was taken from the sender and added to the receiver at that moment.",
      rejected: "Declined by the receiving kitchen. No stock moved.",
    },
  },
};

const OTHER_MEANING = "Records whose status is outside the standard workflow. They are grouped here so that no record is dropped from the totals.";

export function statusWorking(kind, row, rows, meta) {
  const spec = STATUS_KINDS[kind];
  const [one, many] = spec.record;
  const total = sumOf(rows);
  const share = shareOf(row.count, total);
  const label = capitalise(statusText(row.status));
  const sections = [{
    heading: "What this status means",
    text: spec.meanings[row.status] || OTHER_MEANING,
    lines: [
      line(`${label} ${many}`, row.count, "count", { total: true }),
      line(`All ${many} raised in the period`, total, "count"),
      line("Share of the period’s " + many, share, "share"),
    ],
    formula: total === 0
      ? `No ${many} were raised in the selected period, so there is no share to calculate.`
      : `Share = ${formatCount(row.count)} ÷ ${formatCount(total)} × 100 = ${pctText(share)}.`,
  }];

  if (row.value !== undefined) {
    const totalValue = sumOf(rows, "value");
    sections.push({
      heading: "Value",
      lines: [
        line(spec.valueLabel, row.value, "money", { total: true }),
        line(`Average per ${one}`, per(row.value, row.count)),
        line(`Share of all ${many}’ value`, shareOf(row.value, totalValue), "share", { note: `${formatMoney(totalValue)} across every status` }),
      ],
      formula: row.count === 0
        ? `No ${label.toLowerCase()} ${many}, so no average applies.`
        : `Value = Σ ${spec.valueBasis}. Average = ${formatMoney(row.value)} ÷ ${formatCount(row.count)} = ${formatMoney(per(row.value, row.count))}.`,
    });
  }

  sections.push({
    heading: `All statuses for ${many} raised in the period`,
    lines: [
      ...rows.map((entry) => line(capitalise(statusText(entry.status)), entry.count, "count", {
        op: "+",
        selected: entry.status === row.status,
        note: `${pctText(shareOf(entry.count, total))} of ${many}`,
      })),
      line(`All ${many}`, total, "count", { op: "=", total: true }),
    ],
  });

  return {
    title: `${spec.title}: ${statusText(row.status)}`,
    subtitle: `${meta.kitchen.name} · raised ${rangeText(meta)}`,
    intro: spec.basis,
    sections,
    notes: [
      `A ${one} raised in the period counts under its status today, even if that status changed after ${meta.to}.`,
      `${capitalise(many)} raised before ${meta.from} are not counted here, whatever their status.`,
    ],
  };
}

// --- Ageing queues (current snapshots) ---

const AGE_RANGES = {
  lt1d: "less than 1 day (under 24 hours)",
  "1to3d": "at least 1 day but less than 3 days",
  "3to7d": "at least 3 days but less than 7 days",
  gt7d: "7 days or more",
};

const QUEUES = {
  requests: {
    title: "Pending requests",
    record: ["pending request", "pending requests"],
    who: "Kitchen usage requests still waiting for an admin decision",
    waitingFor: "an admin decision",
  },
  transfers: {
    title: "Open transfers",
    record: ["open transfer", "open transfers"],
    who: "Transfers still waiting for the receiving kitchen to accept them, where the kitchen scope is the sender or the receiver",
    waitingFor: "acceptance by the receiving kitchen",
  },
};

export function ageingBucketWorking(queue, bucket, ageing, meta) {
  const spec = QUEUES[queue];
  const [, many] = spec.record;
  const share = shareOf(bucket.count, ageing.total);
  const range = AGE_RANGES[bucket.id] || bucket.label.toLowerCase();
  return {
    title: `${spec.title}: ${bucket.label.toLowerCase()}`,
    subtitle: `Current snapshot · ${meta.kitchen.name} · as of ${generatedText(meta)}`,
    intro: `${spec.who}, counted by how long each has been waiting. This bucket holds those that have waited ${range}.`,
    sections: [
      {
        heading: "This waiting-time bucket",
        lines: [
          line(`${capitalise(many)} waiting ${bucket.label.toLowerCase()}`, bucket.count, "count", { total: true }),
          line(`All ${many} now`, ageing.total, "count"),
          line("Share of the queue", share, "share"),
          line("Oldest in the whole queue", ageing.oldestAgeDays, "days"),
        ],
        formula: ageing.total === 0
          ? `Nothing is waiting for ${spec.waitingFor} right now.`
          : `Age = report time − time created. Share = ${formatCount(bucket.count)} ÷ ${formatCount(ageing.total)} × 100 = ${pctText(share)}.`,
      },
      {
        heading: "Whole queue by waiting time",
        lines: [
          ...ageing.buckets.map((entry) => line(entry.label, entry.count, "count", {
            op: "+",
            selected: entry.id === bucket.id,
            note: `Waited ${AGE_RANGES[entry.id] || entry.label.toLowerCase()} · ${pctText(shareOf(entry.count, ageing.total))}`,
          })),
          line(`All ${many}`, ageing.total, "count", { op: "=", total: true }),
        ],
      },
    ],
    notes: [
      `This is the queue at ${generatedText(meta)}, not limited to the selected dates. Anything still waiting is included, however long ago it was raised.`,
      "Ages are measured in exact elapsed time, so “1 to 3 days” means 24 hours or more but under 72 hours.",
    ],
  };
}

export function approvalRateWorking(data, meta) {
  const rows = data.requests.byStatus;
  const count = (status) => rows.find((row) => row.status === status)?.count || 0;
  const approved = count("approved");
  const rejected = count("rejected");
  const decided = approved + rejected;
  const undecided = sumOf(rows) - decided;
  return {
    title: "Approval rate",
    subtitle: `${meta.kitchen.name} · requests raised ${rangeText(meta)}`,
    intro: "Of the requests raised in the period that an admin has already decided, the share that were approved. Requests still waiting are left out so they do not drag the rate down.",
    sections: [{
      heading: "Working",
      lines: [
        line("Approved", approved, "count", { op: "+" }),
        line("Rejected", rejected, "count", { op: "+" }),
        line("Decided requests", decided, "count", { op: "=" }),
        line("Not yet decided (excluded)", undecided, "count", { note: "Pending, plus any outside the standard statuses" }),
        line("Approval rate", data.requests.approvalRate, "share", { total: true }),
        line("Rejection rate", decided ? 100 - data.requests.approvalRate : null, "share"),
      ],
      formula: decided === 0
        ? "No request raised in the period has been decided yet, so there is no rate to show."
        : `Approval rate = ${formatCount(approved)} ÷ (${formatCount(approved)} + ${formatCount(rejected)}) × 100 = ${pctText(data.requests.approvalRate)}.`,
    }],
    notes: [`Requests decided in the period but raised before ${meta.from} are not part of this rate.`],
  };
}

// --- Procurement facts ---

const procurementFactWorking = (fact, data, meta) => {
  const { stockReceived, spend, awaiting } = data;
  const scopeText = data.scope === "all" ? "all kitchens" : meta.kitchen.name;
  const perDistribution = per(stockReceived.value, stockReceived.distributionCount);
  const unpricedNote = stockReceived.unpricedAllocationCount
    ? `${countText(stockReceived.unpricedAllocationCount, "allocation has", "allocations have")} no valid unit price and ${plural(stockReceived.unpricedAllocationCount, "is", "are")} left out of the value.`
    : "Every allocation in the period had a valid unit price.";

  if (fact === "stockReceived") return {
    title: "Stock received value",
    subtitle: `${meta.kitchen.name} · distributed ${rangeText(meta)}`,
    intro: `The value of stock sent from the store to ${scopeText} through distributions in the selected period.`,
    sections: [{
      heading: "Working",
      lines: [
        line("Distributions in the period", stockReceived.distributionCount, "count"),
        line("Stock received value", stockReceived.value, "money", { total: true }),
        line("Average per distribution", perDistribution),
        line("Unpriced allocations excluded", stockReceived.unpricedAllocationCount || 0, "count"),
      ],
      formula: `Stock received value = Σ (allocation quantity × allocation unit price) = ${formatMoney(stockReceived.value)}. Average = ${formatMoney(stockReceived.value)} ÷ ${formatCount(stockReceived.distributionCount)} = ${formatMoney(perDistribution)}.`,
    }],
    notes: [
      unpricedNote,
      data.scope === "all" ? "Only allocations to kitchens are counted." : `Only the allocations sent to ${meta.kitchen.name} are counted, even when a distribution also served other kitchens.`,
      "Leftover redistributions count once, as their own movements.",
    ],
  };

  if (fact === "distributions") return {
    title: "Distributions",
    subtitle: `${meta.kitchen.name} · ${rangeText(meta)}`,
    intro: `How many separate distributions sent stock to ${scopeText} in the selected period.`,
    sections: [{
      heading: "Working",
      lines: [
        line("Distributions", stockReceived.distributionCount, "count", { total: true }),
        line("Stock received through them", stockReceived.value),
        line("Average value per distribution", perDistribution),
      ],
      formula: `A distribution counts once when at least one of its allocations to ${scopeText} has a quantity above zero, however many items it carried.`,
    }],
    notes: ["A leftover redistribution is a distribution of its own and counts separately from the original.", unpricedNote],
  };

  if (fact === "spend") {
    const days = spend.daily.filter((day) => day.value !== 0);
    const highest = days.reduce((best, day) => (!best || day.value > best.value ? day : best), null);
    return {
      title: "Procurement spend",
      subtitle: `All kitchens · received ${rangeText(meta)}`,
      intro: "The value of purchase orders received into the store during the selected period.",
      sections: [
        {
          heading: "Working",
          lines: [
            line("Purchase orders received", spend.poCount, "count"),
            line("Procurement spend", spend.value, "money", { total: true }),
            line("Average per purchase order", per(spend.value, spend.poCount)),
            line("Days with a receipt", days.length, "count", { note: `of ${countText(spend.daily.length, "day", "days")} in the period` }),
            ...(highest ? [line("Highest receiving day", highest.value, "money", { note: highest.date })] : []),
          ],
          formula: `Purchase-order total = Σ (received quantity, or ordered quantity when none was recorded, × unit price). Spend = Σ totals = ${formatMoney(spend.value)}; average = ${formatMoney(spend.value)} ÷ ${formatCount(spend.poCount)} = ${formatMoney(per(spend.value, spend.poCount))}.`,
        },
        ...(days.length ? [{
          heading: "Received by day",
          lines: [
            ...days.map((day) => line(day.date, day.value, "money", { op: "+" })),
            line("Procurement spend", spend.value, "money", { op: "=", total: true }),
          ],
        }] : []),
      ],
      notes: ["A purchase order counts on its received date, not the date its indent was raised.", "Organisation-wide figure: purchase orders are not split by kitchen."],
    };
  }

  if (fact === "awaiting") return {
    title: "Awaiting distribution",
    subtitle: `All kitchens · current snapshot as of ${generatedText(meta)}`,
    intro: "Purchase orders that have been received into the store but not yet distributed to kitchens.",
    sections: [{
      heading: "Working",
      lines: [
        line("Purchase orders awaiting distribution", awaiting.count, "count", { total: true }),
        line("Value awaiting distribution", awaiting.value),
        line("Average per purchase order", per(awaiting.value, awaiting.count)),
      ],
      formula: `Count purchase orders whose status is still pending distribution. Value = Σ their recorded totals = ${formatMoney(awaiting.value)}.`,
    }],
    notes: ["This is the position now, whenever the orders were received; it is not limited to the selected dates."],
  };

  return null;
};

/** One explanation per clickable element in the Procurement section. */
export function procurementDetailWorking(target, data, meta) {
  if (target?.fact) return procurementFactWorking(target.fact, data, meta);
  if (target?.status === "indents") return statusWorking("indents", target.row, data.indents, meta);
  if (target?.status === "supply") return statusWorking("supply", target.row, data.supplyRequests, meta);
  return procurementWorking(data, meta);
}

/** One explanation per clickable element in the Requests and transfers section. */
export function flowDetailWorking(target, data, meta) {
  if (target?.approvalRate) return approvalRateWorking(data, meta);
  if (target?.status === "requests") return statusWorking("requests", target.row, data.requests.byStatus, meta);
  if (target?.status === "transfers") return statusWorking("transfers", target.row, data.transfers.byStatus, meta);
  if (target?.queue === "requests") return ageingBucketWorking("requests", target.bucket, data.requests.pendingAgeing, meta);
  if (target?.queue === "transfers") return ageingBucketWorking("transfers", target.bucket, data.transfers.openAgeing, meta);
  return flowWorking(data, meta);
}

// --- Section-level and KPI explanations ---

export function reportingBasisWorking(report) {
  return {
    title: "Reporting basis",
    subtitle: `${report.meta.kitchen.name} · ${rangeText(report.meta)}`,
    intro: "The report mixes period activity with clearly labelled current snapshots. This explains which date basis applies before you interpret the figures.",
    sections: [{
      heading: "Scope",
      lines: [
        line("Kitchen", report.meta.kitchen.name, "text"),
        line("Period", rangeText(report.meta), "text", { note: countText(periodDays(report.meta), "day", "days") + ", inclusive" }),
        line("Previous comparison period", `${report.meta.previous.from} to ${report.meta.previous.to}`, "text", { note: "Same length, immediately before the period" }),
        line("Business timezone", report.meta.timezone, "text"),
        line("Snapshot figures taken at", generatedText(report.meta), "text"),
      ],
    }, {
      heading: "Which figures use which basis",
      lines: [
        line("Period activity", "Selected dates", "text", { note: "Consumption, daily-use issues, stock received, procurement spend, and statuses of requests, indents and transfers raised in the period" }),
        line("Current snapshot", "Report time", "text", { note: "Stock value, low and out-of-stock items, pending requests, open transfers and POs awaiting distribution" }),
      ],
    }],
    notes: [report.meta.notes.historicalStock, report.meta.notes.unvaluedConsumption, "Values marked Estimated use the latest valid price available under the report’s pricing rules."],
  };
}

const stockRowsSection = (heading, rows, total, withThreshold) => (rows.length ? {
  heading,
  lines: rows.map((row) => line(`${row.item} · ${row.kitchen}`, row.qty, "qty", {
    note: withThreshold && row.threshold
      ? `${row.unit} on hand · threshold ${formatQty(row.threshold)} ${row.unit}${isNum(row.ratio) ? ` · ${pctText(row.ratio * 100)} of threshold` : ""}`
      : row.unit || undefined,
  })),
  text: total > rows.length ? `Showing the first ${rows.length} of ${formatCount(total)}.` : undefined,
} : null);

const ageingSection = (ageing) => ({
  heading: "How long they have waited",
  lines: [
    ...ageing.buckets.map((bucket) => line(bucket.label, bucket.count, "count", { op: "+", note: pctText(shareOf(bucket.count, ageing.total)) })),
    line("Waiting now", ageing.total, "count", { op: "=", total: true }),
  ],
});

export function kpiWorking(kpi, report) {
  const d = kpi.details || {};
  const { meta } = report;
  const definition = meta.definitions.find((item) => item.id === kpi.id)?.text;
  const days = periodDays(meta);
  const trend = sectionData(report, "consumptionTrend");
  const health = sectionData(report, "stockHealth");
  const unpriced = sectionData(report, "unpricedStock");
  const flow = sectionData(report, "requestsTransfers");
  const procurement = sectionData(report, "procurement");
  const base = {
    title: kpi.label,
    subtitle: `${kpi.kind === "snapshot" ? `Current snapshot as of ${generatedText(meta)}` : `Activity from ${rangeText(meta)}`} · ${meta.kitchen.name}`,
    notes: definition ? [definition] : [],
  };

  const specs = {
    stockValue: () => [{
      heading: "Working",
      lines: [
        line("Estimated stock value", kpi.value, "money", { total: true }),
        line("Items without a valid price", d.unpricedItemCount || 0, "count"),
        line("Unpriced quantity excluded", d.unpricedQty || 0, "qty", { note: "Base units, summed across items" }),
      ],
      formula: "For every stocked item: current quantity × latest valid kitchen distribution price; if unavailable, latest purchase-order price. Unpriced items are excluded.",
    }, unpriced && stockRowsSection("Items left out because they have no price", unpriced.rows.slice(0, 8), unpriced.total, false)],
    lowStock: () => [{
      heading: "Working",
      lines: [line("Items currently below threshold", kpi.value, "count", { total: true })],
      formula: "Count items with a threshold set, quantity above zero, and quantity at or below the threshold. % of threshold = quantity ÷ threshold × 100.",
    }, health && stockRowsSection("Closest to running out", health.rows.filter((row) => row.state === "low").slice(0, 8), health.lowCount, true)],
    outOfStock: () => [{
      heading: "Working",
      lines: [line("Items currently out of stock", kpi.value, "count", { total: true })],
      formula: "Count kitchen stock items whose current quantity is zero or less.",
    }, health && stockRowsSection("Items at zero or below", health.rows.filter((row) => row.state === "out").slice(0, 8), health.outCount, true)],
    consumptionValue: () => [{
      heading: "Against the previous period",
      lines: [
        line("Previous equal-length period", d.previousValue || 0, "money", { note: `${meta.previous.from} to ${meta.previous.to}` }),
        line("Selected period consumption", kpi.value, "money", { total: true }),
        line("Difference", isNum(kpi.value) ? kpi.value - (d.previousValue || 0) : null, "money"),
        line("Change", d.deltaPct, "percent"),
        line("Unvalued lines excluded", d.unvaluedLineCount || 0, "count", { note: d.unvaluedQty ? `${formatQty(d.unvaluedQty)} base units consumed without a value` : undefined }),
      ],
      formula: `Consumption value = sum of values recorded when stock was issued. ${changeFormula(kpi.value, d.previousValue || 0, d.deltaPct)}`,
    }, trend && dailyPattern(trend.points, trend.total, meta)],
    dailyUseLines: () => [{
      heading: "Working",
      lines: [
        line("Daily-use issue lines", kpi.value, "count", { total: true }),
        line("Days in the period", days, "count"),
        line("Average lines per day", per(kpi.value, days), "qty"),
      ],
      formula: `Count unified usage lines whose product is labelled daily-use. Average = ${formatCount(kpi.value)} ÷ ${countText(days, "day", "days")} = ${formatQty(per(kpi.value, days))}. Priced lines are also included in consumption value.`,
    }],
    pendingRequests: () => [{
      heading: "Working",
      lines: [
        line("Requests waiting now", kpi.value, "count", { total: true }),
        line("Oldest waiting", d.oldestAgeDays, "days"),
      ],
      formula: "Count current kitchen usage requests whose status is pending, whenever they were raised.",
    }, flow && ageingSection(flow.requests.pendingAgeing)],
    pendingSupplyRequests: () => {
      const raisedPending = procurement?.supplyRequests.find((row) => row.status === "pending")?.count;
      return [{
        heading: "Working",
        lines: [
          line("Supply requests waiting now", kpi.value, "count", { total: true }),
          ...(isNum(raisedPending) ? [
            line("…of which raised in the selected period", raisedPending, "count"),
            line("…raised before the period", Math.max(kpi.value - raisedPending, 0), "count"),
          ] : []),
        ],
        formula: "Count current kitchen supply requests whose status is pending, whenever they were raised.",
      }];
    },
    openTransfers: () => [{
      heading: "Working",
      lines: [
        line("Transfers awaiting acceptance", kpi.value, "count", { total: true }),
        line("Oldest waiting", d.oldestAgeDays, "days"),
      ],
      formula: "Count current pending transfers where the selected kitchen scope is either sender or receiver.",
    }, flow && ageingSection(flow.transfers.openAgeing)],
    stockReceivedValue: () => [{
      heading: "Working",
      lines: [
        line("Distributions", d.distributionCount || 0, "count"),
        line("Stock received value", kpi.value, "money", { total: true }),
        line("Average per distribution", per(kpi.value, d.distributionCount)),
        line("Unpriced allocations excluded", d.unpricedAllocationCount || 0, "count"),
      ],
      formula: `Stock received value = Σ allocation quantity × allocation unit price for distributions made in the period. Average = ${formatMoney(kpi.value)} ÷ ${formatCount(d.distributionCount || 0)} = ${formatMoney(per(kpi.value, d.distributionCount))}.`,
    }],
    procurementSpend: () => (procurement?.spend
      ? procurementFactWorking("spend", procurement, meta).sections
      : [{
        heading: "Working",
        lines: [
          line("Purchase orders received", d.poCount || 0, "count"),
          line("Procurement spend", kpi.value, "money", { total: true }),
          line("Average per purchase order", per(kpi.value, d.poCount)),
        ],
        formula: "Procurement spend = Σ received purchase-order total for orders whose received date is in the period.",
      }]),
    poAwaitingDistribution: () => [{
      heading: "Working",
      lines: [
        line("Received POs awaiting distribution", kpi.value, "count", { total: true }),
        line("Value awaiting distribution", d.value || 0),
        line("Average per purchase order", per(d.value || 0, kpi.value)),
      ],
      formula: "Count received purchase orders that are still pending distribution. Their recorded totals provide the value shown.",
    }],
  };

  const sections = (specs[kpi.id]?.() || [{ lines: [line(kpi.label, kpi.value, kpi.format, { total: true })] }]).filter(Boolean);
  return { ...base, sections };
}

export function overallConsumptionWorking(trend, meta) {
  const kitchens = trend.kitchens || [];
  const withConsumption = kitchens.filter((kitchen) => kitchen.total !== 0 || kitchen.unvaluedLines > 0).length;
  return {
    title: "Overall kitchen consumption",
    subtitle: `${rangeText(meta)} · ${countText(kitchens.length, "kitchen", "kitchens")} represented`,
    intro: "Each bar uses the same recorded-at-issue valuation as the consumption KPI. Kitchens are ordered from highest to lowest consumption value. Select a bar for that kitchen’s own working.",
    sections: [{
      heading: "Working",
      lines: [
        ...kitchens.map((kitchen) => line(kitchen.kitchen, kitchen.total, "money", {
          op: "+",
          note: [`${pctText(shareOf(kitchen.total, trend.total))} of all kitchens`, unvaluedNote(kitchen.unvaluedLines) || "All recorded lines valued"].join(" · "),
        })),
        line("All-kitchen consumption", trend.total, "money", { op: "=", total: true }),
      ],
      formula: "All-kitchen consumption = Σ each kitchen’s valued consumption in the selected period. Share = kitchen value ÷ all-kitchen value × 100.",
    }, {
      heading: "Spread",
      lines: [
        line("Kitchens with recorded consumption", withConsumption, "count", { note: `of ${countText(kitchens.length, "kitchen", "kitchens")} shown` }),
        line("Average per kitchen", per(trend.total, kitchens.length)),
        ...(kitchens.length ? [line("Highest kitchen", kitchens[0].total, "money", { note: kitchens[0].kitchen })] : []),
      ],
    }],
    notes: [meta.notes.unvaluedConsumption],
  };
}

export function kitchenConsumptionWorking(kitchen, meta, trend) {
  const kitchens = trend?.kitchens || [];
  const rank = kitchens.findIndex((row) => row.godownId === kitchen.godownId) + 1;
  const share = shareOf(kitchen.total, trend?.total);
  const status = kitchen.deleted
    ? "This kitchen has been deleted; its recorded consumption still counts in the period."
    : !kitchen.active ? "This kitchen is inactive; consumption recorded in the period still counts." : null;
  return {
    title: `${kitchen.kitchen} consumption`,
    subtitle: rangeText(meta),
    intro: "Daily values are based on the consumption’s recorded date, falling back to its business creation date when needed.",
    sections: [
      {
        heading: "Position among kitchens",
        lines: [
          line(`${kitchen.kitchen} consumption`, kitchen.total, "money", { total: true }),
          line("All-kitchen consumption", trend?.total),
          line("Share of all kitchens", share, "share"),
          ...(rank ? [line("Rank by consumption value", `#${rank} of ${kitchens.length}`, "text")] : []),
          line("Unvalued lines excluded", kitchen.unvaluedLines || 0, "count"),
        ],
        formula: `Share = ${formatMoney(kitchen.total)} ÷ ${formatMoney(trend?.total)} × 100 = ${pctText(share)}.`,
      },
      dailyPattern(kitchen.points, kitchen.total, meta),
      dailyWorking(kitchen.points, kitchen.total),
    ],
    notes: [status, meta.notes.unvaluedConsumption].filter(Boolean),
  };
}

export function trendWorking(trend, meta) {
  return {
    title: "Consumption trend",
    subtitle: `${meta.kitchen.name} · ${rangeText(meta)}`,
    sections: [
      {
        heading: "Against the previous period",
        lines: [
          line("Previous period", trend.previousTotal, "money", { note: `${meta.previous.from} to ${meta.previous.to}` }),
          line("Selected period", trend.total, "money", { total: true }),
          line("Difference", trend.total - trend.previousTotal),
          line("Change", trend.deltaPct, "percent"),
        ],
        formula: changeFormula(trend.total, trend.previousTotal, trend.deltaPct),
      },
      dailyPattern(trend.points, trend.total, meta),
      dailyWorking(trend.points, trend.total),
    ],
    notes: [meta.notes.unvaluedConsumption],
  };
}

export function topItemsWorking(data, meta, trend) {
  const listed = sumOf(data.items, "value");
  return {
    title: "Top consumed items",
    subtitle: `${meta.kitchen.name} · ${rangeText(meta)}`,
    intro: "Items are ranked by valued consumption, highest first. Select an item in the report for its own quantity and value working.",
    sections: [{
      heading: "Ranking",
      lines: [
        ...data.items.map((item) => line(`#${item.rank} ${item.name}`, item.value, "money", {
          op: "+",
          note: `${formatQty(item.qty)} ${item.unit}${trend ? ` · ${pctText(shareOf(item.value, trend.total))} of all consumption` : ""}${item.unvaluedLines ? ` · ${countText(item.unvaluedLines, "unvalued line", "unvalued lines")}` : ""}`,
        })),
        line(`Top ${data.items.length} combined`, listed, "money", { op: "=", total: true }),
        ...(trend ? [line("Share of all consumption", shareOf(listed, trend.total), "share", { note: `${formatMoney(trend.total)} in total` })] : []),
      ],
      formula: "Item value = Σ values recorded on that item’s consumption lines in the selected period. Ranking uses this value; ties are broken by quantity, then name.",
    }],
    notes: data.tiedBeyondLimit ? [`${data.tiedBeyondLimit} additional item${data.tiedBeyondLimit === 1 ? " ties" : "s tie"} with #10 and ${plural(data.tiedBeyondLimit, "is", "are")} not shown.`] : [],
  };
}

export function topItemWorking(item, meta, { items = [], trend } = {}) {
  const above = items.find((other) => other.rank === item.rank - 1);
  const listed = sumOf(items, "value");
  const days = periodDays(meta);
  const unitValue = item.unvaluedLines || !item.qty ? null : item.value / item.qty;
  return {
    title: item.name,
    subtitle: `Consumed ${rangeText(meta)} · rank #${item.rank}`,
    sections: [
      {
        heading: "Value and ranking",
        lines: [
          line("Recorded consumption value", item.value, "money", { total: true }),
          ...(trend ? [line("Share of all consumption", shareOf(item.value, trend.total), "share", { note: `${formatMoney(trend.total)} in total` })] : []),
          ...(items.length ? [line(`Share of the top ${items.length}`, shareOf(item.value, listed), "share")] : []),
          ...(above ? [line(`Behind #${above.rank} ${above.name}`, above.value - item.value, "money")] : []),
          line("Unvalued lines excluded", item.unvaluedLines || 0, "count"),
        ],
        formula: "Recorded consumption value = Σ issue-time values for this item. Share = item value ÷ total × 100.",
      },
      {
        heading: "Quantity",
        lines: [
          line("Quantity consumed", item.qty, "qty", { note: item.unit }),
          line("Average per calendar day", per(item.qty, days), "qty", { note: `${item.unit} over ${countText(days, "day", "days")}` }),
          line("Average value per unit", unitValue, "money", {
            note: unitValue === null ? (item.unvaluedLines ? "Not calculated: some quantity has no recorded value" : "Not calculated: no quantity") : `per ${item.unit || "unit"}`,
          }),
        ],
        formula: unitValue === null
          ? "Quantity includes valued and unvalued consumption lines, so value ÷ quantity would understate the unit value."
          : `Average value per unit = ${formatMoney(item.value)} ÷ ${formatQty(item.qty)} ${item.unit} = ${formatMoney(unitValue)}.`,
      },
    ],
    notes: [meta.notes.unvaluedConsumption],
  };
}

export function procurementWorking(data, meta) {
  const sections = [{
    heading: "Stock distributed to kitchens",
    lines: [
      line("Distributions", data.stockReceived.distributionCount, "count"),
      line("Stock received value", data.stockReceived.value, "money", { total: true }),
      line("Unpriced allocations excluded", data.stockReceived.unpricedAllocationCount || 0, "count"),
    ],
    formula: "Stock received value = Σ allocation quantity × allocation unit price for distributions made in the selected period.",
  }];
  if (data.scope === "all") sections.push({
    heading: "Organisation-wide purchasing",
    lines: [
      line("Purchase orders received", data.spend.poCount, "count"),
      line("Procurement spend", data.spend.value, "money", { total: true }),
      line("POs awaiting distribution now", data.awaiting.count, "count"),
      line("Value awaiting distribution now", data.awaiting.value),
    ],
    formula: "Procurement spend = Σ received purchase-order totals whose received date falls in the selected period.",
  });
  return {
    title: "Procurement and stock intake",
    subtitle: `${meta.kitchen.name} · ${rangeText(meta)}`,
    intro: "Select any figure or status row in this section for its own detailed working.",
    sections,
    notes: ["Status tables count records created in the selected period. Awaiting distribution is a current snapshot."],
  };
}

export function flowWorking(data, meta) {
  const { requests, transfers } = data;
  const decided = requests.byStatus.reduce((sum, row) => sum + (["approved", "rejected"].includes(row.status) ? row.count : 0), 0);
  return {
    title: "Requests and transfers",
    subtitle: `${meta.kitchen.name} · ${rangeText(meta)}`,
    intro: "Select any status row, waiting-time bucket or the approval rate for its own detailed working.",
    sections: [
      {
        heading: "Requests created in the period",
        lines: [
          ...requests.byStatus.map((row) => line(row.status, row.count, "count")),
          line("Decided requests", decided, "count"),
          line("Approval rate", requests.approvalRate, "share", { total: true }),
        ],
        formula: "Approval rate = approved ÷ (approved + rejected) × 100. Pending requests are not included in the rate.",
      },
      {
        heading: "Current request queue",
        lines: [
          ...requests.pendingAgeing.buckets.map((row) => line(row.label, row.count, "count")),
          line("Pending now", requests.pendingAgeing.total, "count", { total: true }),
          line("Oldest pending", requests.pendingAgeing.oldestAgeDays, "days"),
        ],
      },
      {
        heading: "Transfers",
        lines: [
          ...transfers.byStatus.map((row) => line(`${row.status} in period`, row.count, "count")),
          line("Open now", transfers.openAgeing.total, "count", { total: true }),
          line("Oldest open", transfers.openAgeing.oldestAgeDays, "days"),
        ],
        formula: "Period statuses count transfers created in the period. Open transfers are the current pending queue where the kitchen is sender or receiver.",
      },
    ],
  };
}

export function comparisonWorking(data, meta) {
  return {
    title: "Kitchen comparison",
    subtitle: rangeText(meta),
    intro: "This table aligns period activity with current operational snapshots so leadership can compare kitchens on one view. Select a row for that kitchen’s own working.",
    sections: [{
      lines: data.rows.map((row) => line(row.kitchen, row.consumptionValue, "money", {
        note: `${row.unvaluedLines} unvalued · ${row.pendingRequests} pending request${row.pendingRequests === 1 ? "" : "s"} · ${formatMoney(row.stockReceivedValue)} stock received`,
      })),
      formula: "Consumption and stock received use the selected period. Low/out-of-stock and pending requests are current snapshots.",
    }],
    notes: ["Only the kitchens on the current comparison page are listed in this popup. Select a kitchen name to open its full report."],
  };
}

export function kitchenComparisonRowWorking(row, meta) {
  const days = periodDays(meta);
  return {
    title: row.kitchen,
    subtitle: `Kitchen comparison · ${rangeText(meta)}`,
    sections: [
      {
        heading: "Period activity",
        lines: [
          line("Consumption value", row.consumptionValue, "money", { total: true, note: "Values recorded when stock was issued" }),
          line("Average consumption per day", per(row.consumptionValue, days), "money", { note: `Over ${countText(days, "day", "days")}` }),
          line("Unvalued consumption lines", row.unvaluedLines, "count", { note: "Issued before prices were captured; not in the value" }),
          line("Stock received value", row.stockReceivedValue, "money", { note: "Allocation quantity × unit price, distributions in the period" }),
          line("Stock received per day", per(row.stockReceivedValue, days)),
        ],
        formula: `Average consumption per day = ${formatMoney(row.consumptionValue)} ÷ ${countText(days, "day", "days")} = ${formatMoney(per(row.consumptionValue, days))}.`,
      },
      {
        heading: "Current position",
        lines: [
          line("Low or out-of-stock items", row.lowOrOutOfStock, "count", {
            note: row.lowOrOutOfStock === null ? "Not calculated for inactive or deleted kitchens" : "At or below threshold, or at zero",
          }),
          line("Pending requests", row.pendingRequests, "count", { note: "Usage requests waiting for a decision" }),
        ],
        formula: `These two figures are current snapshots as of ${generatedText(meta)} and are not limited to the selected dates.`,
      },
    ],
    notes: [row.deleted ? "This kitchen has been deleted, but its historical activity remains in the report." : !row.active ? "This kitchen is inactive; current stock health is not calculated for it." : meta.notes.unvaluedConsumption],
  };
}
