import nodemailer from 'nodemailer';
import { env } from "../config/env.js";

/** Sends a password reset email using Gmail SMTP. */
export const sendResetEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.emailUser, 
      pass: env.emailPass, 
    },
  });

  // TODO: Use env.frontendUrl after deployment URLs are standardized.
  const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"Inventory Support" <${env.emailUser}>`,
    to: email,
    subject: "Password Reset Token",
    text: `Your reset token is: ${token}. Reset link: ${resetUrl}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Password Reset</h2>
        <p>You requested a password reset. Use the token below to complete the process:</p>
        <div style="background: #f4f4f4; padding: 10px; font-size: 20px; font-weight: bold; text-align: center;">
          ${token}
        </div>
        <p>Or click the button below:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This token will expire in 15 minutes.</p>
        <hr />
        <small>If you did not request this, please ignore this email.</small>
      </div>
    `,
  });
};
