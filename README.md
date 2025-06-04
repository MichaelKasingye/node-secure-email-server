# Email Server Documentation

This document provides a comprehensive guide to setting up and using the Node.js email server. This server leverages Nodemailer for email sending, Express for API endpoints, and includes features like rate limiting, email validation, and professional templating to ensure secure and reliable email delivery.

## Table of Contents
1. [Introduction](#introduction)
2. [Features](#features)
3. [Prerequisites](#prerequisites)
4. [Setup Guide](#setup-guide)
    - [Step 1: Clone the Repository (if applicable)](#step-1-clone-the-repository-if-applicable)
    - [Step 2: Install Dependencies](#step-2-install-dependencies)
    - [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
    - [Step 4: Generate DKIM Keys (Optional but Recommended)](#step-4-generate-dkim-keys-optional-but-recommended)
    - [Step 5: Verify Sender Domain (SPF, DKIM, DMARC)](#step-5-verify-sender-domain-spf-dkim-dmarc)
5. [Running the Server](#running-the-server)
6. [API Endpoints](#api-endpoints)
    - [`POST /send-email`](#post-send-email)
    - [`POST /send-bulk`](#post-send-bulk)
    - [`GET /health`](#get-health)
7. [Email Service Provider (SMTP) Configuration](#email-service-provider-smtp-configuration)
    - [Recommended: Dedicated Email Service (SendGrid, Mailgun, AWS SES, Postmark)](#recommended-dedicated-email-service-sendgrid-mailgun-aws-ses-postmark)
    - [Using Gmail for Testing (Not Recommended for Production)](#using-gmail-for-testing-not-recommended-for-production)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)
10. [Customization](#customization)
    - [Email Templates](#email-templates)
    - [Spam Keyword List](#spam-keyword-list)
    - [Rate Limiting](#rate-limiting)
11. [License](#license)

## 1. Introduction

This Node.js email server provides a robust and secure way to send transactional and notification emails. It's designed with best practices in mind, including:

* **Security:** Uses `helmet` for HTTP header security and secure environment variable handling.
* **Deliverability:** Supports DKIM signing, includes email and domain validation, and provides professional email templates.
* **Anti-Spam:** Implements basic content validation to prevent sending suspicious emails.
* **Rate Limiting:** Protects against abuse and helps maintain a good sending reputation.
* **Scalability:** Built with Nodemailer's connection pooling in mind for higher volumes.

## 2. Features

* **Secure SMTP Integration:** Configurable with various SMTP providers.
* **Email Validation:** Checks for valid email format and domain existence (MX records).
* **Anti-Spam Content Filter:** Identifies and rejects emails with suspicious content (keywords, excessive capitalization).
* **Professional Email Templates:** Built-in responsive HTML templates for notifications and transactional emails.
* **Rate Limiting:** Prevents abuse of the `/send-email` and `/send-bulk` endpoints.
* **DKIM Signing:** Enhances email deliverability and sender authentication.
* **Bulk Sending:** Dedicated endpoint for sending multiple emails in a single request (with limits).
* **Health Check Endpoint:** For monitoring server status.
* **Environment Variable Configuration:** Securely manages sensitive information.

## 3. Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js:** v14.x or higher (LTS recommended).
* **npm:** (Comes with Node.js).

## 4. Setup Guide

Follow these steps to get the email server up and running.

### Step 1: Clone the Repository (if applicable)

If your code is in a Git repository, clone it:

```bash
git clone <your-repository-url>
cd <your-repository-name>
```

Otherwise, ensure you have all the project files in a directory.

### Step 2: Install Dependencies

Navigate to your project directory and install the required Node.js packages:

```bash
npm install express nodemailer dotenv express-rate-limit helmet validator dns
```

### Step 3: Configure Environment Variables

Create a file named `.env` in the root of your project directory. This file will store your sensitive configuration details.

```dotenv
# --- General Server Configuration ---
PORT=3000

# --- SMTP Configuration ---
# Choose your SMTP provider (e.g., smtp.sendgrid.net, smtp.mailgun.org, smtp.gmail.com)
SMTP_HOST=your_smtp_host
# Port 587 (STARTTLS) is recommended. Port 465 (SMTPS) is also common.
SMTP_PORT=587 
# Set to 'true' for port 465, 'false' for port 587 (STARTTLS)
SMTP_SECURE=false 

EMAIL_USER=your_smtp_username # e.g., apikey for SendGrid, your_email@domain.com for Gmail
EMAIL_PASS=your_smtp_password_or_api_key # e.g., SendGrid API Key, Gmail App Password

# --- Sender Information ---
FROM_EMAIL=your_sending_email@your_domain.com # Must be verified with your SMTP provider
FROM_NAME="Your Application Name"

# --- DKIM Configuration (Optional but HIGHLY Recommended for Deliverability) ---
# Your domain name (e.g., your_domain.com)
DOMAIN_NAME=your_domain.com 
# The DKIM key selector (e.g., 'default', 'sg') - check your DKIM setup instructions
DKIM_KEY_SELECTOR=default
# Your DKIM Private Key (ensure it's correctly formatted, including line breaks if needed)
# If your key has newlines, replace them with \\n in the .env file.
# Example: DKIM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhki..."
DKIM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n\nYOUR_DKIM_PRIVATE_KEY_HERE\n\n-----END PRIVATE KEY-----"
```

**Important Notes for `.env`:**

* Replace placeholder values with your actual credentials.

* **`SMTP_SECURE`**: Set to `true` if your SMTP provider uses SSL/TLS on port 465 from the start of the connection. Set to `false` for port 587, where the connection starts insecure but is then upgraded using STARTTLS.

* **`EMAIL_PASS`**: For Gmail, this MUST be an [App Password](https://support.google.com/accounts/answer/185833) if you have 2-Step Verification enabled. Your regular Gmail password will not work.

* **`FROM_EMAIL`**: This email address should ideally match the verified sender identity in your chosen SMTP service.

* **`DKIM_PRIVATE_KEY`**: This is a multi-line string. If pasting into a `.env` file, ensure newlines are represented correctly (e.g., `\n` or `\\n` depending on how your system reads it, or read the key from a separate file as a best practice for production). The code includes a `.replace(/\\n/g, '\n')` to help with common `\n` issues.

### Step 4: Generate DKIM Keys (Optional but Recommended)

DKIM is essential for email deliverability. If you don't have DKIM keys for your sending domain, you'll need to generate them. Many SMTP providers (like SendGrid, Mailgun) will provide the public key for you to add to your DNS, and sometimes the private key.

If you need to generate your own (advanced users):
You can use tools like `openssl` to generate RSA keys.

```bash
# Generate a 1024-bit private key
openssl genrsa -out dkim_private_key.pem 1024

# Extract the public key
openssl rsa -in dkim_private_key.pem -pubout -out dkim_public_key.pem
```

The content of `dkim_private_key.pem` goes into `DKIM_PRIVATE_KEY` in your `.env`. The content of `dkim_public_key.pem` needs to be formatted for a DNS TXT record. Your `DOMAIN_NAME` and `DKIM_KEY_SELECTOR` should match your DNS record.

### Step 5: Verify Sender Domain (SPF, DKIM, DMARC)

This is a critical step for ensuring your emails land in the inbox and not spam. You need to configure DNS records for the `DOMAIN_NAME` you are sending from.

1.  **SPF (Sender Policy Framework):** Add a TXT record to your domain's DNS. This record specifies which mail servers are authorized to send email on behalf of your domain.
    * **Example (for SendGrid):** `v=spf1 include:sendgrid.net ~all`
    * Consult your SMTP provider's documentation for their specific SPF record.
2.  **DKIM (DomainKeys Identified Mail):** Your SMTP provider will give you a public key (or instructions to generate one) that you'll add as a TXT record in your DNS. This works with the `DKIM_PRIVATE_KEY` in your `.env` to sign outgoing emails.
    * The TXT record name often includes your `DKIM_KEY_SELECTOR` (e.g., `s1._domainkey.your_domain.com`).
3.  **DMARC (Domain-based Message Authentication, Reporting, and Conformance):** Add a TXT record to your domain's DNS. This record tells receiving mail servers how to handle emails that fail SPF or DKIM checks.
    * **Example:** `v=DMARC1; p=quarantine; fo=1; ruf=mailto:dmarc-reports@your_domain.com; rua=mailto:dmarc-agg-reports@your_domain.com`
    * You can start with `p=none` for monitoring, then move to `p=quarantine` or `p=reject`.

Use online tools like [mxtoolbox.com](https://mxtoolbox.com/spf.aspx) or [dmarcian.com](https://dmarcian.com/dmarc-tools/spf-dkim-dmarc-check/) to verify your DNS records after setting them up.

## 5. Running the Server

Once all dependencies are installed and environment variables are configured, you can start the server:

```bash
node server.js
# Or if your main file is named app.js
node app.js
```

You should see output similar to this:

```
Email server running on port 3000
Required environment variables:
- EMAIL_USER: Your SMTP username
- EMAIL_PASS: Your SMTP password
- DOMAIN_NAME: Your domain (for DKIM)
- DKIM_PRIVATE_KEY: Your DKIM private key
- FROM_EMAIL: Your from email address
- FROM_NAME: Your from name
```

The server will now be listening for requests on the specified `PORT` (default: 3000).

## 6. API Endpoints

The server exposes the following REST API endpoints for sending emails.

### `POST /send-email`

Sends a single email.

* **URL:** `/send-email`
* **Method:** `POST`
* **Request Body (JSON):**
    * `to` (String, **Required**): The primary recipient's email address.
    * `subject` (String, **Required**): The subject line of the email.
    * `text` (String, **Required**): The plain text content of the email.
    * `html` (String, *Optional*): The HTML content of the email. If not provided, the `text` content will be rendered into a basic HTML template.
    * `cc` (Array of Strings, *Optional*): An array of CC recipient email addresses.
    * `bcc` (Array of Strings, *Optional*): An array of BCC recipient email addresses.
    * `templateType` (String, *Optional*): The type of email template to use if `html` is not provided. Accepts `'notification'` (default) or `'transactional'`.
    * `attachments` (Array of Objects, *Optional*): An array of attachment objects. Each object should follow Nodemailer's [attachment options](https://nodemailer.com/message/attachments/).
        * Example attachment object: `{ filename: 'test.pdf', content: '...', contentType: 'application/pdf' }`

* **Rate Limit:** 5 requests per 15 minutes per IP address.

* **Example cURL Request:**

    ```bash
    curl -X POST http://localhost:3000/send-email \
      -H "Content-Type: application/json" \
      -d '{
        "to": "recipient@example.com",
        "subject": "Important Notification from Your App",
        "text": "Hello there!\n\nThis is a notification email sent from our secure email server.",
        "html": "<p>Hello there!</p><p>This is a <b>notification email</b> sent from our <b>secure email server</b>.</p>",
        "templateType": "notification",
        "cc": ["cc@example.com"],
        "attachments": [
          {
            "filename": "document.txt",
            "content": "SGVsbG8gV29ybGQh",
            "encoding": "base64",
            "contentType": "text/plain"
          }
        ]
      }'
    ```

* **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "messageId": "<unique-message-id@your-domain.com>",
      "accepted": ["recipient@example.com"],
      "rejected": []
    }
    ```

* **Error Response (400 Bad Request):**
    ```json
    {
      "success": false,
      "error": "Invalid email address: invalid@email"
    }
    ```json
    {
      "success": false,
      "error": "Email content appears to be spam-like"
    }
    ```json
    {
      "success": false,
      "error": "Too many emails sent from this IP, please try again later."
    }
    ```

### `POST /send-bulk`

Sends multiple emails in a single request. This endpoint has additional restrictions for safety.

* **URL:** `/send-bulk`
* **Method:** `POST`
* **Request Body (JSON):**
    * `emails` (Array of Objects, **Required**): An array of email data objects. Each object should have the same structure as the `send-email` endpoint's request body (i.e., `to`, `subject`, `text`, `html`, `cc`, `bcc`, `attachments`).
    * `template` (Object, *Optional*): A base template object whose properties (e.g., `templateType`) will be merged into each email in the `emails` array. Useful if all bulk emails share common settings.
* **Restrictions:**
    * Maximum 10 emails per bulk request.
    * A small delay (1 second) is introduced between sending each email to reduce the risk of being flagged as spam.
* **Rate Limit:** Shared with `/send-email`, 5 requests per 15 minutes per IP address.

* **Example cURL Request:**

    ```bash
    curl -X POST http://localhost:3000/send-bulk \
      -H "Content-Type: application/json" \
      -d '{
        "emails": [
          {
            "to": "user1@example.com",
            "subject": "Bulk Email 1",
            "text": "This is the first bulk email."
          },
          {
            "to": "user2@example.com",
            "subject": "Bulk Email 2",
            "text": "This is the second bulk email."
          }
        ],
        "template": {
            "templateType": "transactional"
        }
      }'
    ```

* **Success Response (200 OK):**
    ```json
    {
      "results": [
        {
          "email": "user1@example.com",
          "success": true,
          "messageId": "<message-id-1>"
        },
        {
          "email": "user2@example.com",
          "success": false,
          "error": "Email content appears to be spam-like"
        }
      ]
    }
    ```

* **Error Response (400 Bad Request):**
    ```json
    {
      "success": false,
      "error": "Maximum 10 emails allowed per bulk request"
    }
    ```

### `GET /health`

Provides a simple health check for the server.

* **URL:** `/health`
* **Method:** `GET`

* **Example cURL Request:**

    ```bash
    curl http://localhost:3000/health
    ```

* **Success Response (200 OK):**
    ```json
    {
      "status": "healthy",
      "timestamp": "2025-06-04T13:10:00.000Z"
    }
    ```

## 7. Email Service Provider (SMTP) Configuration

Choosing the right SMTP provider is crucial for reliable email delivery.

### Recommended: Dedicated Email Service (SendGrid, Mailgun, AWS SES, Postmark)

For production environments and high-volume sending, it is highly recommended to use a dedicated email service. They offer superior deliverability, analytics, and support for managing email reputation.

* **Advantages:** Higher sending limits, better deliverability, built-in analytics, dedicated support, and automated handling of bounces/complaints.
* **Configuration:**
    1.  Sign up for an account with your chosen provider (e.g., SendGrid).
    2.  Obtain your **SMTP Host**, **Port**, **Username** (often `apikey` for API keys), and **Password** (your API Key).
    3.  **Verify your sender identity/domain** within their platform. This typically involves adding SPF, DKIM, and sometimes DMARC records to your domain's DNS.
    4.  Update your `.env` file with these details.

### Using Gmail for Testing (Not Recommended for Production)

While convenient for testing, using a standard Gmail account's SMTP for a production application is **not recommended** due to:

* **Low Sending Limits:** Gmail accounts have strict daily sending limits.
* **Deliverability Issues:** Emails might be flagged as spam more often.
* **Security Concerns:** Relies on individual account security settings.

* **Configuration for Gmail (for testing only):**
    1.  **Enable 2-Step Verification** on your Google Account.
    2.  Generate an **App Password** for your Node.js application. This will be your `EMAIL_PASS`.
    3.  **`SMTP_HOST`**: `smtp.gmail.com`
    4.  **`SMTP_PORT`**: `587`
    5.  **`SMTP_SECURE`**: `false` (for STARTTLS)
    6.  **`EMAIL_USER`**: Your full Gmail address (e.g., `your.email@gmail.com`)
    7.  **`EMAIL_PASS`**: The generated App Password.
    8.  **`FROM_EMAIL`**: Should be the same as your `EMAIL_USER` for best results.
    9.  It's best to **comment out or remove the `DKIM_PRIVATE_KEY` and `DOMAIN_NAME`** from your `.env` if you're purely sending from a `@gmail.com` address, as Google handles DKIM for its own domains.

## 8. Security Considerations

* **Environment Variables:** Never hardcode credentials in your code. Always use environment variables as shown in this documentation.
* **Input Validation:** The server includes basic validation for email addresses and and content. However, ensure that any data passed to the API endpoints from client-side or external sources is also properly sanitized and validated on the client-side to prevent injection attacks or malformed requests.
* **Rate Limiting:** The `express-rate-limit` middleware is essential for preventing abuse. Adjust `max` and `windowMs` as needed for your application's requirements.
* **Error Handling:** The server includes a basic error handling middleware. For production, consider more sophisticated error logging and reporting.
* **HTTPS:** For production deployments, always serve your application over HTTPS using a reverse proxy (e.g., Nginx, Apache) or a service like AWS ELB. This encrypts traffic between your clients and the server.
* **Least Privilege:** Configure your SMTP user with the minimum necessary permissions required for sending emails.

## 9. Troubleshooting

* **"nodemailer.createTransporter is not a function"**: Ensure you're using `nodemailer.createTransport` (correct) not `nodemailer.createTransporter` (incorrect).
* **Emails not arriving / Landing in Spam:**
    * **Check Spam/Junk folders:** This is the most common issue.
    * **Verify `.env` values:** Double-check `EMAIL_USER`, `EMAIL_PASS`, `SMTP_HOST`, `SMTP_PORT`, `FROM_EMAIL`.
    * **App Passwords for Gmail:** If using Gmail, confirm you're using an App Password.
    * **Sender Domain Verification (SPF, DKIM, DMARC):** This is critical. Use tools like `mxtoolbox.com` to check your domain's DNS records. If these are not configured correctly for your `FROM_EMAIL` domain, emails will likely go to spam or be rejected.
    * **`FROM_EMAIL` vs `EMAIL_USER`:** Ensure `FROM_EMAIL` matches your `EMAIL_USER` (especially for Gmail) or is a domain properly configured with your SMTP provider.
    * **Email Content:** Simplify email content for testing. Avoid spammy keywords, excessive capitalization, or suspicious links/attachments.
    * **SMTP Provider Logs:** Check the logs or dashboard of your SMTP service (SendGrid, Mailgun, etc.) for detailed error messages or delivery status.
    * **Firewall:** Ensure outgoing port 587 (or 465) is not blocked by your server's firewall or hosting provider.
* **"Invalid email address" / "Invalid domain"**: The validation functions are working. Check the recipient email addresses for typos or non-existent domains.
* **"Email content appears to be spam-like"**: The anti-spam filter caught something. Review the subject, text, and HTML for spam keywords or excessive capitalization.
* **"Too many emails sent from this IP"**: You've hit the rate limit. Wait for the `windowMs` (15 minutes) to reset.

## 10. Customization

### Email Templates

The `createEmailTemplate` function defines two basic HTML templates: `notification` and `transactional`.

* **To add new templates:**
    1.  Add a new key-value pair to the `templates` object within `createEmailTemplate`.
    2.  Define your custom HTML structure for the new template.
    3.  You can then use your new `templateType` in your API requests.
* **To modify existing templates:**
    1.  Edit the HTML content within the `templates` object directly.
    2.  Remember to keep them responsive and widely compatible with email clients.

### Spam Keyword List

The `spamKeywords` array in `validateEmailContent` can be customized.

* **To add/remove keywords:** Modify the `spamKeywords` array to suit your specific needs.
* **Adjust `suspiciousCount` threshold:** Change the `if (suspiciousCount > 2)` condition to be more or less strict.
* **Adjust capitalization threshold:** Modify `if (caps.length / total > 0.3)` to be more or less strict.

### Rate Limiting

The `emailLimiter` configuration can be adjusted:

* **`windowMs`**: The time window in milliseconds (e.g., `15 * 60 * 1000` for 15 minutes).
* **`max`**: The maximum number of requests allowed within the `windowMs`.
* **`message`**: The error message returned when the limit is exceeded.

Adjust these values in the `app.js` (or `server.js`) file based on your application's expected traffic and security needs.
