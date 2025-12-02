// SendGrid Email Service Integration
import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

interface InviteEmailData {
  recipientEmail: string;
  recipientName: string;
  inviteLink: string;
  organizationName?: string;
}

export async function sendInvitationEmail(data: InviteEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const orgName = data.organizationName || 'Our Team';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.recipientName},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      You've been invited to join the <strong>${orgName}</strong> team directory. 
      Click the button below to create your account and complete your profile.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.inviteLink}" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
      <strong>How to get started:</strong>
    </p>
    <ol style="font-size: 14px; color: #6b7280; padding-left: 20px; margin-bottom: 20px;">
      <li>Click the "Accept Invitation" button above</li>
      <li>Sign in with your Google account</li>
      <li>Complete your profile information</li>
    </ol>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you didn't expect this invitation, you can safely ignore this email.
      <br><br>
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${data.inviteLink}" style="color: #3b82f6; word-break: break-all;">${data.inviteLink}</a>
    </p>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Hi ${data.recipientName},

You've been invited to join the ${orgName} team directory.

To accept this invitation and create your account, visit:
${data.inviteLink}

How to get started:
1. Click the link above
2. Sign in with your Google account
3. Complete your profile information

If you didn't expect this invitation, you can safely ignore this email.
    `.trim();

    const msg = {
      to: data.recipientEmail,
      from: fromEmail,
      subject: `You're invited to join ${orgName}`,
      text: textContent,
      html: htmlContent,
    };

    await client.send(msg);
    console.log(`Invitation email sent successfully to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
}
