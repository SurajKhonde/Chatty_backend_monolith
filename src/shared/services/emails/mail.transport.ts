import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import Logger from 'bunyan';
import sendGridMail from '@sendgrid/mail';
import { config } from '@root/config';
import { BadRequestError } from '@global/helpers/error-handler';

interface IMailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

const log: Logger = config.createLogger('mailTransport');
const isProd = config.NODE_ENV === 'production';
if (isProd) {
  if (!config.SENDGRID_API_KEY || !config.SENDGRID_API_KEY.startsWith('SG.')) {
    throw new Error('SENDGRID_API_KEY is missing/invalid in production');
  }
  sendGridMail.setApiKey(config.SENDGRID_API_KEY);
}

class MailTransport {
  public async sendEmail(
    receiverEmail: string,
    subject: string,
    body: string
  ): Promise<void> {
    try {
      if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
        await this.developmentEmailSender(receiverEmail, subject, body);
      } else if (config.NODE_ENV === 'production') {
        await this.productionEmailSender(receiverEmail, subject, body);
      } else {
        await this.developmentEmailSender(receiverEmail, subject, body);
      }
    } catch (error) {
      log.error({ err: error }, 'Error sending email');
      throw new BadRequestError('Error sending email');
    }
  }

  private async developmentEmailSender(
    receiverEmail: string,
    subject: string,
    body: string
  ): Promise<void> {
    if (!config.SENDER_EMAIL || !config.SENDER_EMAIL_PASSWORD) {
      throw new Error('SENDER_EMAIL / SENDER_EMAIL_PASSWORD missing for dev/test');
    }

    const transporter: Mail = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: config.SENDER_EMAIL,
        pass: config.SENDER_EMAIL_PASSWORD,
      },
    });

    const mailOptions: IMailOptions = {
      from: `Chatty App <${config.SENDER_EMAIL}>`,
      to: receiverEmail,
      subject,
      html: body,
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    log.info(
      { messageId: info.messageId, previewUrl },
      'Development email sent successfully'
    );
  }

  private async productionEmailSender(
    receiverEmail: string,
    subject: string,
    body: string
  ): Promise<void> {
    if (!config.SENDER_EMAIL) {
      throw new Error('SENDER_EMAIL missing in production');
    }

    const mailOptions: IMailOptions = {
      from: `Chatty App <${config.SENDER_EMAIL}>`,
      to: receiverEmail,
      subject,
      html: body,
    };

    await sendGridMail.send(mailOptions);
    log.info({ to: receiverEmail, subject }, 'Production email sent successfully');
  }
}

export const mailTransport: MailTransport = new MailTransport();
