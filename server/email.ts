import { Resend } from 'resend';

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@functionalartists.ai';

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
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
    const resend = getResendClient();
    
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

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Update your vendor profile - ${vendorName}`,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('Failed to send vendor update email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Vendor update email sent successfully to ${recipientEmail} (id: ${data?.id})`);
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
    const resend = getResendClient();
    
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

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Action Required: ${requestTitle}`,
      text: textContent,
      html: htmlContent,
    });

    if (error) {
      console.error('Failed to send form request email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Form request email sent successfully to ${recipientEmail} (id: ${data?.id})`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send form request email:', error);
    return { success: false, error: String(error) };
  }
}
