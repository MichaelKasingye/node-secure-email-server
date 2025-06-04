require('dotenv').config();

const nodemailer = require('nodemailer');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const dns = require('dns').promises;

const app = express();
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Rate limiting to prevent abuse
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many emails sent from this IP, please try again later.'
});

// Email configuration with proper authentication
// const createTransporter = () => {
//   // For production, use your SMTP provider (SendGrid, Mailgun, etc.)
//   return nodemailer.createTransporter({
//     host: process.env.SMTP_HOST || 'smtp.gmail.com',
//     port: 587,
//     secure: false, // true for 465, false for other ports
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS // Use app-specific password for Gmail
//     },
//     // Enable DKIM signing
//     dkim: {
//       domainName: process.env.DOMAIN_NAME,
//       keySelector: 'default',
//       privateKey: process.env.DKIM_PRIVATE_KEY
//     }
//   });
// };
const createTransporter = () => {
    // For production, use your SMTP provider (SendGrid, Mailgun, etc.)
    return nodemailer.createTransport({ // <--- Changed createTransporter to createTransport
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use app-specific password for Gmail
      },
      // Enable DKIM signing
      dkim: {
        domainName: process.env.DOMAIN_NAME,
        keySelector: 'default',
        privateKey: process.env.DKIM_PRIVATE_KEY
      }
    });
  };

// Validate email addresses
const validateEmail = (email) => {
  return validator.isEmail(email) && !validator.isIn(email.toLowerCase(), [
    'test@test.com',
    'example@example.com',
    'admin@admin.com'
  ]);
};

// Check if domain has MX record (exists)
const validateDomain = async (email) => {
  try {
    const domain = email.split('@')[1];
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords.length > 0;
  } catch (error) {
    return false;
  }
};

// Anti-spam email content validation
const validateEmailContent = (subject, text, html) => {
  const spamKeywords = [
    'free money', 'click here now', 'urgent action required',
    'congratulations you won', 'limited time offer', 'act now',
    'make money fast', 'no obligation', 'risk free'
  ];
  
  const content = `${subject} ${text} ${html}`.toLowerCase();
  const suspiciousCount = spamKeywords.filter(keyword => 
    content.includes(keyword)
  ).length;
  
  // Reject if too many spam keywords
  if (suspiciousCount > 2) {
    return false;
  }
  
  // Check for excessive capitalization
  const caps = (subject + text).match(/[A-Z]/g) || [];
  const total = (subject + text).length;
  if (caps.length / total > 0.3) {
    return false;
  }
  
  return true;
};

// Create professional email template
const createEmailTemplate = (content, type = 'notification') => {
  const templates = {
    notification: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Notification</h2>
          <div style="background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #3498db;">
            ${content}
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>This email was sent from ${process.env.DOMAIN_NAME || 'your-domain.com'}</p>
            <p>If you received this email in error, please ignore it.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    transactional: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          ${content}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This is a transactional email from ${process.env.DOMAIN_NAME || 'your-domain.com'}
          </p>
        </div>
      </body>
      </html>
    `
  };
  
  return templates[type] || templates.notification;
};

// Main email sending function
const sendEmail = async (emailData) => {
  const transporter = createTransporter();
  
  const {
    to,
    cc = [],
    bcc = [],
    subject,
    text,
    html,
    templateType = 'notification',
    attachments = []
  } = emailData;
  
  // Validate all recipients
  const allRecipients = [to, ...cc, ...bcc].filter(Boolean);
  for (const email of allRecipients) {
    if (!validateEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }
    
    const domainValid = await validateDomain(email);
    if (!domainValid) {
      throw new Error(`Invalid domain for email: ${email}`);
    }
  }
  
  // Validate content
  if (!validateEmailContent(subject, text, html || '')) {
    throw new Error('Email content appears to be spam-like');
  }
  
  // Prepare email content
  const finalHtml = html || createEmailTemplate(text.replace(/\n/g, '<br>'), templateType);
  
  const mailOptions = {
    from: {
      name: process.env.FROM_NAME || 'Your App',
      address: process.env.FROM_EMAIL || process.env.EMAIL_USER
    },
    to,
    cc: cc.length > 0 ? cc : undefined,
    bcc: bcc.length > 0 ? bcc : undefined,
    subject,
    text,
    html: finalHtml,
    attachments,
    // Anti-spam headers
    headers: {
      'X-Mailer': 'NodeJS Email Server v1.0',
      'X-Priority': '3',
      'List-Unsubscribe': `<mailto:unsubscribe@${process.env.DOMAIN_NAME}>`,
      'Message-ID': `<${Date.now()}.${Math.random()}@${process.env.DOMAIN_NAME}>`
    },
    // Enable tracking
    trackingSettings: {
      clickTracking: { enable: false },
      openTracking: { enable: false }
    }
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// API Routes
app.post('/send-email', emailLimiter, async (req, res) => {
  try {
    const result = await sendEmail(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk email endpoint (with additional restrictions)
app.post('/send-bulk', emailLimiter, async (req, res) => {
  const { emails, template } = req.body;
  
  if (!Array.isArray(emails) || emails.length > 10) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 10 emails allowed per bulk request'
    });
  }
  
  const results = [];
  
  for (const emailData of emails) {
    try {
      const result = await sendEmail({ ...emailData, ...template });
      results.push({ email: emailData.to, success: true, messageId: result.messageId });
      
      // Small delay between emails to avoid being flagged
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({ email: emailData.to, success: false, error: error.message });
    }
  }
  
  res.json({ results });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
  console.log('Required environment variables:');
  console.log('- EMAIL_USER: Your SMTP username');
  console.log('- EMAIL_PASS: Your SMTP password');
  console.log('- DOMAIN_NAME: Your domain (for DKIM)');
  console.log('- DKIM_PRIVATE_KEY: Your DKIM private key');
  console.log('- FROM_EMAIL: Your from email address');
  console.log('- FROM_NAME: Your from name');
});

module.exports = { app, sendEmail };