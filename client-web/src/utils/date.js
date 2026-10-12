export const toLocalDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const isSameLocalDate = (value, dateKey) => !dateKey || toLocalDateKey(value) === dateKey;

export const localDateFromKey = (dateKey) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};
