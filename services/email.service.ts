import nodemailer from 'nodemailer';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendNotificationEmail(to: string, content: string, link?: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'New Notification',
        text: content,
        html: `
          <div>
            <p>${content}</p>
            ${link ? `<p>Click <a href="${link}">here</a> to view.</p>` : ''}
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}