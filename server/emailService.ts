import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Nodemailer for Yahoo/Outlook
let nodemailerTransporter: any = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  nodemailerTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;
  private isConfigured: boolean;

  private constructor() {
    this.isConfigured = !!process.env.SENDGRID_API_KEY;
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.isConfigured && !nodemailerTransporter) {
      console.log('📧 Email service not configured. Logging email instead:');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('HTML:', options.html);
      return;
    }

    // Choose email provider based on recipient domain
    const emailDomain = options.to.split('@')[1]?.toLowerCase();
    const isYahooOrOutlook = ['yahoo.com', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com', 'outlook.com', 'hotmail.com', 'live.com'].includes(emailDomain);

    if (isYahooOrOutlook && nodemailerTransporter) {
      // Use Nodemailer for Yahoo/Outlook
      await this.sendWithNodemailer(options);
    } else if (this.isConfigured) {
      // Use SendGrid for Gmail and others
      await this.sendWithSendGrid(options);
    } else {
      // Fallback to logging
      console.log('📧 Email service not configured. Logging email instead:');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('HTML:', options.html);
    }
  }

  private async sendWithSendGrid(options: EmailOptions): Promise<void> {
    try {
      const msg = {
        to: options.to,
        from: process.env.FROM_EMAIL || 'noreply@drops.com',
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };

      await sgMail.send(msg);
      console.log('✅ Email sent via SendGrid to:', options.to);
    } catch (error: any) {
      console.error('❌ SendGrid failed:', error.response?.body || error.message);
      // Fallback to Nodemailer if available
      if (nodemailerTransporter) {
        console.log('🔄 Falling back to SMTP...');
        await this.sendWithNodemailer(options);
      } else {
        throw new Error('Failed to send email');
      }
    }
  }

  private async sendWithNodemailer(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@drops.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };

      await nodemailerTransporter.sendMail(mailOptions);
      console.log('✅ Email sent via SMTP to:', options.to);
    } catch (error) {
      console.error('❌ SMTP failed:', error);
      throw new Error('Failed to send email');
    }
  }

  public async sendVerificationEmail(email: string, otp: string): Promise<void> {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?email=${encodeURIComponent(email)}&token=${otp}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - Drops</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .code { background: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; letter-spacing: 2px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Welcome to Drops!</h1>
              <p>Verify your email to start collecting cards</p>
            </div>
            <div class="content">
              <h2>Email Verification Required</h2>
              <p>Thank you for signing up for Drops! To complete your registration and start playing TCG minigames, please verify your email address.</p>
              
              <p><strong>Your verification code:</strong></p>
              <div class="code">${otp}</div>
              
              <p>Or click the button below to verify automatically:</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              
              <p><strong>What's next?</strong></p>
              <ul>
                <li>✅ Verify your email (you're here!)</li>
                <li>🎮 Play TCG minigames (Plinko, Wheel, Minesweeper)</li>
                <li>📦 Open premium packs and collect rare cards</li>
                <li>🏆 Build your ultimate card collection</li>
              </ul>
              
              <p><em>This verification code will expire in 15 minutes.</em></p>
            </div>
            <div class="footer">
              <p>If you didn't create an account with Drops, you can safely ignore this email.</p>
              <p>© 2024 Drops. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '🎮 Verify Your Email - Welcome to Drops!',
      html,
    });
  }
}

export const emailService = EmailService.getInstance();
