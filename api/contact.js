import nodemailer from 'nodemailer';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message, services } = request.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const selectedServices = Array.isArray(services)
    ? services.filter(service => typeof service === 'string').join(', ')
    : typeof services === 'string'
      ? services
      : 'Not specified';

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return response.status(400).json({ error: 'Name, email, and message are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return response.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const requiredSettings = ['SMTP_USER', 'SMTP_APP_PASSWORD', 'CONTACT_EMAIL'];
  const missingSettings = requiredSettings.filter(setting => !process.env[setting]);
  if (missingSettings.length > 0) {
    return response.status(500).json({
      error: `SMTP is not configured. Add these environment variables: ${missingSettings.join(', ')}.`
    });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD.replace(/\s/g, '')
    }
  });

  try {
    await transporter.sendMail({
      from: `Portfolio Contact Form <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      replyTo: cleanEmail,
      subject: `New portfolio inquiry from ${cleanName}`,
      text: [
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Services: ${selectedServices}`,
        '',
        cleanMessage
      ].join('\n')
    });
  } catch (error) {
    console.error('SMTP request failed:', error);
    return response.status(502).json({ error: 'The email provider could not send the message.' });
  }

  return response.status(200).json({ ok: true });
}
