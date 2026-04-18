// Contact Service for Direct Calls and Emails (Replacing SMS)

const axios = require('axios');
// Email Configuration (e.g., using SendGrid, Mailgun, or Nodemailer)
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';

// Voice/Call Configuration (e.g., using Twilio or Africa's Talking Voice)
const CALL_API_KEY = process.env.CALL_API_KEY || '';

/**
 * Send an email notification
 */
const sendEmail = async (to, subject, htmlContent) => {
  try {
    console.log(`[EMAIL] Sending email to ${to} with subject: ${subject}`);
    // Implementation would go here (e.g., axios call to email provider)
    return { success: true, messageId: 'email_' + Date.now() };
  } catch (error) {
    console.error('[EMAIL ERROR]', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Initiate a direct voice call
 */
const makeDirectCall = async (to, message) => {
  try {
    console.log(`[CALL] Initiating direct call to ${to} with message: ${message}`);
    // Implementation would go here (e.g., Twilio Voice API)
    return { success: true, callSid: 'call_' + Date.now() };
  } catch (error) {
    console.error('[CALL ERROR]', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send an SMS (Fallback to voice call during transition)
 */
const sendSMS = async (to, message) => {
  console.log(`[SMS-FALLBACK] Routing message to voice call for ${to}`);
  return makeDirectCall(to, message);
};

// Visitor arrival notification to tenant (Via Direct Call)
const sendVisitorNotification = (tenantPhone, visitorName, purpose) => {
  const message = `Hello, this is BomaSecure. ${visitorName} is at the gate to see you for ${purpose}. Please check your app to approve or deny.`;
  return makeDirectCall(tenantPhone, message);
};

// Delivery arrival notification to tenant (Via Email and Call)
const sendDeliveryNotification = async (tenantPhone, tenantEmail, courierCompany, description) => {
  const message = `BomaSecure: ${courierCompany || 'A courier'} has a package for you: ${description}. Please collect it from security.`;
  
  const callResult = await makeDirectCall(tenantPhone, message);
  if (tenantEmail) {
    await sendEmail(tenantEmail, 'New Delivery Arrival', `<p>${message}</p>`);
  }
  return callResult;
};

const sendAccessGrantedNotification = (visitorPhone, visitorEmail, roomNumber) => {
  const message = `BomaSecure: Access granted to unit ${roomNumber}. Welcome!`;
  if (visitorEmail) {
    sendEmail(visitorEmail, 'Access Granted', `<p>${message}</p>`);
  }
  return makeDirectCall(visitorPhone, message);
};

const sendAccessDeniedNotification = (visitorPhone, visitorEmail, reason) => {
  const message = `BomaSecure: Access denied. Reason: ${reason || 'Not authorized'}.`;
  if (visitorEmail) {
    sendEmail(visitorEmail, 'Access Denied', `<p>${message}</p>`);
  }
  return makeDirectCall(visitorPhone, message);
};

// Send QR code + backup code to VISITOR via Email
const sendVisitorQRCode = async (visitorEmail, visitorName, roomNumber, qrCode, backupCode) => {
  const shortCode = backupCode || qrCode.slice(-8).toUpperCase();
  const html = `
    <h3>Hello ${visitorName},</h3>
    <p>Your visitor pass for Room ${roomNumber} is ready.</p>
    <p>Please use this backup code at the gate: <strong>${shortCode}</strong></p>
    <p>This pass is valid for 24 hours.</p>
  `;
  return sendEmail(visitorEmail, 'Your Visitor Pass', html);
};

// Send pickup info to TENANT for delivery pickup via Email and Call
const sendDeliveryQRCode = async (tenantPhone, tenantEmail, tenantName, roomNumber, qrCode, backupCode, courierCompany) => {
  const shortCode = backupCode || qrCode.slice(-8).toUpperCase();
  const message = `Hi ${tenantName}, ${courierCompany || 'A courier'} left a package for Room ${roomNumber}. Your pickup code is ${shortCode}.`;
  
  const callResult = await makeDirectCall(tenantPhone, message);
  if (tenantEmail) {
    await sendEmail(tenantEmail, 'Package Delivery Notification', `<p>${message}</p>`);
  }
  return callResult;
};

module.exports = {
  sendEmail,
  makeDirectCall,
  sendVisitorNotification,
  sendDeliveryNotification,
  sendAccessGrantedNotification,
  sendAccessDeniedNotification,
  sendVisitorQRCode,
  sendDeliveryQRCode,
  sendSMS
};
