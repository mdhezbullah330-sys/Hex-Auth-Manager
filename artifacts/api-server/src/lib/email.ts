import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "465"),
    secure: (process.env.SMTP_PORT ?? "465") === "465",
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
  const from = process.env.SMTP_FROM!;

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
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:18px;height:18px;background:#f4f4f5;border-radius:4px;text-align:center;line-height:18px;font-size:11px;color:#7c3aed;font-weight:700;">&#9632;</span>
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
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:18px;height:18px;background:#f4f4f5;border-radius:4px;text-align:center;line-height:18px;font-size:11px;color:#7c3aed;font-weight:700;">&#9650;</span>
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
  } catch (err: any) {
    // Log the error but do NOT throw — user is already created in DB.
    // On Resend free plan, only the verified owner email can receive mail.
    // Other recipients will fail here; the dev-code endpoint still works.
    logger.error({ err: err?.message ?? err }, "Failed to send verification email (email delivery failed — user still created)");
  }
}

export async function sendTeamInviteEmail(
  email: string,
  inviterUsername: string,
  role: string,
  acceptLink: string
): Promise<void> {
  const from = process.env.SMTP_FROM!;

  if (!process.env.SMTP_PASS) {
    logger.info({ email, acceptLink }, "Team invite email (SMTP not configured)");
    return;
  }

  const roleLabel = role === "admin" ? "Admin" : "Viewer";
  const roleDesc = role === "admin"
    ? "Full access to create, edit, and manage resources."
    : "Read-only access to view all dashboard data.";
  const roleBadgeBg = role === "admin" ? "#1e3a5f" : "#1a1a2e";
  const roleBadgeColor = role === "admin" ? "#60a5fa" : "#a78bfa";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Team Invitation — Hex Auth</title>
</head>
<body style="margin:0;padding:0;background:#f0eff9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eff9;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 32px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#18181b;border-radius:12px;padding:11px 18px;">
                    <span style="font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.5px;font-family:sans-serif;">
                      <span style="color:#8b5cf6;">HEX</span>AUTH
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.10),0 1px 4px rgba(0,0,0,0.06);">

              <!-- Purple gradient header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:36px 48px 32px 48px;">
                    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.6);">Team Invitation</p>
                    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.3;">You have been invited to join a team</h1>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 48px 0 48px;">
                    <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.7;">
                      Hi there — <strong style="color:#111827;">${inviterUsername}</strong> has invited you to collaborate on their <strong style="color:#111827;">Hex Auth</strong> workspace. Your role will be:
                    </p>

                    <!-- Role badge -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:${roleBadgeBg};border:1px solid ${roleBadgeColor}30;border-radius:10px;padding:14px 20px;">
                          <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:${roleBadgeColor};letter-spacing:0.06em;text-transform:uppercase;">${roleLabel}</p>
                          <p style="margin:0;font-size:13px;color:#6b7280;">${roleDesc}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="border-radius:10px;overflow:hidden;">
                          <a href="${acceptLink}"
                             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:15px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.01em;">
                            Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info rows -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-top:1px solid #f3f4f6;padding:16px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:24px;vertical-align:top;padding-top:1px;">
                                <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#f3f0ff;border:1.5px solid #7c3aed;"></span>
                              </td>
                              <td style="padding-left:10px;font-size:13px;color:#6b7280;line-height:1.6;">
                                You need a <strong style="color:#374151;">Hex Auth account</strong> to accept. Don't have one?
                                <a href="${acceptLink.replace('/api/settings/team/accept/', '/register')}" style="color:#7c3aed;text-decoration:none;font-weight:600;">Register here</a>.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #f3f4f6;padding:16px 0 0 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:24px;vertical-align:top;padding-top:1px;">
                                <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#f3f0ff;border:1.5px solid #7c3aed;"></span>
                              </td>
                              <td style="padding-left:10px;font-size:13px;color:#6b7280;line-height:1.6;">
                                This invitation link expires in <strong style="color:#374151;">48 hours</strong>. If it has expired, ask ${inviterUsername} to resend.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer inside card -->
                <tr>
                  <td style="padding:24px 48px 32px 48px;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;border-top:1px solid #f3f4f6;padding-top:20px;">
                      If you were not expecting this invitation, you can safely ignore it. No account changes will be made.<br/>
                      This invite was sent to <strong>${email}</strong>.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Bottom note -->
          <tr>
            <td style="padding:28px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; 2026 Hex Auth &nbsp;&middot;&nbsp; Authentication Platform
              </p>
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
