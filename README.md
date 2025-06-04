
# Email Server Documentation

This document provides a comprehensive guide to setting up and using the Node.js email server. This server leverages Nodemailer for email sending, Express for API endpoints, and includes features like rate limiting, email validation, and professional templating to ensure secure and reliable email delivery.

## Table of Contents
1. [Introduction](#introduction)  
2. [Features](#features)  
3. [Prerequisites](#prerequisites)  
4. [Setup Guide](#setup-guide)  
    - [Step 1: Clone the Repository](#step-1-clone-the-repository)  
    - [Step 2: Install Dependencies](#step-2-install-dependencies)  
    - [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)  
    - [Step 4: Generate DKIM Keys](#step-4-generate-dkim-keys)  
    - [Step 5: Verify Sender Domain](#step-5-verify-sender-domain)  
5. [Running the Server](#running-the-server)  
6. [API Endpoints](#api-endpoints)  
    - [POST /send-email](#post-send-email)  
    - [POST /send-bulk](#post-send-bulk)  
    - [GET /health](#get-health)  
7. [Email Service Provider (SMTP) Configuration](#email-service-provider-smtp-configuration)  
8. [Security Considerations](#security-considerations)  
9. [Troubleshooting](#troubleshooting)  
10. [Customization](#customization)  
     - [Email Templates](#email-templates)  
     - [Spam Keyword List](#spam-keyword-list)  
     - [Rate Limiting](#rate-limiting)  
11. [License](#license)  



## 1. Introduction
This Node.js email server provides a robust and secure way to send transactional and notification emails. It's designed with best practices in mind, including:

- **Security**: Uses `helmet` for HTTP header security and secure environment variable handling.  
- **Deliverability**: Supports DKIM signing, includes email and domain validation, and provides professional email templates.  
- **Anti-Spam**: Implements basic content validation to prevent sending suspicious emails.  
- **Rate Limiting**: Protects against abuse and helps maintain a good sending reputation.  
- **Scalability**: Built with Nodemailer's connection pooling in mind for higher volumes.  


## 2. Features
- **Secure SMTP Integration**: Configurable with various SMTP providers.  
- **Email Validation**: Checks for valid email format and domain existence (MX records).  
- **Anti-Spam Content Filter**: Identifies and rejects emails with suspicious content.  
- **Professional Email Templates**: Built-in responsive HTML templates for notifications and transactional emails.  
- **Rate Limiting**: Prevents abuse of the `/send-email` and `/send-bulk` endpoints.  
- **DKIM Signing**: Enhances email deliverability and sender authentication.  
- **Bulk Sending**: Dedicated endpoint for sending multiple emails in a single request.  
- **Health Check Endpoint**: For monitoring server status.  
- **Environment Variable Configuration**: Securely manages sensitive information.  


## 3. Prerequisites
Before you begin, ensure you have the following installed:  
- **Node.js**: v14.x or higher (LTS recommended).  
- **npm**: (Comes with Node.js).  



## 4. Setup Guide

### Step 1: Clone the Repository
If your code is in a Git repository, clone it:  
```bash
git clone <your-repository-url>
cd <your-repository-name>
```

### Step 2: Install Dependencies
Navigate to your project directory and install the required Node.js packages:  
```bash
npm install express nodemailer dotenv express-rate-limit helmet validator dns
```

### Step 3: Configure Environment Variables
Create a `.env` file in the root of your project directory. Example:  
```env
PORT=3000
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your_smtp_username
EMAIL_PASS=your_smtp_password_or_api_key
FROM_EMAIL=your_sending_email@your_domain.com
FROM_NAME="Your Application Name"
DOMAIN_NAME=your_domain.com
DKIM_KEY_SELECTOR=default
DKIM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_DKIM_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
```

### Step 4: Generate DKIM Keys
Generate DKIM keys using tools like `openssl`:  
```bash
openssl genrsa -out dkim_private_key.pem 1024
openssl rsa -in dkim_private_key.pem -pubout -out dkim_public_key.pem
```

### Step 5: Verify Sender Domain
Configure DNS records for SPF, DKIM, and DMARC. Example:  
- **SPF**: `v=spf1 include:sendgrid.net ~all`  
- **DKIM**: Add the public key to your DNS.  
- **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:dmarc-agg-reports@your_domain.com`  



## 5. Running the Server
Start the server:  
```bash
node server.js
```



## 6. API Endpoints

### POST /send-email
Sends a single email.  
- **Request Body**:  
  ```json
  {
     "to": "recipient@example.com",
     "subject": "Subject",
     "text": "Plain text content",
     "html": "<p>HTML content</p>"
  }
  ```
- **Rate Limit**: 5 requests per 15 minutes.  

### POST /send-bulk
Sends multiple emails in a single request.  
- **Request Body**:  
  ```json
  {
     "emails": [
        { "to": "user1@example.com", "subject": "Subject 1", "text": "Content 1" },
        { "to": "user2@example.com", "subject": "Subject 2", "text": "Content 2" }
     ]
  }
  ```
- **Limit**: Max 10 emails per request.  

### GET /health
Checks server health.  
- **Response**:  
  ```json
  { "status": "healthy", "timestamp": "2025-06-04T13:10:00.000Z" }
  ```



## 7. Email Service Provider (SMTP) Configuration
- **Recommended**: Use dedicated services like SendGrid, Mailgun, AWS SES.  
- **Testing**: Gmail can be used for testing but is not recommended for production.  



## 8. Security Considerations
- Use environment variables for sensitive data.  
- Enable HTTPS for production.  
- Implement proper input validation and rate limiting.  



## 9. Troubleshooting
- **Emails not arriving**: Check spam folders, DNS records, and SMTP logs.  
- **Rate limit exceeded**: Wait for the reset window.  



## 10. Customization

### Email Templates
Modify or add templates in the `createEmailTemplate` function.  

### Spam Keyword List
Update the `spamKeywords` array in `validateEmailContent`.  

### Rate Limiting
Adjust `windowMs` and `max` in the rate limiter configuration.  



