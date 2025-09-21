import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com', // STMP Server
  port: parseInt(process.env.SMTP_PORT || '587', 10), // Server port
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Random secure token generator
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Send any email
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: `"TaskFlow" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent to:', to);
    return true;
  } catch (error) {
    console.error('Email failed:', error);
    return false;
  }
};

// Send email verification using sendEmail
export const sendEmailVerification = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
    <h2>Welcome ${name}!</h2>
    <p>Click to verify your email:</p>
    <a href="${verificationUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none;">Verify Email</a>
    <p>Or copy this link: ${verificationUrl}</p>
  `;

  const text = `Welcome ${name}! Verify your email: ${verificationUrl}`;

  return sendEmail(email, 'Verify Your Email - TaskFlow', html, text);
};

// Send password reset
export const sendPasswordReset = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <h2>Password Reset</h2>
    <p>Hi ${name}, click to reset your password:</p>
    <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none;">Reset Password</a>
    <p>Link expires in 1 hour: ${resetUrl}</p>
  `;

  const text = `Hi ${name}, reset your password: ${resetUrl}`;

  return sendEmail(email, 'Reset Your Password - TaskFlow', html, text);
};
