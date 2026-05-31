import { logger } from "./logger";

export async function sendDiscordWebhook(
  webhookUrl: string,
  event: string,
  username: string,
  ip: string,
  description: string
): Promise<void> {
  if (!webhookUrl) return;

  const color = event.includes("ban") || event.includes("fail") || event.includes("deny")
    ? 0xff4444
    : event.includes("ok") || event.includes("success")
    ? 0x44ff44
    : 0xffa500;

  const payload = {
    embeds: [
      {
        title: `Hex Auth — ${event}`,
        color,
        fields: [
          { name: "Event", value: event, inline: true },
          { name: "Username", value: username || "unknown", inline: true },
          { name: "IP Address", value: ip || "unknown", inline: true },
          { name: "Description", value: description, inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Hex Auth" },
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
