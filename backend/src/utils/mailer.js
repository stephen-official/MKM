import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const createTransport = () => nodemailer.createTransport({ service: "gmail", auth: { user: env.emailUser, pass: env.emailPass } });
const from = () => `"Montessori Kitchen" <${env.emailUser}>`;
const resetLink = (token) => `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const mailer = {
  /** Password reset (15 minutes). */
  async sendResetEmail(email, token) {
    await createTransport().sendMail({
      from: from(), to: email, subject: "Password Reset Token",
      text: `Your reset token is: ${token}. Reset link: ${resetLink(token)}`,
      html: `<p>Your reset token is <strong>${escapeHtml(token)}</strong>.</p><p><a href="${resetLink(token)}">Reset your password</a>. This token expires in 15 minutes.</p>`
    });
  },
  /** New account invitation (24 hours). */
  async sendInviteEmail({ email, name, token }) {
    await createTransport().sendMail({
      from: from(), to: email, subject: "Your Montessori Kitchen account",
      text: `Hello ${name}, an account was created for you. Set your password with this token within 24 hours: ${token}. Link: ${resetLink(token)}`,
      html: `<p>Hello ${escapeHtml(name)},</p><p>An account was created for you. Set your password within 24 hours using token <strong>${escapeHtml(token)}</strong> or <a href="${resetLink(token)}">this link</a>.</p>`
    });
  },
  async sendReportEmail() {
    throw new Error("sendReportEmail is implemented in Task 33");
  }
};

/** Kept for existing imports. */
export const sendResetEmail = (email, token) => mailer.sendResetEmail(email, token);
