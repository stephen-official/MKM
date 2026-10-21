import { NAV, SUPER_NAV, WORKSPACE_NAV, SUPER_WORKSPACE_NAV } from "../components/navItems.js";
import { isSuperAdmin } from "../roles.js";

const SECTION_ORDER = ["Workspace", "Insights", "Manage"];
export const NO_ACCESS_PATH = "/no-access";

const enabled = (flags, key) => !flags || flags[key] !== false;

export const buildSections = ({ flags, role }) => {
  const superAdmin = isSuperAdmin(role);
  const items = WORKSPACE_NAV
    .filter((workspace) => superAdmin || workspace.tabs.some((tab) => enabled(flags, tab.feature)))
    .map((workspace) => ({
      ...workspace,
      hiddenFromAdmins: superAdmin && workspace.tabs.every((tab) => !enabled(flags, tab.feature))
    }));
  if (superAdmin) items.push(...SUPER_WORKSPACE_NAV);
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
  const workspace = [...WORKSPACE_NAV, ...SUPER_WORKSPACE_NAV].find((item) => path === item.path || path.startsWith(`${item.path}/`));
  if (workspace) {
    if (workspace.superOnly && !isSuperAdmin(role)) return false;
    if (!workspace.tabs) return isSuperAdmin(role);
    return isSuperAdmin(role) || workspace.tabs.some((tab) => enabled(flags, tab.feature));
  }
  if (SUPER_NAV.some((n) => n.path === path)) return isSuperAdmin(role);
  return disabledFeatureForPath(path, { flags, role }) === null;
};

export const firstAllowedPath = ({ flags, role }) => {
  const first = buildSections({ flags, role }).flatMap((s) => s.items).find((item) => !item.hiddenFromAdmins);
  return first ? first.path : NO_ACCESS_PATH;
};
