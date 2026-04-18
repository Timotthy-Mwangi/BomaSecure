import axios from 'axios';

const SMS_API_BASE_URL = process.env.REACT_APP_SMS_BASE_URL || 'https://smsportal.hostpinnacle.co.ke';

/**
 * SmsService handles communication with the HostPinnacle SMS Gateway.
 * 
 * SECURITY NOTE: In production, it is highly recommended to proxy these calls 
 * through your own backend to prevent exposing SMS credentials in the browser.
 */
class SmsService {
  constructor() {
    this.api = axios.create({
      baseURL: SMS_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Sends a standard SMS message.
   * @param {Object} params
   * @param {string} params.mobile - Recipient (e.g., 2547XXXXXXXX)
   * @param {string} params.msg - Content
   * @param {string} [params.senderid] - Approved Sender ID
   */
  async sendSMS({ mobile, msg, senderid = 'BomaSecure' }) {
    const payload = {
      userid: process.env.REACT_APP_SMS_USERID,
      password: process.env.REACT_APP_SMS_PASSWORD,
      mobile,
      msg,
      senderid,
      msgtype: 'text',
      duplicate: 'true'
    };

    try {
      const response = await this.api.post('/SMSApi/send', payload);
      return response.data;
    } catch (error) {
      console.error('[SmsService] SMS Send failed:', error);
      throw error;
    }
  }

  /**
   * Generates a One-Time Password (OTP) for phone verification.
   */
  async generateOTP(mobile) {
    try {
      const response = await this.api.post('/SMSApi/otp/generate', { mobile });
      return response.data;
    } catch (error) {
      console.error('[SmsService] OTP Generation failed:', error);
      throw error;
    }
  }

  /**
   * Verifies an OTP provided by the user.
   */
  async verifyOTP(mobile, otp) {
    const response = await this.api.post('/SMSApi/otp/verify', { mobile, otp });
    return response.data;
  }
}

const smsService = new SmsService();
export default smsService;