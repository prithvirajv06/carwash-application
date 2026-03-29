import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fromAddress = process.env.SMTP_FROM || 'Glossplus Premium Car Spa <noreply@carwash.com>';

export const sendWelcomeEmail = async (
  to: string,
  name: string,
  tempPassword: string
): Promise<void> => {
  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: 'Welcome to Glossplus Premium Car Spa - Your Login Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Glossplus Premium Car Spa</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your admin account has been created. Please use the credentials below to log in:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Temporary Password:</strong> <code style="font-size: 18px; color: #dc2626;">${tempPassword}</code></p>
        </div>
        <p style="color: #ef4444;"><strong>Important:</strong> You must change your password on first login.</p>
        <p>If you did not request this account, please contact support immediately.</p>
      </div>
    `,
  });

  logger.info(`Welcome email sent to ${to}`);
};

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: 'Glossplus Premium Car Spa - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in <strong>1 hour</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });

  logger.info(`Password reset email sent to ${to}`);
};

export const sendSubscriptionConfirmation = async (
  to: string,
  name: string,
  planName: string,
  expiryDate: Date,
  invoiceNumber: string
): Promise<void> => {
  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: `Glossplus Premium Car Spa - Subscription Confirmed (${invoiceNumber})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Subscription Confirmed!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your subscription has been activated successfully.</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Valid Until:</strong> ${expiryDate.toDateString()}</p>
        </div>
        <p>Our team will contact you to schedule your first wash. Thank you for choosing Glossplus Premium Car Spa!</p>
      </div>
    `,
  });

  logger.info(`Subscription confirmation email sent to ${to}`);
};
