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

const findCurrentUsers = async (ids) => {
  const { User } = await import("./models/User.js");
  return User.find({ _id: { $in: ids } }).select("role godownId active").lean();
};

/**
 * disconnectUser only reaches this instance's sockets. With several backend instances, each one runs
 * this on a timer: any local socket whose user was deleted, deactivated, or changed role or kitchen
 * since it connected is dropped, so access changes made on another instance still take effect.
 */
export const revalidateSockets = async ({ findUsers = findCurrentUsers } = {}) => {
  if (!instance) return { checked: 0, dropped: 0 };
  const sockets = (await instance.fetchSockets()).filter((s) => s.data?.user?.id);
  if (sockets.length === 0) return { checked: 0, dropped: 0 };
  const ids = [...new Set(sockets.map((s) => s.data.user.id))];
  const current = new Map((await findUsers(ids)).map((u) => [String(u._id), u]));
  let dropped = 0;
  for (const socket of sockets) {
    const was = socket.data.user;
    const now = current.get(was.id);
    const stale = !now?.active || now.role !== was.role || String(now.godownId ?? "") !== String(was.godownId ?? "");
    if (stale) { socket.disconnect(true); dropped += 1; }
  }
  return { checked: sockets.length, dropped };
};

/** Rooms a connected socket joins. Admin-tier users share "admins"; kitchens join their godown room. */
export const roomsFor = (user) => {
  if (!user) return [];
  const personal = user.id ? [`user:${user.id}`] : [];
  if (isAdminRole(user.role)) return ["admins", ...personal];
  return user.godownId ? [String(user.godownId), ...personal] : personal;
};
