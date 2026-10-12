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

/** Rooms a connected socket joins. Admin-tier users share "admins"; kitchens join their godown room. */
export const roomsFor = (user) => {
  if (isAdminRole(user?.role)) return ["admins"];
  return user?.godownId ? [String(user.godownId)] : [];
};
