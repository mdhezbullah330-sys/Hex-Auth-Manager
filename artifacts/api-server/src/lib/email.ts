import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  username: string = "there"
): Promise<void> {
  const from = process.env.SMTP_FROM ?? "Hex Auth <noreply@benjahexauth.qzz.io>";

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
<body style="margin:0;padding:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 28px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:11px 20px;">
                    <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;font-family:sans-serif;">
                      <span style="color:#8b5cf6;">HEX</span>AUTH
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:20px;overflow:hidden;box-shadow:0 0 40px rgba(139,92,246,0.12);">

              <!-- Gradient top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#7c3aed,#4f46e5,#7c3aed);height:3px;"></td>
                </tr>
              </table>

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 44px 28px 44px;border-bottom:1px solid #27272a;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2d1b69;border:1px solid #4c1d95;border-radius:10px;padding:8px 14px;margin-bottom:16px;display:inline-block;">
                          <span style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;">Email Verification</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:14px 0 8px 0;font-size:24px;font-weight:700;color:#f4f4f5;line-height:1.3;">Verify your email address</h1>
                    <p style="margin:0;font-size:15px;color:#71717a;line-height:1.6;">
                      Hi <strong style="color:#e4e4e7;">${username}</strong> — use the code below to complete your Hex Auth registration.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- OTP Code box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 44px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#0f0f13;border:1px solid #3f3f46;border-radius:14px;padding:28px;text-align:center;">
                          <p style="margin:0 0 12px 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#52525b;">One-Time Verification Code</p>
                          <p style="margin:0 0 10px 0;font-size:48px;font-weight:800;letter-spacing:0.22em;color:#a78bfa;font-family:'Courier New',Courier,monospace;">${code}</p>
                          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                            <tr>
                              <td style="background:#1c1917;border:1px solid #292524;border-radius:20px;padding:5px 14px;">
                                <span style="font-size:12px;color:#78716c;">⏱ Expires in <strong style="color:#a8a29e;">15 minutes</strong></span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info rows -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 44px 12px 44px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #27272a;border-radius:12px;overflow:hidden;">
                      <tr>
                        <td style="padding:14px 18px;border-bottom:1px solid #27272a;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:1px;">
                                <span style="display:inline-block;width:18px;height:18px;background:#1c1917;border:1px solid #44403c;border-radius:5px;text-align:center;line-height:18px;font-size:10px;">🔒</span>
                              </td>
                              <td style="font-size:13px;color:#71717a;line-height:1.5;padding-left:8px;">
                                Never share this code. <strong style="color:#a1a1aa;">Hex Auth will never ask for it.</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 18px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:1px;">
                                <span style="display:inline-block;width:18px;height:18px;background:#1c1917;border:1px solid #44403c;border-radius:5px;text-align:center;line-height:18px;font-size:10px;">✅</span>
                              </td>
                              <td style="font-size:13px;color:#71717a;line-height:1.5;padding-left:8px;">
                                Once verified, you'll get instant access to your dashboard.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 44px 32px 44px;border-top:1px solid #27272a;">
                    <p style="margin:0;font-size:12px;color:#52525b;line-height:1.7;">
                      If you didn't create a Hex Auth account, ignore this email — no account will be created.<br/>
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
              <p style="margin:0;font-size:12px;color:#3f3f46;">© 2026 Hex Auth · All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = `${code} — Your Hex Auth Verification Code`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({ from, to: email, subject, html });
    logger.info({ email }, "Verification email sent via Brevo");
  } catch (err: any) {
    logger.error({ err: err?.message ?? err }, "Failed to send verification email");
  }
}

export async function sendTeamInviteEmail(
  email: string,
  inviterUsername: string,
  role: string,
  acceptLink: string
): Promise<void> {
  const from = process.env.SMTP_FROM ?? "Hex Auth <noreply@benjahexauth.qzz.io>";

  if (!process.env.SMTP_PASS) {
    logger.info({ email, acceptLink }, "Team invite email (SMTP not configured)");
    return;
  }

  const roleLabel = role === "admin" ? "Admin" : "Viewer";
  const roleDesc = role === "admin"
    ? "Full access to create, edit, and manage all resources."
    : "Read-only access to view all dashboard data.";
  const roleBadgeBorder = role === "admin" ? "#3b82f6" : "#8b5cf6";
  const roleBadgeBg = role === "admin" ? "#172554" : "#2e1065";
  const roleBadgeColor = role === "admin" ? "#93c5fd" : "#c4b5fd";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Team Invitation — Hex Auth</title>
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 28px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:11px 20px;">
                    <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;font-family:sans-serif;">
                      <span style="color:#8b5cf6;">HEX</span>AUTH
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:20px;overflow:hidden;box-shadow:0 0 40px rgba(139,92,246,0.12);">

              <!-- Gradient top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#7c3aed,#4f46e5,#7c3aed);height:3px;"></td>
                </tr>
              </table>

              <!-- Hero header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e0a3c 0%,#1a1035 60%,#0f0f1a 100%);padding:40px 44px 36px 44px;border-bottom:1px solid #27272a;">
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);border-radius:20px;padding:5px 14px;">
                          <span style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;">Team Invitation</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:0 0 10px 0;font-size:26px;font-weight:800;color:#f4f4f5;line-height:1.3;">You've been invited! 🎉</h1>
                    <p style="margin:0;font-size:15px;color:#a1a1aa;line-height:1.6;">
                      <strong style="color:#e4e4e7;">${inviterUsername}</strong> has invited you to collaborate on their Hex Auth workspace.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 44px 28px 44px;">

                    <!-- Role badge -->
                    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px;">
                      <tr>
                        <td style="background:${roleBadgeBg};border:1px solid ${roleBadgeBorder}40;border-left:3px solid ${roleBadgeBorder};border-radius:10px;padding:16px 20px;">
                          <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${roleBadgeColor}60;">Your Role</p>
                          <p style="margin:0 0 4px 0;font-size:16px;font-weight:800;color:${roleBadgeColor};">${roleLabel}</p>
                          <p style="margin:0;font-size:13px;color:#6b7280;">${roleDesc}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
                      <tr>
                        <td align="center">
                          <a href="${acceptLink}"
                             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:12px;font-weight:700;font-size:16px;letter-spacing:0.01em;box-shadow:0 4px 24px rgba(124,58,237,0.4);">
                            ✓ &nbsp;Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info rows -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #27272a;border-radius:12px;overflow:hidden;">
                      <tr>
                        <td style="padding:14px 18px;border-bottom:1px solid #27272a;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:26px;vertical-align:top;padding-top:1px;font-size:14px;">👤</td>
                              <td style="font-size:13px;color:#71717a;line-height:1.6;padding-left:8px;">
                                You need a <strong style="color:#a1a1aa;">Hex Auth account</strong> to accept.
                                <a href="${acceptLink.split("/api/")[0]}/register" style="color:#8b5cf6;text-decoration:none;font-weight:600;">Register here</a> if you don't have one.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 18px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:26px;vertical-align:top;padding-top:1px;font-size:14px;">⏳</td>
                              <td style="font-size:13px;color:#71717a;line-height:1.6;padding-left:8px;">
                                This invitation link expires in <strong style="color:#a1a1aa;">48 hours</strong>. Ask ${inviterUsername} to resend if it expires.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Footer inside card -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 44px 28px 44px;border-top:1px solid #27272a;">
                    <p style="margin:0;padding-top:20px;font-size:12px;color:#52525b;line-height:1.7;">
                      If you were not expecting this invitation, you can safely ignore it. No changes will be made to any account.<br/>
                      This invite was sent to <strong style="color:#71717a;">${email}</strong>.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Bottom note -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">© 2026 Hex Auth · Authentication Platform</p>
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
    logger.info({ email }, "Team invite email sent via Brevo");
  } catch (err: any) {
    logger.error({ err: err?.message ?? err }, "Failed to send team invite email");
  }
}
