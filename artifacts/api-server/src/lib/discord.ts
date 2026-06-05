import { logger } from "./logger";

export async function sendDiscordWebhook(
  webhookUrl: string,
  event: string,
  username: string,
  ip: string,
  description: string,
  extra?: { appName?: string; hwid?: string; pcName?: string; time?: string }
): Promise<void> {
  if (!webhookUrl) return;

  const isError = event.includes("ban") || event.includes("fail") || event.includes("deny");
  const isSuccess = event.includes("ok") || event.includes("success");
  const color = isError ? 0xe74c3c : isSuccess ? 0x2ecc71 : 0xf39c12;

  const eventLabel: Record<string, string> = {
    "login.ok": "✅ Login Successful",
    "login.fail": "❌ Login Failed",
    "hwid.deny": "🚫 HWID Mismatch",
    "hwid.reset": "🔄 HWID Reset",
    "user.ban": "⛔ User Banned",
    "user.unban": "✅ User Unbanned",
  };

  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (extra?.appName) fields.push({ name: "🖥️ Application", value: extra.appName, inline: true });
  fields.push({ name: "👤 Username", value: username || "unknown", inline: true });
  fields.push({ name: "🌐 IP Address", value: ip || "unknown", inline: true });
  if (extra?.hwid) fields.push({ name: "🔑 HWID", value: `\`${extra.hwid.slice(0, 32)}\``, inline: false });
  if (extra?.pcName) fields.push({ name: "💻 PC Name", value: extra.pcName, inline: true });
  fields.push({ name: "📋 Details", value: description, inline: false });

  const payload = {
    embeds: [
      {
        title: eventLabel[event] ?? `Hex Auth — ${event}`,
        color,
        fields,
        timestamp: extra?.time ?? new Date().toISOString(),
        footer: { text: "Hex Auth • Authentication System" },
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.warn({ err }, "Failed to send Discord webhook");
  }
}
