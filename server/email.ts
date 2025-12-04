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

interface VendorUpdateEmailResult {
  success: boolean;
  error?: string;
}

export async function sendVendorUpdateEmail(
  recipientEmail: string, 
  vendorName: string, 
  updateLink: string
): Promise<VendorUpdateEmailResult> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Update Your Vendor Profile</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      We'd like to make sure our records for <strong>${vendorName}</strong> are up to date. 
      Please use the secure link below to review and update your business information.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${updateLink}" 
         style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Update Your Profile
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
      <strong>You can update:</strong>
    </p>
    <ul style="font-size: 14px; color: #6b7280; padding-left: 20px; margin-bottom: 20px;">
      <li>Contact information and email</li>
      <li>Business address and locations</li>
      <li>Services offered</li>
      <li>Website and social links</li>
      <li>Diversity certifications</li>
    </ul>
    
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
      This link is unique to your business and will expire in 30 days.
    </p>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you didn't expect this email or have questions, please contact us.
      <br><br>
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${updateLink}" style="color: #10b981; word-break: break-all;">${updateLink}</a>
    </p>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Hello,

We'd like to make sure our records for ${vendorName} are up to date.

Please use the secure link below to review and update your business information:
${updateLink}

You can update:
- Contact information and email
- Business address and locations
- Services offered
- Website and social links
- Diversity certifications

This link is unique to your business and will expire in 30 days.

If you didn't expect this email or have questions, please contact us.
    `.trim();

    const msg = {
      to: recipientEmail,
      from: fromEmail,
      subject: `Update your vendor profile - ${vendorName}`,
      text: textContent,
      html: htmlContent,
    };

    await client.send(msg);
    console.log(`Vendor update email sent successfully to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send vendor update email:', error);
    return { success: false, error: String(error) };
  }
}

interface FormRequestEmailResult {
  success: boolean;
  error?: string;
}

export async function sendFormRequestEmail(
  recipientEmail: string,
  recipientName: string,
  requestTitle: string,
  requestDescription: string,
  formLink: string,
  dueDate: Date | null
): Promise<FormRequestEmailResult> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const dueDateText = dueDate 
      ? `Please complete this form by <strong>${new Date(dueDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</strong>.`
      : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Information Request</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello ${recipientName},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      We are requesting your response to: <strong>${requestTitle}</strong>
    </p>
    
    ${requestDescription ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #8b5cf6;">${requestDescription}</p>` : ''}
    
    ${dueDateText ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">${dueDateText}</p>` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${formLink}" 
         style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Complete Form
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
      <strong>What to expect:</strong>
    </p>
    <ul style="font-size: 14px; color: #6b7280; padding-left: 20px; margin-bottom: 20px;">
      <li>Click the button above to access the form</li>
      <li>Fill out the requested information</li>
      <li>Submit your response</li>
      <li>You can update your response until the deadline</li>
    </ul>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This link is unique to you. Please do not share it.
      <br><br>
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${formLink}" style="color: #8b5cf6; word-break: break-all;">${formLink}</a>
    </p>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Hello ${recipientName},

We are requesting your response to: ${requestTitle}

${requestDescription ? requestDescription + '\n\n' : ''}${dueDate ? `Please complete this form by ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.` : ''}

Please use the secure link below to complete the form:
${formLink}

What to expect:
- Click the link above to access the form
- Fill out the requested information
- Submit your response
- You can update your response until the deadline

This link is unique to you. Please do not share it.
    `.trim();

    const msg = {
      to: recipientEmail,
      from: fromEmail,
      subject: `Action Required: ${requestTitle}`,
      text: textContent,
      html: htmlContent,
    };

    await client.send(msg);
    console.log(`Form request email sent successfully to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send form request email:', error);
    return { success: false, error: String(error) };
  }
}
