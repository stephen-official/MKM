import { describe, expect, it } from "vitest";
import {
  ageingBucketWorking,
  approvalRateWorking,
  flowDetailWorking,
  flowWorking,
  kitchenConsumptionWorking,
  kpiWorking,
  overallConsumptionWorking,
  procurementDetailWorking,
  statusWorking,
  topItemWorking,
} from "./workings.js";

const meta = {
  kitchen: { name: "All kitchens" },
  from: "2026-10-01",
  to: "2026-10-10",
  previous: { from: "2026-09-21", to: "2026-09-30" },
  days: 10,
  timezone: "Asia/Kolkata",
  generatedAt: "2026-10-10T06:30:00.000Z",
  notes: { historicalStock: "Current stock.", unvaluedConsumption: "Unvalued lines are excluded." },
  definitions: [{ id: "consumptionValue", text: "Recorded issue value." }],
};

describe("executive report workings", () => {
  it("uses the report's consumption values in the KPI explanation", () => {
    const spec = kpiWorking({
      id: "consumptionValue", label: "Consumption value", kind: "period", value: 120,
      details: { previousValue: 100, deltaPct: 20, unvaluedLineCount: 2 },
    }, { meta });
    expect(spec.sections[0].lines.map((row) => row.value)).toEqual([100, 120, 20, 20, 2]);
    expect(spec.sections[0].formula).toContain("÷ |₹100.00| × 100 = +20.0%");
  });

  it("lists every kitchen and preserves the server total", () => {
    const spec = overallConsumptionWorking({
      total: 30,
      kitchens: [
        { kitchen: "A", total: 20, unvaluedLines: 0 },
        { kitchen: "B", total: 10, unvaluedLines: 1 },
      ],
    }, meta);
    expect(spec.sections[0].lines.map((row) => row.value)).toEqual([20, 10, 30]);
    expect(spec.sections[0].lines.at(-1).total).toBe(true);
  });

  it("shows the approval-rate inputs alongside the returned rate", () => {
    const spec = flowWorking({
      requests: {
        byStatus: [{ status: "approved", count: 3 }, { status: "rejected", count: 1 }],
        approvalRate: 75,
        pendingAgeing: { total: 0, oldestAgeDays: null, buckets: [] },
      },
      transfers: { byStatus: [], openAgeing: { total: 0, oldestAgeDays: null } },
    }, meta);
    expect(spec.sections[0].lines.at(-2).value).toBe(4);
    expect(spec.sections[0].lines.at(-1).value).toBe(75);
  });

  it("explains a selected status row with its own meaning, share and highlighted breakdown", () => {
    const rows = [{ status: "pending", count: 1 }, { status: "approved", count: 3 }, { status: "rejected", count: 0 }];
    const spec = statusWorking("requests", rows[1], rows, meta);
    expect(spec.title).toBe("Requests: approved");
    expect(spec.sections[0].text).toMatch(/stock was reduced/);
    expect(spec.sections[0].lines.map((row) => row.value)).toEqual([3, 4, 75]);
    expect(spec.sections[0].formula).toBe("Share = 3 ÷ 4 × 100 = 75.0%.");
    const breakdown = spec.sections.at(-1).lines;
    expect(breakdown.filter((row) => row.selected).map((row) => row.label)).toEqual(["Approved"]);
    expect(breakdown.at(-1).value).toBe(4);
  });

  it("adds a value working for indent statuses and handles an empty period", () => {
    const rows = [{ status: "pending", count: 2, value: 500 }, { status: "purchased", count: 0, value: 0 }];
    const spec = statusWorking("indents", rows[0], rows, meta);
    const value = spec.sections.find((section) => section.heading === "Value");
    expect(value.lines.map((row) => row.value)).toEqual([500, 250, 100]);
    const empty = statusWorking("supply", { status: "received", count: 0 }, [{ status: "received", count: 0 }], meta);
    expect(empty.sections[0].lines[2].value).toBeNull();
    expect(empty.sections[0].formula).toMatch(/no share/);
  });

  it("gives each procurement figure its own working", () => {
    const data = {
      scope: "all",
      stockReceived: { value: 900, distributionCount: 3, unpricedAllocationCount: 1 },
      spend: { value: 1000, poCount: 4, daily: [{ date: "2026-10-01", value: 0 }, { date: "2026-10-02", value: 600 }, { date: "2026-10-03", value: 400 }] },
      awaiting: { count: 2, value: 300 },
      indents: [], supplyRequests: [{ status: "pending", count: 1 }],
    };
    expect(procurementDetailWorking({ fact: "stockReceived" }, data, meta).sections[0].lines[2].value).toBe(300);
    const spend = procurementDetailWorking({ fact: "spend" }, data, meta);
    expect(spend.sections[0].lines.find((row) => row.label === "Highest receiving day")).toMatchObject({ value: 600, note: "2026-10-02" });
    expect(spend.sections[1].lines.map((row) => row.value)).toEqual([600, 400, 1000]);
    expect(procurementDetailWorking({ fact: "awaiting" }, data, meta).sections[0].lines[2].value).toBe(150);
    expect(procurementDetailWorking({ status: "supply", row: data.supplyRequests[0] }, data, meta).title).toBe("Supply requests: pending");
    expect(procurementDetailWorking(undefined, data, meta).title).toBe("Procurement and stock intake");
  });

  it("explains a waiting-time bucket against the whole queue", () => {
    const ageing = {
      total: 4, oldestAgeDays: 9.5,
      buckets: [{ id: "lt1d", label: "Under 1 day", count: 1 }, { id: "gt7d", label: "7 days or more", count: 3 }],
    };
    const spec = ageingBucketWorking("transfers", ageing.buckets[1], ageing, meta);
    expect(spec.title).toBe("Open transfers: 7 days or more");
    expect(spec.sections[0].lines.map((row) => row.value)).toEqual([3, 4, 75, 9.5]);
    expect(spec.sections[1].lines.find((row) => row.selected).label).toBe("7 days or more");
    const data = { requests: { pendingAgeing: ageing }, transfers: { openAgeing: ageing } };
    expect(flowDetailWorking({ queue: "requests", bucket: ageing.buckets[0] }, data, meta).title).toBe("Pending requests: under 1 day");
  });

  it("shows the approval-rate substitution with the real counts", () => {
    const spec = approvalRateWorking({
      requests: { byStatus: [{ status: "pending", count: 2 }, { status: "approved", count: 3 }, { status: "rejected", count: 1 }], approvalRate: 75 },
    }, meta);
    expect(spec.sections[0].formula).toBe("Approval rate = 3 ÷ (3 + 1) × 100 = 75.0%.");
    expect(spec.sections[0].lines.find((row) => row.label.startsWith("Not yet decided")).value).toBe(2);
    expect(spec.sections[0].lines.at(-1).value).toBe(25);
  });

  it("brings the queue breakdown into the pending-requests KPI", () => {
    const pendingAgeing = { total: 2, oldestAgeDays: 4, buckets: [{ id: "lt1d", label: "Under 1 day", count: 2 }] };
    const spec = kpiWorking({ id: "pendingRequests", label: "Pending requests", kind: "snapshot", value: 2, details: { oldestAgeDays: 4 } }, {
      meta,
      sections: { requestsTransfers: { status: "ok", data: { requests: { pendingAgeing }, transfers: {} } } },
    });
    expect(spec.sections.map((section) => section.heading)).toEqual(["Working", "How long they have waited"]);
  });

  it("places a kitchen among all kitchens and skips empty days in its daily working", () => {
    const kitchen = {
      godownId: "b", kitchen: "B", total: 25, unvaluedLines: 0, active: true,
      points: [{ date: "2026-10-01", value: 0, unvaluedLines: 0 }, { date: "2026-10-02", value: 25, unvaluedLines: 0 }],
    };
    const trend = { total: 100, kitchens: [{ godownId: "a", total: 75 }, kitchen] };
    const spec = kitchenConsumptionWorking(kitchen, meta, trend);
    expect(spec.sections[0].lines.map((row) => row.value)).toEqual([25, 100, 25, "#2 of 2", 0]);
    const daily = spec.sections.at(-1);
    expect(daily.lines.map((row) => row.label)).toEqual(["2026-10-02", "Period total"]);
    expect(daily.text).toMatch(/1 day with no recorded consumption is left out/);
  });

  it("does not compute a unit value when part of the item's quantity is unvalued", () => {
    const items = [{ rank: 1, name: "Rice", value: 300, qty: 10, unit: "kg", unvaluedLines: 0 }, { rank: 2, name: "Dal", value: 100, qty: 5, unit: "kg", unvaluedLines: 1 }];
    const rice = topItemWorking(items[0], meta, { items, trend: { total: 500 } });
    expect(rice.sections[0].lines[1].value).toBe(60);
    expect(rice.sections[1].lines[2].value).toBe(30);
    const dal = topItemWorking(items[1], meta, { items, trend: { total: 500 } });
    expect(dal.sections[0].lines.find((row) => row.label.startsWith("Behind #1")).value).toBe(200);
    expect(dal.sections[1].lines[2].value).toBeNull();
  });
});
