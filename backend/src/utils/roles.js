export const ROLES = Object.freeze({ SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" });
export const ALL_ROLES = Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER]);
/** Roles that can never be self-registered. */
export const PRIVILEGED_ROLES = Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

export const isSuperAdmin = (role) => role === ROLES.SUPER_ADMIN;
/** Admin-tier: everything an admin may do, a super-admin may do too. */
export const isAdminRole = (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
export const isKitchenRole = (role) => role === ROLES.USER;

export const expandAllowedRoles = (roles) =>
  roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SUPER_ADMIN) ? [...roles, ROLES.SUPER_ADMIN] : [...roles];
