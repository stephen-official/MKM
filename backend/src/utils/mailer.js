import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  service: "gmail", // or your SMTP provider
  auth: {
    user: env.emailUser, 
    pass: env.emailPass,
    
  },
});

export const sendResetEmail = async (to, token) => {
  const resetUrl = `http://localhost:5173/reset-password?token=${token}`; // Adjust for your frontend URL
  const mailOptions = {
    from: env.emailUser,
    to,
    subject: "Password Reset Token",
    html: `<p>You requested a password reset. Use the token below or click the link:</p>
           <h3>${token}</h3>
           <a href="${resetUrl}">Reset Password</a>
           <p>This token expires in 15 minutes.</p>`,
  };

  await transporter.sendMail(mailOptions);
};