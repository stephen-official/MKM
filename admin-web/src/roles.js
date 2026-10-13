export const ROLES = Object.freeze({ SUPER_ADMIN: "super_admin", ADMIN: "admin", USER: "user" });
export const isKitchenRole = (role) => role === ROLES.USER;
export const isSuperAdmin = (role) => role === ROLES.SUPER_ADMIN;
/** Admin-tier roles may use this console. */
export const isAdminRole = (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
