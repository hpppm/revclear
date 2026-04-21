import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(toEmail: string, code: string): Promise<void> {
  await resend.emails.send({
    from: "noreply@revclear.tech",
    to: toEmail,
    subject: "Your RevClear verification code",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RevClear Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,148,136,0.10);">
          <tr>
            <td style="background:#0f766e;padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">RevClear</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px;text-align:center;">
              <p style="margin:0 0 8px;font-size:15px;color:#374151;">Your verification code is</p>
              <p style="margin:0;font-size:44px;font-weight:700;letter-spacing:10px;color:#0f766e;line-height:1.1;">${code}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 36px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b7280;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #f0fdfa;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">RevClear &mdash; AI-assisted medical claims platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
