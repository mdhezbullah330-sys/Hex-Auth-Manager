import nodemailer from "nodemailer";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const fromEmail = process.env.SMTP_FROM || "noreply@hexauth.app";

  if (!process.env.SMTP_USER) {
    logger.info({ email, code }, "Email verification code (SMTP not configured)");
    return;
  }

  try {
    await transporter.sendMail({
      from: `Hex Auth <${fromEmail}>`,
      to: email,
      subject: "Verify your Hex Auth account",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 32px; border-radius: 8px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">Hex Auth</h2>
          <h3 style="margin-bottom: 24px;">Verify your email address</h3>
          <p style="color: #ccc; margin-bottom: 24px;">Enter the following code to verify your account:</p>
          <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 6px; padding: 16px 24px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #7c3aed; margin-bottom: 24px;">
            ${code}
          </div>
          <p style="color: #999; font-size: 13px;">This code expires in 15 minutes. If you did not create an account, ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err }, "Failed to send verification email");
  }
}

export async function sendTeamInviteEmail(
  email: string,
  inviterUsername: string,
  role: string,
  acceptLink: string
): Promise<void> {
  const fromEmail = process.env.SMTP_FROM || "noreply@hexauth.app";

  if (!process.env.SMTP_USER) {
    logger.info({ email, acceptLink }, "Team invite email (SMTP not configured)");
    return;
  }

  try {
    await transporter.sendMail({
      from: `Hex Auth <${fromEmail}>`,
      to: email,
      subject: `${inviterUsername} invited you to join their Hex Auth team`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 32px; border-radius: 8px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">Hex Auth</h2>
          <h3 style="margin-bottom: 24px;">You have been invited</h3>
          <p style="color: #ccc; margin-bottom: 24px;"><strong>${inviterUsername}</strong> has invited you to join their team as <strong>${role}</strong>.</p>
          <a href="${acceptLink}" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-bottom: 24px;">Accept Invitation</a>
          <p style="color: #999; font-size: 13px;">You need a Hex Auth account to accept. This link expires in 48 hours.</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err }, "Failed to send team invite email");
  }
}
