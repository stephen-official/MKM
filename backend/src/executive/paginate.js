export const collator = new Intl.Collator("en", { sensitivity: "base" });
export const compareIds = (a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);

export const paginate = (rows, page, pageSize) => {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize), total, page: safePage, pageSize, pages };
};
