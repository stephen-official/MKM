import { useEffect, useState } from "react";

/** True from 900px: the kitchen screens switch from phone layouts (sheets, dropdowns) to desktop ones (columns, tiles). */
export const WIDE = "(min-width: 900px)";
export const useWide = () => {
  const [wide, setWide] = useState(() => Boolean(window.matchMedia?.(WIDE).matches));
  useEffect(() => {
    const query = window.matchMedia?.(WIDE);
    if (!query) return undefined;
    const update = () => setWide(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
};
