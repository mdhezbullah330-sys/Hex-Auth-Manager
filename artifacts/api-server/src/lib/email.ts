import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.resend.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: (process.env.SMTP_PORT || "465") === "465",
    auth: {
      user: process.env.SMTP_USER || "resend",
      pass: process.env.SMTP_PASS || "",
    },
  });
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  username: string = "there"
): Promise<void> {
  const from = process.env.SMTP_FROM || "Hex Auth <onboarding@resend.dev>";

  if (!process.env.SMTP_PASS) {
    logger.info({ email, code }, "Email verification code (SMTP not configured)");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Hex Auth account</title>
</head>
<body style="margin:0;padding:0;background:#f5f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4ef;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding:0 0 28px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#18181b;border-radius:10px;padding:10px 14px;display:inline-block;">
                    <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
                      <span style="color:#7c3aed;">HEX</span>AUTH
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <!-- Purple top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#7c3aed,#6d28d9);height:4px;"></td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 48px 0 48px;">
                    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#18181b;">Verify your email address</h1>
                    <p style="margin:0 0 24px 0;font-size:15px;color:#52525b;line-height:1.6;">
                      Hi <strong style="color:#18181b;">${username}</strong> — thanks for signing up.
                      Use the code below to complete your Hex Auth registration.
                    </p>
                  </td>
                </tr>

                <!-- Code box -->
                <tr>
                  <td style="padding:0 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#fafaf8;border:1px solid #e4e4e7;border-radius:12px;padding:28px;text-align:center;">
                          <p style="margin:0 0 12px 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;">Your Verification Code</p>
                          <p style="margin:0 0 10px 0;font-size:44px;font-weight:800;letter-spacing:0.18em;color:#18181b;font-family:'Courier New',Courier,monospace;">${code}</p>
                          <p style="margin:0;font-size:13px;color:#71717a;">Expires in <strong>15 minutes</strong></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Info rows -->
                <tr>
                  <td style="padding:24px 48px 0 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-top:1px solid #f4f4f5;padding:16px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:1px;">
                                <span style="font-size:16px;">🔒</span>
                              </td>
                              <td style="font-size:14px;color:#52525b;line-height:1.5;">
                                Never share this code. <strong>Hex Auth</strong> will never ask for it.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #f4f4f5;padding:16px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:1px;">
                                <span style="font-size:16px;">⚡</span>
                              </td>
                              <td style="font-size:14px;color:#52525b;line-height:1.5;">
                                Once verified you'll have instant access to your dashboard.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:24px 48px 36px 48px;border-top:1px solid #f4f4f5;margin-top:8px;">
                    <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                      If you didn't create a Hex Auth account, you can safely ignore this email — no account will be created.<br/>
                      This code was requested for <a href="mailto:${email}" style="color:#7c3aed;text-decoration:none;">${email}</a>.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Bottom note -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">© 2026 Hex Auth. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = `${code} is your Hex Auth verification code`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from,
      to: email,
      subject,
      html,
    });
    logger.info({ email }, "Verification email sent via Resend");
  } catch (err) {
    logger.error({ err }, "Failed to send verification email");
    throw err;
  }
}

export async function sendTeamInviteEmail(
  email: string,
  inviterUsername: string,
  role: string,
  acceptLink: string
): Promise<void> {
  const from = process.env.SMTP_FROM || "Hex Auth <onboarding@resend.dev>";

  if (!process.env.SMTP_PASS) {
    logger.info({ email, acceptLink }, "Team invite email (SMTP not configured)");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Team Invitation</title></head>
<body style="margin:0;padding:0;background:#f5f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4ef;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 28px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#18181b;border-radius:10px;padding:10px 14px;">
                    <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
                      <span style="color:#7c3aed;">HEX</span>AUTH
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="background:linear-gradient(90deg,#7c3aed,#6d28d9);height:4px;"></td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 48px 36px 48px;">
                    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#18181b;">You've been invited</h1>
                    <p style="margin:0 0 28px 0;font-size:15px;color:#52525b;line-height:1.6;">
                      <strong style="color:#18181b;">${inviterUsername}</strong> has invited you to join their Hex Auth team as <strong style="color:#18181b;">${role}</strong>.
                    </p>
                    <a href="${acceptLink}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;">Accept Invitation →</a>
                    <p style="margin:24px 0 0 0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                      You need a Hex Auth account to accept. This link expires in 48 hours.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">© 2026 Hex Auth. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from,
      to: email,
      subject: `${inviterUsername} invited you to join their Hex Auth team`,
      html,
    });
  } catch (err) {
    logger.error({ err }, "Failed to send team invite email");
  }
}
