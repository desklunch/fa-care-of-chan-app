import { getResendClient, FROM_EMAIL } from "../../email";
import type { NotificationPayload } from "./notifications.channels";

function getEntityUrl(entityType?: string, entityId?: string): string {
  const baseUrl = process.env.APP_URL
    ? process.env.APP_URL.replace(/\/+$/, "")
    : process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "https://app.careofchan.com";

  if (!entityType || !entityId) return baseUrl;

  const routeMap: Record<string, string> = {
    deal: `/deals/${entityId}`,
    venue: `/venues/${entityId}`,
    vendor: `/vendors/${entityId}`,
    contact: `/contacts/${entityId}`,
    client: `/clients/${entityId}`,
    app_feature: `/features/${entityId}`,
    app_issue: `/issues/${entityId}`,
    feedback: `/feedback`,
  };

  return `${baseUrl}${routeMap[entityType] || ""}`;
}

function buildEmailHtml(payload: NotificationPayload): string {
  const entityUrl = getEntityUrl(payload.entityType, payload.entityId);
  const truncatedBody = payload.body
    ? payload.body.length > 200
      ? payload.body.substring(0, 200) + "..."
      : payload.body
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${escapeHtml(payload.title)}</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    ${truncatedBody ? `<p style="font-size: 15px; margin-bottom: 20px; color: #4b5563;">${escapeHtml(truncatedBody)}</p>` : ""}
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${entityUrl}" 
         style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
        View in App
      </a>
    </div>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      You received this notification from Care of Chan OS.
      <br>
      <a href="${entityUrl}" style="color: #6366f1; word-break: break-all;">${entityUrl}</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendNotificationEmail(
  recipientEmail: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    const resend = getResendClient();

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: payload.title,
      text: payload.body || payload.title,
      html: buildEmailHtml(payload),
    });

    if (error) {
      console.error("[NotificationEmail] Resend error:", error);
      return;
    }

    console.log(`[NotificationEmail] Sent to ${recipientEmail}: ${payload.title}`);
  } catch (error) {
    console.error("[NotificationEmail] Failed:", error);
  }
}
