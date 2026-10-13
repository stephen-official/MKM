// The socket.io server is created by server.js, but routes need to emit events
// without importing server.js (which would start listening). Routes import `io`
// from here; until setIo() runs (tests, scripts) every emit is a no-op.
import { isAdminRole } from "./utils/roles.js";

let instance = null;

const noop = { to: () => noop, emit: () => false };

export const setIo = (server) => {
  instance = server;
};

export const io = {
  to: (room) => (instance ? instance.to(room) : noop),
  emit: (...args) => (instance ? instance.emit(...args) : false)
};

/** Drop every live socket of a user (their role, kitchen or active flag changed). No-op before setIo. */
export const disconnectUser = (id) => {
  if (instance) instance.in(`user:${id}`).disconnectSockets(true);
};

/** Rooms a connected socket joins. Admin-tier users share "admins"; kitchens join their godown room. */
export const roomsFor = (user) => {
  if (!user) return [];
  const personal = user.id ? [`user:${user.id}`] : [];
  if (isAdminRole(user.role)) return ["admins", ...personal];
  return user.godownId ? [String(user.godownId), ...personal] : personal;
};
