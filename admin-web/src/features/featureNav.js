import { NAV, SUPER_NAV } from "../components/navItems.js";
import { isSuperAdmin } from "../roles.js";

const SECTION_ORDER = ["Stock", "Insights", "Executive"];
export const NO_ACCESS_PATH = "/no-access";

const enabled = (flags, key) => !flags || flags[key] !== false;

export const buildSections = ({ flags, role }) => {
  const superAdmin = isSuperAdmin(role);
  const items = [
    ...NAV.filter((item) => superAdmin || enabled(flags, item.feature))
      .map((item) => ({ ...item, hiddenFromAdmins: superAdmin && !enabled(flags, item.feature) })),
    ...(superAdmin ? SUPER_NAV : [])
  ];
  return SECTION_ORDER
    .map((title) => ({ title, items: items.filter((item) => item.section === title) }))
    .filter((section) => section.items.length > 0);
};

export const disabledFeatureForPath = (path, { flags, role }) => {
  if (isSuperAdmin(role)) return null;
  const item = NAV.find((n) => n.path === path);
  return item && !enabled(flags, item.feature) ? item.feature : null;
};

export const isPathAllowed = (path, { flags, role }) => {
  if (SUPER_NAV.some((n) => n.path === path)) return isSuperAdmin(role);
  return disabledFeatureForPath(path, { flags, role }) === null;
};

export const firstAllowedPath = ({ flags, role }) => {
  const first = buildSections({ flags, role }).flatMap((s) => s.items).find((item) => !item.hiddenFromAdmins);
  return first ? first.path : NO_ACCESS_PATH;
};
