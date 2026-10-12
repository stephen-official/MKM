import mongoose from "mongoose";

export const UI_LIMITS = Object.freeze({ listPageSize: 25, comparisonPageSize: 25 });
export const EXPORT_LIMITS = Object.freeze({ listPageSize: 5000, comparisonPageSize: 1000 });

/** Runs fn once; later calls share the same promise (sections reuse loaded data). */
export const memo = (fn) => {
  let promise = null;
  return () => (promise ??= fn());
};

export const createContext = ({ params, kitchen, godownDocs, now = new Date(), limits = UI_LIMITS, maxTimeMS }) => {
  const godowns = new Map(godownDocs.map((g) => [String(g._id), { name: g.name, active: g.active !== false }]));
  return {
    params,
    kitchen,
    godowns,
    activeIds: godownDocs.filter((g) => g.active !== false).map((g) => g._id),
    scopeIds: params.godownId === "all" ? null : [new mongoose.Types.ObjectId(params.godownId)],
    now,
    tz: params.tz,
    limits,
    maxTimeMS,
    kitchenName: (id) => godowns.get(String(id))?.name ?? `Deleted kitchen (…${String(id).slice(-6)})`,
    aggOptions: () => (maxTimeMS ? { maxTimeMS } : {})
  };
};
