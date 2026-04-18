const { Payment, User, Apartment } = require('../models');
const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const axios = require('axios');

const checkAndApplyFreePlanRestriction = async (user, suggestedPlanType) => {
  if (suggestedPlanType !== 'free') return suggestedPlanType;

  // Check if user has an apartment
  if (!user.apartmentId) return suggestedPlanType;

  try {
    const apartment = await Apartment.findById(user.apartmentId);
    if (apartment?.subscription?.hasUsedFreePlan) {
      // Account already used free plan - convert to standard instead
      return 'standard';
    }

    // Mark apartment as having used free plan
    apartment.subscription = apartment.subscription || {};
    apartment.subscription.hasUsedFreePlan = true;
    apartment.subscription.freePlanUsedAt = new Date();
    await apartment.save();
  } catch (err) {
    console.error('Error checking free plan usage:', err);
  }

  return suggestedPlanType;
};

// Helper to get subaccount code for automatic split
const getSubaccountCode = async (apartmentId, userId) => {
  try {
    // First try to get from apartment
    if (apartmentId) {
      const apartment = await Apartment.findById(apartmentId);
      if (apartment?.paystackSubaccountCode) {
        return apartment.paystackSubaccountCode;
      }
    }

    // Fallback: get from user's apartment
    if (userId) {
      const user = await User.findById(userId);
      if (user?.apartmentId) {
        const apartment = await Apartment.findById(user.apartmentId);
        if (apartment?.paystackSubaccountCode) {
          return apartment.paystackSubaccountCode;
        }
      }
    }

    // Final fallback: use default from env
    return process.env.PAYSTACK_SUBACCOUNT_CODE || null;
  } catch (error) {
    console.error('Error getting subaccount code:', error);
    return process.env.PAYSTACK_SUBACCOUNT_CODE || null;
  }
};

// Plan-based revenue split configuration (rent commission rates)
const PLAN_REVENUE_SPLIT = {
  free: {
    platformFeePercent: 15,
    tenantSharePercent: 85,
    description: 'Free Trial - 15% commission on rent'
  },
  standard: {
    platformFeePercent: 5,
    tenantSharePercent: 95,
    description: 'Standard Plan - 5% commission on rent'
  },
  premium: {
    platformFeePercent: 0,
    tenantSharePercent: 100,
    description: 'Premium Plan - 0% commission on rent'
  }
};

// Helper to calculate revenue split based on plan
const calculateRevenueSplit = (amount, planType) => {
  const split = PLAN_REVENUE_SPLIT[planType] || PLAN_REVENUE_SPLIT.standard;
  const platformFee = Math.round((amount * split.platformFeePercent) / 100);
  const tenantShare = amount - platformFee;
  
  return {
    platformFeePercent: split.platformFeePercent,
    platformFeeAmount: platformFee,
    adminEarning: tenantShare,
    tenantSharePercent: split.tenantSharePercent,
    tenantShareAmount: tenantShare,
    planType
  };
};
const checkPaystackConfig = () => {
  const required = ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'];
  
  const missing = required.filter(key => !process.env[key] || process.env[key] === '');

  if (missing.length > 0) {
    console.error(`[PAYSTACK CONFIG ERROR] Missing variables: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

// STK Push using Paystack API (Mobile Money)
const initiateSTKPush = async (phone, amount, transactionId, apartmentId, userId) => {
  try {
    if (!checkPaystackConfig()) {
      return { success: false, error: 'Payment gateway not configured' };
    }

    const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;

    // Get subaccount code for revenue splitting
    const subaccountCode = await getSubaccountCode(apartmentId, userId);

    const transactionData = {
      email: `payment@${transactionId}.bomasecure.com`,
      amount: (amount * 100).toString(),
      currency: 'KES',
      metadata: {
        transactionId,
        phone: formattedPhone,
        paymentType: 'mobile_money'
      },
      channels: ['mobile_money'],
      callback_url: `${process.env.CLIENT_URL}/payment/callback`
    };

    // Add subaccount configuration for automatic splitting
    if (subaccountCode) {
      transactionData.bearer_type = 'subaccount';
      transactionData.subaccount = subaccountCode;
    }

    const response = await paystack.transaction.initialize(transactionData);

    if (response.status) {
      return {
        success: true,
        checkoutRequestId: response.data.reference,
        customerMessage: response.data.message || 'STK Push initiated via Paystack',
        authorizationUrl: response.data.authorization_url
      };
    }
    return { success: false, error: response.message || 'No data in Paystack response' };
  } catch (error) {
    const detailedError = error.response?.data?.message || error.message;
    console.error('Paystack STK Push Error:', detailedError);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

// Send M-Pesa STK Push
exports.initiateMpesaPayment = async (req, res) => {
  try {
    const { phoneNumber, amount, apartmentId, description } = req.body;
    const userId = req.user.userId;

    // Validate amount
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Robust phone formatting to 254XXXXXXXXX
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 9 && (cleanPhone.startsWith('7') || cleanPhone.startsWith('1'))) {
      cleanPhone = '254' + cleanPhone;
    }
    const formattedPhone = cleanPhone;

    // Create payment record
    const payment = new Payment({
      userId,
      apartmentId,
      amount: paymentAmount,
      currency: 'KES',
      paymentMethod: 'mpesa',
      phoneNumber: '+' + formattedPhone,
      description: description || 'BomaSecure Subscription Payment',
      status: 'processing',
      subaccountCode: await getSubaccountCode(apartmentId, userId),
      metadata: {
        transactionId: transactionId,
        phone: formattedPhone,
        paymentType: 'mobile_money'
      }
    });
    await payment.save();

    // Initiate STK Push using real M-Pesa API
    const stkResponse = await initiateSTKPush(formattedPhone, paymentAmount, payment.transactionId, apartmentId, userId);

    if (stkResponse.success) {
      // In production, payments are confirmed via mpesaCallback.
      // Auto-complete only for Dev/Demo environments.
      if (process.env.NODE_ENV === 'development' || process.env.AUTO_COMPLETE_PAYMENTS === 'true') {
        setTimeout(async () => {
          try {
            const baseRate = 1500;
            const months = Math.max(1, Math.floor(paymentAmount / baseRate));
            
            // Determine plan type based on amount
            let planType = 'standard';
            if (paymentAmount < 1500) {
              planType = 'free'; // Free trial
            } else if (paymentAmount >= 2250) {
              planType = 'premium';
            }
            
            // Check if account has already used free plan
            const user = await User.findById(userId);
            if (user) {
              planType = await checkAndApplyFreePlanRestriction(user, planType);
            }
            
            // Calculate revenue split
            const revenueSplit = calculateRevenueSplit(paymentAmount, planType);
            
            payment.status = 'completed';
            payment.mpesaReceiptNumber = `MPE${Date.now()}`;
            payment.paidAt = new Date();
            payment.revenueSplit = {
              ...revenueSplit,
              payoutStatus: 'pending'
};
             
            if (user) {
              const currentEnd = user.subscription?.endDate ? new Date(user.subscription.endDate) : new Date();
              currentEnd.setMonth(currentEnd.getMonth() + months);
              
              user.subscription = {
                plan: planType,
                planType: planType,
                startDate: new Date(),
                endDate: currentEnd,
                isActive: true
              };
              
              // Update tenant earnings if payout is enabled
              if (user.payoutSettings?.isEnabled && revenueSplit.tenantShareAmount > 0) {
                user.payoutSettings.pendingPayout = (user.payoutSettings.pendingPayout || 0) + revenueSplit.tenantShareAmount;
                user.payoutSettings.totalEarnings = (user.payoutSettings.totalEarnings || 0) + revenueSplit.tenantShareAmount;
              }
              
              await user.save();
            }
            
            await payment.save();
            
              const io = req.app.get('io');
              if (io) {
                const wsService = require('../services/websocketService');
                wsService.broadcastPaymentUpdate(io, userId, payment.toJSON());
                wsService.broadcastRentPayment(io, user.apartmentId, payment.toJSON());
              }
            
            const { sendSMS } = require('../services/smsService');
            await sendSMS(formattedPhone, `BomaSecure: Payment of KES ${paymentAmount} received. ${planType === 'free' ? 'Free trial active.' : planType === 'premium' ? 'Premium plan active - no platform fee.' : 'Standard plan active - 5% platform fee applies.'}`);
          } catch (err) {
            console.error('Auto-complete payment error:', err);
          }
        }, 2000);
      }

      res.json({
        success: true,
        message: 'STK Push initiated. Please complete payment on your phone.',
        payment: {
          transactionId: payment.transactionId,
          status: payment.status,
          amount: paymentAmount
        }
      });
    } else {
      payment.status = 'failed';
      await payment.save();
      res.status(400).json({ success: false, message: stkResponse.error || 'Failed to initiate STK Push' });
    }
  } catch (error) {
    console.error('M-Pesa Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment processing error' });
  }
};

// M-Pesa Callback (for real M-Pesa integration)
exports.mpesaCallback = async (req, res) => {
  try {
    const { Body } = req.body;
    
    if (Body?.stkCallback?.ResultCode === 0) {
      const callbackData = Body.stkCallback;
      const checkoutRequestId = callbackData.CheckoutRequestID;
      const metadata = callbackData.CallbackMetadata?.Item;
      const amount = callbackData.CallbackMetadata?.Item?.find(i => i.Name === 'Amount')?.Value;
      const phone = callbackData.CallbackMetadata?.Item?.find(i => i.Name === 'PhoneNumber')?.Value;
      
      // Find payment by checkout request ID or by most recent processing payment
      let payment = await Payment.findOne({ 
        status: 'processing',
        paymentMethod: 'mpesa' 
      }).sort({ createdAt: -1 });
      
      // If not found by checkout request ID, get the most recent processing payment
      if (!payment) {
        payment = await Payment.findOne({ status: 'processing' }).sort({ createdAt: -1 });
      }
      
      if (payment) {
        const baseRate = 1500;
        const months = Math.max(1, Math.floor(payment.amount / baseRate));
        
        // Determine plan type based on amount
        let planType = 'standard';
        if (payment.amount < 1500) {
          planType = 'free'; // Free trial
        } else if (payment.amount >= 2250) {
          planType = 'premium';
        }
        
        // Calculate revenue split
        const revenueSplit = calculateRevenueSplit(payment.amount, planType);
        
        payment.status = 'completed';
        payment.mpesaReceiptNumber = metadata?.find(i => i.Name === 'MpesaReceiptNumber')?.Value || `MPE${Date.now()}`;
        payment.paidAt = new Date();
        payment.metadata = {
          ...payment.metadata,
          checkoutRequestId,
          phone,
          amount
        };
        payment.revenueSplit = {
          ...revenueSplit,
          payoutStatus: 'pending'
        };
        await payment.save();

        // Update user subscription
        if (user) {
          const currentEnd = user.subscription?.endDate ? new Date(user.subscription.endDate) : new Date();
          currentEnd.setMonth(currentEnd.getMonth() + months);
          
          user.subscription = {
            plan: planType,
            planType: planType,
            startDate: new Date(),
            endDate: currentEnd,
            isActive: true
          };
          
          // Update tenant earnings if payout is enabled
          if (user.payoutSettings?.isEnabled && revenueSplit.tenantShareAmount > 0) {
            user.payoutSettings.pendingPayout = (user.payoutSettings.pendingPayout || 0) + revenueSplit.tenantShareAmount;
            user.payoutSettings.totalEarnings = (user.payoutSettings.totalEarnings || 0) + revenueSplit.tenantShareAmount;
          }
          
          await user.save();
          
          // Send SMS confirmation
          if (user.phone) {
            const { sendSMS } = require('../services/smsService');
            await sendSMS(user.phone, `BomaSecure: Payment of KES ${payment.amount} received. ${planType === 'free' ? 'Free trial active.' : planType === 'premium' ? 'Premium plan active - no platform fee.' : 'Standard plan active - 5% platform fee applies.'}`);
          }
        }
      }
    } else if (Body?.stkCallback?.ResultCode !== 0) {
      // Payment failed
      const payment = await Payment.findOne({ status: 'processing' }).sort({ createdAt: -1 });
      if (payment) {
        payment.status = 'failed';
        payment.metadata = {
          ...payment.metadata,
          failureReason: Body?.stkCallback?.ResultDesc
        };
        await payment.save();
      }
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('M-Pesa Callback Error:', error);
    res.status(500).json({ success: false, message: 'Callback processing error' });
  }
};

// Paystack Webhook Handler
exports.paystackWebhook = async (req, res) => {
  const crypto = require('crypto');
  
  try {
     const hash = crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body;
    const reference = event.data.reference;
    
    if (event.event === 'charge.success') {
      const payment = await Payment.findOne({ transactionId: reference });
      
      if (payment && payment.status === 'processing') {
        const baseRate = 1500;
        const months = Math.max(1, Math.floor(payment.amount / baseRate));
        
        // Determine plan type based on amount
        let planType = 'standard';
        if (payment.amount < 1500) {
          planType = 'free'; // Free trial
        } else if (payment.amount >= 2250) {
          planType = 'premium';
        }
        
        // Calculate revenue split
        const revenueSplit = calculateRevenueSplit(payment.amount, planType);
        
        payment.status = 'completed';
        payment.metadata.paystackRef = event.data.id;
        payment.metadata.cardRef = event.data.authorization?.authorization_code;
        payment.metadata.last4 = event.data.authorization?.last4;
        payment.paidAt = new Date();
        payment.revenueSplit = {
          ...revenueSplit,
          payoutStatus: 'pending'
        };
        await payment.save();

        // Create or update RentLedger record for rent payments
        if (payment.paymentType === 'rent') {
          try {
            const { RentLedger, User } = require('../models');
            const period = payment.rentPeriod || { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
            const user = await User.findById(payment.userId);
            
            const existingRecord = await RentLedger.findOne({
              tenantId: payment.userId,
              'period.month': period.month,
              'period.year': period.year
            });
            
            if (existingRecord) {
              existingRecord.amountPaid += payment.amount;
              existingRecord.balance = existingRecord.rentAmount - existingRecord.amountPaid;
              existingRecord.status = existingRecord.balance <= 0 ? 'paid' : existingRecord.balance < existingRecord.rentAmount ? 'partial' : 'pending';
              existingRecord.paymentMethod = payment.paymentMethod || 'card';
              existingRecord.reference = payment.transactionId;
              existingRecord.paidDate = existingRecord.status === 'paid' ? new Date() : existingRecord.paidDate;
              await existingRecord.save();
            } else if (user) {
              await RentLedger.create({
                tenantId: payment.userId,
                apartmentId: payment.apartmentId,
                unitNumber: user.roomNumber,
                period,
                rentAmount: payment.amount,
                amountPaid: payment.amount,
                balance: 0,
                dueDate: new Date(period.year, period.month, 0),
                paymentMethod: payment.paymentMethod || 'card',
                reference: payment.transactionId,
                status: 'paid',
                paidDate: new Date()
              });
            }
          } catch (ledgerError) {
            console.error('Error updating rent ledger:', ledgerError);
          }
        }

        const user = await User.findById(payment.userId);
        
        if (user) {
          const currentEnd = user.subscription?.endDate ? new Date(user.subscription.endDate) : new Date();
          currentEnd.setMonth(currentEnd.getMonth() + months);
          
          user.subscription = {
            plan: planType,
            planType: planType,
            startDate: new Date(),
            endDate: currentEnd,
            isActive: true
          };
          
          // Update tenant earnings if payout is enabled
          if (user.payoutSettings?.isEnabled && revenueSplit.tenantShareAmount > 0) {
            user.payoutSettings.pendingPayout = (user.payoutSettings.pendingPayout || 0) + revenueSplit.tenantShareAmount;
            user.payoutSettings.totalEarnings = (user.payoutSettings.totalEarnings || 0) + revenueSplit.tenantShareAmount;
          }
          
          await user.save();
          
          if (user.phone) {
            const { sendSMS } = require('../services/smsService');
            await sendSMS(user.phone, `BomaSecure: Payment of KES ${payment.amount} received. ${planType === 'free' ? 'Free trial active.' : planType === 'premium' ? 'Premium plan active - no platform fee.' : 'Standard plan active - 5% platform fee applies.'}`);
          }
        }
      }
    } else if (event.event === 'charge.failed') {
      const payment = await Payment.findOne({ transactionId: reference });
      if (payment && payment.status === 'processing') {
        payment.status = 'failed';
        payment.metadata.failureReason = event.data.gateway_response;
        await payment.save();
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Paystack Webhook Error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
};

// Bank Transfer Payment using Paystack Virtual Accounts
exports.initiateBankPayment = async (req, res) => {
  try {
    const { amount, apartmentId, description } = req.body;
    const userId = req.user.userId;

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Try to create Paystack virtual account
    let bankDetails = null;
    let paystackRecipientCode = null;

    if (checkPaystackConfig()) {
      try {
        // Create transfer recipient for the admin (admin receives the payment)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@bomasecure.com';
        
        // First, get the admin's bank account from settings
        const { Settings, BankAccount } = require('../models');
        const defaultBank = await BankAccount.findOne({ isDefault: true, isActive: true });
        
        if (defaultBank) {
          // Create a transfer recipient for the admin
          const recipientResponse = await paystack.transfer.recipient.create({
            type: 'individual',
            name: defaultBank.accountName,
            account_number: defaultBank.accountNumber,
            bank_code: getBankCode(defaultBank.bankName),
            currency: 'KES',
            description: 'BomaSecure Payment Recipient'
          });

          if (recipientResponse.status) {
            paystackRecipientCode = recipientResponse.data.recipient_code;
          }
        }

        // Generate a unique virtual account reference
        const virtualAccountRef = `BS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // Create dedicated virtual account for this payment
        const vaResponse = await paystack.treasury.createDedicatedAccount({
          customer: {
            email: user.email || `user${userId}@bomasecure.com`,
            first_name: user.name?.split(' ')[0] || 'BomaSecure',
            last_name: user.name?.split(' ').slice(1).join(' ') || 'User',
            phone: user.phone || ''
          },
          preferred_bank: 'guarantee_trust_bank',
          reference: virtualAccountRef
        });

        if (vaResponse.status) {
          bankDetails = {
            bankName: vaResponse.data.bank?.name || 'Guarantee Trust Bank',
            accountNumber: vaResponse.data.account_number,
            accountName: vaResponse.data.account_name,
            bankCode: vaResponse.data.bank?.slug,
            expiresAt: vaResponse.data.expires_at,
            isVirtualAccount: true
          };
        }
      } catch (paystackError) {
        console.error('Paystack VA Error:', paystackError.response?.data || paystackError.message);
        // Fall back to manual bank details
      }
    }

    // Fall back to manual bank details if Paystack VA failed
    if (!bankDetails) {
      const { Settings, BankAccount } = require('../models');
      const defaultBank = await BankAccount.findOne({ isDefault: true, isActive: true });
      
      if (defaultBank) {
        bankDetails = {
          bankName: defaultBank.bankName,
          accountNumber: defaultBank.accountNumber,
          accountName: defaultBank.accountName,
          branch: defaultBank.branch,
          swiftCode: defaultBank.swiftCode,
          isVirtualAccount: false
        };
      } else {
        // Default fallback bank details
        bankDetails = {
          bankName: 'Standard Chartered Bank',
          accountNumber: '0123456789',
          accountName: 'BomaSecure Solutions Ltd',
          branch: 'Westlands Branch',
          swiftCode: 'SCBLKENXXXX',
          isVirtualAccount: false
        };
      }
    }

    // Create payment record
    const payment = new Payment({
      userId,
      apartmentId,
      amount: paymentAmount,
      currency: 'KES',
      paymentMethod: 'bank',
      bankName: bankDetails.bankName,
      accountNumber: bankDetails.accountNumber,
      description: description || 'BomaSecure Subscription Payment',
      status: 'pending',
      subaccountCode: await getSubaccountCode(apartmentId, userId),
      metadata: {
        ...(paystackRecipientCode && { paystackRecipientCode }),
        ...(bankDetails.isVirtualAccount && {
          virtualAccountRef: `BS-${Date.now()}`,
          expiresAt: bankDetails.expiresAt
        }),
        isVirtualAccount: bankDetails.isVirtualAccount
      }
    });
    await payment.save();

    res.json({
      success: true,
      message: bankDetails.isVirtualAccount 
        ? 'Virtual account created. Please pay within the valid period.' 
        : 'Bank transfer details generated. Please make payment within 24 hours.',
      payment: {
        transactionId: payment.transactionId,
        status: payment.status,
        amount: paymentAmount,
        bankDetails
      }
    });
  } catch (error) {
    console.error('Bank Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment processing error' });
  }
};

// Helper function to map bank names to Paystack bank codes
const getBankCode = (bankName) => {
  const bankCodes = {
    'standard chartered bank': 'SCBLKENXXX',
    'guarantee trust bank': 'GTBANKKENYA',
    'kenya commercial bank': 'KCBLKENYA',
    'equity bank': 'EQBLKENYA',
    'cooperative bank': 'KOCBKENYA',
    'diamond trust bank': 'DTBKENYA',
    'barclays bank': 'BARCKENYA',
    'absa bank': 'ABSAKENYA',
    'stanbic bank': 'SBICKENYA',
    'national bank of kenya': 'NBKAKENYA',
    'family bank': 'FAMAKENYA',
    'first bank of nigeria': 'FBNKENYA',
    'union bank': 'UBNKENYA'
  };
  
  const normalizedName = bankName.toLowerCase().trim();
  return bankCodes[normalizedName] || 'SCBLKENXXX';
};

// Card Payment using Paystack API (real-time)
exports.initiateCardPayment = async (req, res) => {
  try {
    const { cardNumber, expiry, cvv, amount, apartmentId, description } = req.body;
    const userId = req.user.userId;

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Create payment record with subaccount info
    const subaccountCode = await getSubaccountCode(apartmentId, userId);
    const payment = new Payment({
      userId,
      apartmentId,
      amount: paymentAmount,
      currency: 'KES',
      paymentMethod: 'card',
      description: description || 'BomaSecure Subscription Payment',
      status: 'processing',
      subaccountCode,
      metadata: {
        last4: cardNumber?.slice(-4),
        cardType: 'VISA'
      }
    });
    await payment.save();

    try {
      const [expMonth, expYear] = expiry.split('/');

      const chargeData = {
        email: req.user.email || `user${userId}@bomasecure.com`,
        amount: (paymentAmount * 100).toString(),
        currency: 'KES',
        card: {
          cvv,
          number: cardNumber,
          expiry_month: expMonth,
          expiry_year: expYear
        },
        reference: payment.transactionId,
        metadata: {
          paymentId: payment._id.toString(),
          transactionId: payment.transactionId
        }
      };

      // Add subaccount configuration for automatic splitting
      if (subaccountCode) {
        chargeData.bearer_type = 'subaccount';
        chargeData.subaccount = subaccountCode;
      }

      const response = await paystack.transaction.charge(chargeData);

      if (response.status && response.data.status === 'success') {
// Determine plan type based on amount
        let planType = 'standard';
        if (payment.amount < 1500) {
          planType = 'free'; // Free trial
        } else if (payment.amount >= 2250) {
          planType = 'premium';
        }
        
        // Check if account has already used free plan
        const existingUser = await User.findById(payment.userId);
        if (existingUser) {
          planType = await checkAndApplyFreePlanRestriction(existingUser, planType);
        }
        
        // Calculate revenue split
        const revenueSplit = calculateRevenueSplit(paymentAmount, planType);
        
        payment.status = 'completed';
        payment.metadata.cardRef = response.data.reference;
        payment.paidAt = new Date();
        payment.revenueSplit = {
          ...revenueSplit,
          payoutStatus: 'pending'
        };
      } else {
        payment.status = 'failed';
        payment.metadata.error = response.data?.message || 'Payment failed';
      }
    } catch (cardError) {
      console.error('Card processing error:', cardError);
      payment.status = 'failed';
      payment.metadata.error = cardError.response?.data?.message || cardError.message;
    }
    
    await payment.save();

    // If payment successful, update subscription
    if (payment.status === 'completed') {
      const baseRate = 1500;
      const months = Math.max(1, Math.floor(paymentAmount / baseRate));
      
      // Determine plan type based on amount
      let planType = 'standard';
      if (paymentAmount < 1500) {
        planType = 'free'; // Free trial
      } else if (paymentAmount >= 2250) {
        planType = 'premium';
      }
      
      const user = await User.findById(userId);
      if (user) {
        planType = await checkAndApplyFreePlanRestriction(user, planType);
        const currentEnd = user.subscription?.endDate ? new Date(user.subscription.endDate) : new Date();
        currentEnd.setMonth(currentEnd.getMonth() + months);
        
        user.subscription = {
          plan: planType,
          planType: planType,
          startDate: new Date(),
          endDate: currentEnd,
          isActive: true
        };
        
        // Update tenant earnings if payout is enabled
        const revenueSplit = payment.revenueSplit;
        if (user.payoutSettings?.isEnabled && revenueSplit?.tenantShareAmount > 0) {
          user.payoutSettings.pendingPayout = (user.payoutSettings.pendingPayout || 0) + revenueSplit.tenantShareAmount;
          user.payoutSettings.totalEarnings = (user.payoutSettings.totalEarnings || 0) + revenueSplit.tenantShareAmount;
        }
        
        await user.save();
      }
      
      // Emit WebSocket event for real-time update
      const io = req.app.get('io');
      if (io) {
        const wsService = require('../services/websocketService');
        wsService.broadcastPaymentUpdate(io, userId, payment.toJSON());
      }
      
      // Send SMS confirmation
      if (user?.phone) {
        const { sendSMS } = require('../services/smsService');
        await sendSMS(user.phone, `BomaSecure: Card payment of KES ${paymentAmount} successful. ${planType === 'free' ? 'Free trial active.' : planType === 'premium' ? 'Premium plan active - no platform fee.' : 'Standard plan active - 5% platform fee applies.'}`);
      }
    }

    res.json({
      success: payment.status === 'completed',
      message: payment.status === 'completed' ? 'Payment successful' : 'Payment failed. Please try again.',
      payment: {
        transactionId: payment.transactionId,
        status: payment.status,
        amount: paymentAmount
      }
    });
  } catch (error) {
    console.error('Card Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment processing error' });
  }
};

// Confirm Bank Payment (admin function)
exports.confirmBankPayment = async (req, res) => {
  try {
    const { transactionId, bankReference } = req.body;
    const { admin } = require('../middleware');
    
    const payment = await Payment.findOne({ transactionId });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    payment.status = 'completed';
    payment.bankReference = bankReference;
    payment.paidAt = new Date();
    
// Determine plan type based on amount
        let planType = 'standard';
        if (payment.amount < 1500) {
          planType = 'free'; // Free trial
        } else if (payment.amount >= 2250) {
          planType = 'premium';
        }
        
        // Check if account has already used free plan
        const user = await User.findById(payment.userId);
        if (user) {
          planType = await checkAndApplyFreePlanRestriction(user, planType);
        }
        
        // Calculate revenue split
    const revenueSplit = calculateRevenueSplit(payment.amount, planType);
    payment.revenueSplit = {
      ...revenueSplit,
      payoutStatus: 'pending'
    };
    await payment.save();
    
    // Create or update RentLedger record for rent payments
    if (payment.paymentType === 'rent') {
      try {
        const { RentLedger } = require('../models');
        const period = payment.rentPeriod || { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
        
        const existingRecord = await RentLedger.findOne({
          tenantId: payment.userId,
          'period.month': period.month,
          'period.year': period.year
        });
        
        if (existingRecord) {
          existingRecord.amountPaid += payment.amount;
          existingRecord.balance = existingRecord.rentAmount - existingRecord.amountPaid;
          existingRecord.status = existingRecord.balance <= 0 ? 'paid' : existingRecord.balance < existingRecord.rentAmount ? 'partial' : 'pending';
          existingRecord.paymentMethod = 'bank';
          existingRecord.reference = payment.transactionId;
          existingRecord.paidDate = existingRecord.status === 'paid' ? new Date() : existingRecord.paidDate;
          await existingRecord.save();
        } else if (user) {
          await RentLedger.create({
            tenantId: payment.userId,
            apartmentId: payment.apartmentId,
            unitNumber: user.roomNumber,
            period,
            rentAmount: payment.amount,
            amountPaid: payment.amount,
            balance: 0,
            dueDate: new Date(period.year, period.month, 0),
            paymentMethod: 'bank',
            reference: payment.transactionId,
            status: 'paid',
            paidDate: new Date()
          });
        }
      } catch (ledgerError) {
        console.error('Error updating rent ledger:', ledgerError);
      }
    }

    // Update user subscription - $10 = ~KES 1500 = 1 month
    const baseRate = 1500;
    const months = Math.max(1, Math.floor(payment.amount / baseRate));
    // Reuse user fetched earlier for checkAndApplyFreePlanRestriction
    if (user) {
      const currentEnd = user.subscription?.endDate ? new Date(user.subscription.endDate) : new Date();
      currentEnd.setMonth(currentEnd.getMonth() + months);
      
      user.subscription = {
        plan: planType,
        planType: planType,
        startDate: new Date(),
        endDate: currentEnd,
        isActive: true
      };
      
      // Update tenant earnings if payout is enabled
      if (user.payoutSettings?.isEnabled && revenueSplit.tenantShareAmount > 0) {
        user.payoutSettings.pendingPayout = (user.payoutSettings.pendingPayout || 0) + revenueSplit.tenantShareAmount;
        user.payoutSettings.totalEarnings = (user.payoutSettings.totalEarnings || 0) + revenueSplit.tenantShareAmount;
      }
      
      await user.save();
    }

    // Send SMS confirmation
    if (user?.phone) {
      const { sendSMS } = require('../services/smsService');
      await sendSMS(user.phone, `BomaSecure: Bank payment of KES ${payment.amount} confirmed. ${planType === 'free' ? 'Free trial active.' : planType === 'premium' ? 'Premium plan active - no platform fee.' : 'Standard plan active - 5% platform fee applies.'} Transaction: ${payment.transactionId}.`);
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      payment
    });
  } catch (error) {
    console.error('Confirm Bank Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment confirmation error' });
  }
};

// Get user payments
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get Payments Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
};

// Get payment by ID
exports.getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const payment = await Payment.findOne({ _id: id, userId });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get Payment Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching payment' });
  }
};

// Check payment status
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const payment = await Payment.findOne({ transactionId });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({
      success: true,
      payment: {
        transactionId: payment.transactionId,
        status: payment.status,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt
      }
    });
  } catch (error) {
    console.error('Check Payment Status Error:', error);
    res.status(500).json({ success: false, message: 'Error checking payment status' });
  }
};

// Get all payments (admin) - with data isolation
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;
    const userApartmentId = req.user.apartmentId;
    
    const mongoose = require('mongoose');
    
    // Get apartments owned by this admin for strict data isolation
    const { Apartment } = require('../models');
    const userApartments = await Apartment.find({ adminId: userId }).select('_id');
    const userApartmentIds = userApartments.map(a => new mongoose.Types.ObjectId(a._id));
    
    const query = {};
    
    // Apply STRICT data isolation based on role
    if (userRole === 'admin') {
      // Admins can only see payments from their property - STRICT
      if (userApartmentIds.length > 0) {
        query.apartmentId = { $in: userApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = new mongoose.Types.ObjectId(userApartmentId);
      } else {
        // No apartments and no apartmentId - return empty
        return res.json({
          success: true,
          payments: [],
          totalPages: 0,
          currentPage: page,
          total: 0
        });
      }
    } else if (userRole === 'tenant') {
      // Tenants can only see their own payments
      query.userId = new mongoose.Types.ObjectId(userId);
    } else if (userRole === 'guard') {
      // Guards can see payments from their assigned property
      if (userApartmentIds.length > 0) {
        query.apartmentId = { $in: userApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = new mongoose.Types.ObjectId(userApartmentId);
      }
    }
    
    if (status) query.status = status;

    // Exclude pending bank transfers from admin payment history 
    // (they should appear in Tenant Finance instead)
    query.$nor = [
      { paymentMethod: 'bank', status: 'pending' }
    ];

    const { paymentMethod } = req.query;
    if (paymentMethod) {
      try {
        query.paymentMethod = JSON.parse(paymentMethod);
      } catch {
        query.paymentMethod = paymentMethod;
      }
    }

    // Also check if paymentMethod is passed in body for apartment-specific queries
    const { paymentMethod: bodyPaymentMethod } = req.body;
    if (bodyPaymentMethod) {
      try {
        query.paymentMethod = JSON.parse(bodyPaymentMethod);
      } catch {
        query.paymentMethod = bodyPaymentMethod;
      }
    }

    const payments = await Payment.find(query)
      .populate('userId', 'name email phone')
      .populate('apartmentId', 'buildingName buildingCode')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get All Payments Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
};

// Get payments by apartment (for tenant view - excludes bank transfers)
exports.getPaymentsByApartment = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const { page = 1, limit = 50, status } = req.query;
    const userId = req.user.userId;
    const mongoose = require('mongoose');

    // Verify user has access to this apartment
    const { Apartment, User } = require('../models');
    const user = await User.findById(userId);
    
    // Users can only view payments for their own apartment
    if (user?.role === 'tenant') {
      const userApartmentId = user.apartmentId 
        ? user.apartmentId.toString() 
        : null;
      
      if (userApartmentId && userApartmentId !== apartmentId) {
        return res.status(403).json({ success: false, message: 'Access denied to this apartment' });
      }
    }

    // Build query - exclude bank transfers
    const query = {
      apartmentId: new mongoose.Types.ObjectId(apartmentId),
      paymentMethod: { $ne: 'bank' }  // Exclude bank transfers
    };

    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get Payments By Apartment Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
};

// Plan revenue split configuration - applied to rent payments based on subscription plan
const RENT_COMMISSION_RATES = {
  free: {
    platformFeePercent: 15,
    tenantSharePercent: 85,
    description: 'Free Trial - 15% platform fee on rent'
  },
  standard: {
    platformFeePercent: 5,
    tenantSharePercent: 95,
    description: 'Standard Plan - 5% platform fee on rent'
  },
  premium: {
    platformFeePercent: 0,
    tenantSharePercent: 100,
    description: 'Premium Plan - 0% platform fee on rent'
  }
};

// Get subscription plans with real-time currency conversion
exports.getPlans = async (req, res) => {
  try {
    // Fetch real-time exchange rate
    let exchangeRate = 150; // Default fallback rate (KES per USD)
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      if (response.data?.rates?.KES) {
        exchangeRate = response.data.rates.KES;
      }
    } catch (err) {
      console.log('Using default exchange rate');
    }

    const plans = [
      {
        id: 'free',
        name: 'Free Trial',
        priceUSD: 0,
        priceKES: 0,
        period: 'month',
        trialDays: 30,
        unitLimit: 'unlimited',
        rentCommission: 15,
        features: [
          'Unlimited units',
          'Real-time tenant tracking',
          'Visitor management',
          'Delivery notifications',
          'Guard management',
          'Emergency alerts',
          'Payment tracking',
          'Rent collection',
          'Maintenance requests',
          'Staff directory',
          'Chat support'
        ],
        excludedFeatures: [
          'Announcements'
        ],
        description: 'Free - 15% commission'
      },
      {
        id: 'standard',
        name: 'Standard',
        priceUSD: 10,
        priceKES: Math.round(10 * exchangeRate),
        period: 'month',
        trialDays: 30,
        unitLimit: 'unlimited',
        rentCommission: 5,
        features: [
          'Everything in Free Trial',
          'Announcements',
          'Priority support',
          'Advanced analytics',
          'Custom branding'
        ],
        excludedFeatures: [],
        description: '$10/month - 5% commission'
      },
      {
        id: 'premium',
        name: 'Premium',
        priceUSD: 15,
        priceKES: Math.round(15 * exchangeRate),
        period: 'month',
        trialDays: 30,
        unitLimit: 'unlimited',
        rentCommission: 0,
        features: [
          'Everything in Standard'
        ],
        excludedFeatures: [],
        description: '$15/month - 0% commission'
      }
    ];

    res.json({
      success: true,
      plans,
      exchangeRate: {
        USD: 1,
        KES: exchangeRate,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get Plans Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching plans' });
  }
};

// Get finance analytics for admin
exports.getAdminFinanceAnalytics = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { Apartment } = require('../models');
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Get apartments owned by this admin
    const userApartments = await Apartment.find({ adminId: userId }).select('_id');
    const userApartmentIds = userApartments.map(a => new mongoose.Types.ObjectId(a._id));
    
    if (userApartmentIds.length === 0) {
      return res.json({
        success: true,
        analytics: {
          totalRevenue: 0,
          platformFee: 0,
          adminEarnings: 0,
          totalPayments: 0,
          completedPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          revenueByPlan: { free: 0, standard: 0, premium: 0 },
          revenueByMonth: [],
          recentTransactions: []
        }
      });
    }
    
    // Get all payments for this admin's properties
    const payments = await Payment.find({
      apartmentId: { $in: userApartmentIds },
      status: 'completed'
    });
    
    // Calculate analytics
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const platformFee = payments.reduce((sum, p) => sum + (p.revenueSplit?.platformFeeAmount || 0), 0);
    const adminEarnings = payments.reduce((sum, p) => sum + (p.revenueSplit?.adminEarning || 0), 0);
    
    const revenueByPlan = { free: 0, standard: 0, premium: 0 };
    payments.forEach(p => {
      const planType = p.revenueSplit?.planType || 'standard';
      revenueByPlan[planType] = (revenueByPlan[planType] || 0) + p.amount;
    });
    
    // Get monthly revenue (last 6 months)
    const now = new Date();
    const revenueByMonth = [];
    
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthPayments = payments.filter(p => {
        const paidAt = new Date(p.paidAt);
        return paidAt >= monthStart && paidAt <= monthEnd;
      });
      
      revenueByMonth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        year: monthStart.getFullYear(),
        revenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        platformFee: monthPayments.reduce((sum, p) => sum + (p.revenueSplit?.platformFeeAmount || 0), 0),
        adminEarning: monthPayments.reduce((sum, p) => sum + (p.revenueSplit?.adminEarning || 0), 0)
      });
    }
    
    // Get counts
    const allPayments = await Payment.find({ apartmentId: { $in: userApartmentIds } });
    const completedPayments = allPayments.filter(p => p.status === 'completed').length;
    const pendingPayments = allPayments.filter(p => p.status === 'pending' || p.status === 'processing').length;
    const failedPayments = allPayments.filter(p => p.status === 'failed').length;
    
    // Recent transactions
    const recentTransactions = await Payment.find({ apartmentId: { $in: userApartmentIds } })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      analytics: {
        totalRevenue,
        platformFee,
        adminEarnings,
        totalPayments: allPayments.length,
        completedPayments,
        pendingPayments,
        failedPayments,
        revenueByPlan,
        revenueByMonth,
        recentTransactions: recentTransactions.map(p => ({
          _id: p._id,
          amount: p.amount,
          status: p.status,
          paymentMethod: p.paymentMethod,
          paidAt: p.paidAt,
          revenueSplit: p.revenueSplit,
          user: p.userId ? {
            name: p.userId.name,
            email: p.userId.email,
            phone: p.userId.phone
          } : null
        }))
      }
    });
  } catch (error) {
    console.error('Get Admin Finance Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching finance analytics' });
  }
};

// NEW: Merged Finance Dashboard for Admin
// Combines high-level revenue analytics with detailed tenant payment tracking
exports.getAdminFinanceDashboard = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { Apartment } = require('../models');
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Get apartments owned by this admin for strict data isolation
    const userApartments = await Apartment.find({ adminId: userId }).select('_id');
    const userApartmentIds = userApartments.map(a => new mongoose.Types.ObjectId(a._id));
    
    if (userApartmentIds.length === 0) {
      return res.json({
        success: true,
        analytics: { totalRevenue: 0, platformFee: 0, adminEarnings: 0, completedPayments: 0 },
        tenants: [],
        summary: { totalTenants: 0, totalRentExpected: 0, totalCollected: 0 }
      });
    }

    // 1. High-level Analytics (Revenue, Fees, Earnings)
    const payments = await Payment.find({
      apartmentId: { $in: userApartmentIds },
      status: 'completed'
    });
    
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const platformFee = payments.reduce((sum, p) => sum + (p.revenueSplit?.platformFeeAmount || 0), 0);
    const adminEarnings = payments.reduce((sum, p) => sum + (p.revenueSplit?.adminEarning || 0), 0);
    
    const revenueByPlan = { free: 0, standard: 0, premium: 0 };
    payments.forEach(p => {
      const planType = p.revenueSplit?.planType || 'standard';
      revenueByPlan[planType] = (revenueByPlan[planType] || 0) + p.amount;
    });


    // 1.1 Historical Revenue Breakdown (Last 6 Months)
    const revenueByMonth = [];
    const tempNow = new Date();
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(tempNow.getFullYear(), tempNow.getMonth() - i, 1);
      const monthEnd = new Date(tempNow.getFullYear(), tempNow.getMonth() - i + 1, 0);
      
      const monthPayments = payments.filter(p => {
        const paidAt = new Date(p.paidAt);
        return paidAt >= monthStart && paidAt <= monthEnd;
      });
      
      revenueByMonth.unshift({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        year: monthStart.getFullYear(),
        revenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        adminEarning: monthPayments.reduce((sum, p) => sum + (p.revenueSplit?.adminEarning || 0), 0)
      });
    }

    // 2. Tenant-specific Finance tracking
    const tenants = await User.find({
      apartmentId: { $in: userApartmentIds },
      role: 'tenant'
    }).populate('apartmentId', 'buildingName buildingCode');
    
    const tenantIds = tenants.map(t => t._id);
    const rentPayments = await Payment.find({
      userId: { $in: tenantIds },
      paymentType: { $in: ['rent', 'deposit'] },
      status: 'completed'
    });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const tenantData = tenants.map((tenant) => {
      const tenantPayments = rentPayments.filter(p => p.userId.toString() === tenant._id.toString());
      
      const paidThisMonth = tenantPayments
        .filter(p => {
          const paidAt = new Date(p.paidAt);
          return paidAt.getMonth() + 1 === currentMonth && paidAt.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);
      
      const rentAmount = tenant.rentAmount || 0;
      const balance = Math.max(0, rentAmount - paidThisMonth);
      
      const rentStatus = balance <= 0 ? 'paid' : 
        paidThisMonth > 0 ? 'partial' : 
        new Date() > currentPeriodEnd ? 'overdue' : 'pending';
      
      return {
        id: tenant._id,
        name: tenant.name,
        roomNumber: tenant.roomNumber,
        rentAmount,
        balance,
        paidThisMonth,
        rentStatus,
        phone: tenant.phone
      };
    });

    res.json({
      success: true,
      analytics: { totalRevenue, platformFee, adminEarnings, revenueByPlan, completedPayments: payments.length },
      tenants: tenantData,
      summary: {
        totalTenants: tenants.length,
        totalRentExpected: tenantData.reduce((sum, t) => sum + t.rentAmount, 0),
        totalCollected: tenantData.reduce((sum, t) => sum + t.paidThisMonth, 0),
        totalOverdue: tenantData.filter(t => t.rentStatus === 'overdue').length
      }
    });
  } catch (error) {
    console.error('Merged Finance Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching combined finance data' });
  }
};

// Get tenant finance info
exports.getTenantFinanceInfo = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get user's payment history
    const payments = await Payment.find({ userId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Calculate totals
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPlatformFees = payments.reduce((sum, p) => sum + (p.revenueSplit?.platformFeeAmount || 0), 0);
    const totalTenantShare = payments.reduce((sum, p) => sum + (p.revenueSplit?.tenantShareAmount || 0), 0);
    
    // Revenue by plan
    const revenueByPlan = { free: 0, standard: 0, premium: 0 };
    payments.forEach(p => {
      const planType = p.revenueSplit?.planType || 'standard';
      revenueByPlan[planType] = (revenueByPlan[planType] || 0) + p.amount;
    });
    
    res.json({
      success: true,
      financeInfo: {
        subscription: user.subscription || { plan: 'free', planType: 'free', isActive: false },
        payoutSettings: user.payoutSettings || {
          isEnabled: false,
          totalEarnings: 0,
          pendingPayout: 0
        },
        totalPaid,
        totalPlatformFees,
        totalTenantShare,
        revenueByPlan,
        recentPayments: payments.map(p => ({
          _id: p._id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paidAt: p.paidAt,
          planType: p.revenueSplit?.planType || 'standard',
          platformFeePercent: p.revenueSplit?.platformFeePercent || 0,
          platformFeeAmount: p.revenueSplit?.platformFeeAmount || 0,
          tenantShareAmount: p.revenueSplit?.tenantShareAmount || 0
        }))
      }
    });
  } catch (error) {
    console.error('Get Tenant Finance Info Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching finance info' });
  }
};

// Update tenant payout settings
exports.updatePayoutSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isEnabled, bankName, accountNumber, accountName, mpesaPhone } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.payoutSettings = {
      ...user.payoutSettings,
      isEnabled: isEnabled !== undefined ? isEnabled : user.payoutSettings?.isEnabled,
      bankName: bankName || user.payoutSettings?.bankName,
      accountNumber: accountNumber || user.payoutSettings?.accountNumber,
      accountName: accountName || user.payoutSettings?.accountName,
      mpesaPhone: mpesaPhone || user.payoutSettings?.mpesaPhone
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Payout settings updated successfully',
      payoutSettings: user.payoutSettings
    });
  } catch (error) {
    console.error('Update Payout Settings Error:', error);
    res.status(500).json({ success: false, message: 'Error updating payout settings' });
  }
};

// Get tenant rent dashboard (real-time rent payment info)
exports.getTenantRentDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let apartment = user.apartmentId 
      ? await Apartment.findById(user.apartmentId)
      : null;
    
    if (!apartment && user.roomNumber) {
      const allApartments = await Apartment.find();
      for (const apt of allApartments) {
        const searchNumber = user.roomNumber.toString().trim().toLowerCase();
        const foundUnit = apt.units?.find(u => 
          (u.tenantId && u.tenantId.toString() === userId.toString()) ||
          (u.number && u.number.toString().trim().toLowerCase() === searchNumber)
        );
        if (foundUnit) {
          apartment = apt;
          break;
        }
      }
    }
    
    let unitInfo = null;
    let rentAmount = user.rentAmount || 0;
    
    if (apartment && user.roomNumber) {
      const searchNumber = user.roomNumber.toString().trim().toLowerCase();
      const unit = apartment.units?.find(u => 
        u.number && u.number.toString().trim().toLowerCase() === searchNumber
      );
      
      if (unit) {
        unitInfo = {
          number: unit.number,
          floor: unit.floor,
          type: unit.type,
          size: unit.size,
          rent: unit.rent || rentAmount
        };
        if (!rentAmount && unit.rent) {
          rentAmount = unit.rent;
        }
      }
    }
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // For recent transactions (display), exclude bank transfers
    const recentPayments = await Payment.find({
      userId,
      paymentType: { $in: ['rent', 'deposit'] },
      paymentMethod: { $ne: 'bank' }
    }).sort({ createdAt: -1 });
    
    // For calculations (rent status), include ALL completed payments including bank transfers
    const allPayments = await Payment.find({
      userId,
      paymentType: { $in: ['rent', 'deposit'] }
    });
    
    const completedPayments = allPayments.filter(p => p.status === 'completed');
    const pendingPayments = allPayments.filter(p => p.status === 'pending' || p.status === 'processing');
    const failedPayments = allPayments.filter(p => p.status === 'failed');
    
    const totalPaidThisMonth = completedPayments
      .filter(p => {
        const paidAt = new Date(p.paidAt);
        return paidAt.getMonth() + 1 === currentMonth && paidAt.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalFailed = failedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const depositAmount = user.depositAmount || 0;
    const depositPaid = user.depositPaid || false;
    
    const balance = Math.max(0, rentAmount - totalPaidThisMonth);
    
    const currentPeriodStart = user.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1);
    const currentPeriodEnd = user.currentPeriodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const rentStatus = balance <= 0 ? 'paid' : 
      totalPaidThisMonth > 0 ? 'partial' : 
      new Date() > new Date(currentPeriodEnd) ? 'overdue' : 'pending';
    
    // Get landlord's subscription plan for commission info
    let landlordPlan = null;
    let rentCommissionPercent = 15;
    if (user.createdBy) {
      const landlord = await User.findById(user.createdBy);
      if (landlord?.subscription?.plan) {
        landlordPlan = landlord.subscription.plan;
        rentCommissionPercent = PLAN_REVENUE_SPLIT[landlordPlan]?.platformFeePercent || 15;
      }
    }
    
    res.json({
      success: true,
      dashboard: {
        rentAmount,
        depositAmount,
        depositPaid,
        balance,
        totalPaid,
        totalPending,
        totalFailed,
        totalPaidThisMonth,
        buildingName: apartment?.buildingName || 'N/A',
        rentStatus,
        currentPeriodStart,
        currentPeriodEnd,
        building: apartment ? {
          id: apartment._id,
          name: apartment.buildingName,
          code: apartment.buildingCode,
          location: apartment.location
        } : null,
        unit: unitInfo,
        createdBy: user.createdBy,
        landlordPlan,
        rentCommissionPercent,
        rentCommissionDescription: `${rentCommissionPercent}% platform commission on rent`
      },
      recentTransactions: recentPayments.slice(0, 10).map(p => ({
        _id: p._id,
        amount: p.amount,
        paymentType: p.paymentType,
        status: p.status,
        paymentMethod: p.paymentMethod,
        rentPeriod: p.rentPeriod,
        paidAt: p.paidAt,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    console.error('Get Tenant Rent Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching rent dashboard' });
  }
};

// Make a rent payment
exports.makeRentPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, phoneNumber, description, rentPeriod, cardDetails } = req.body;
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const payment = new Payment({
      userId,
      apartmentId: user.apartmentId,
      paymentType: 'rent',
      rentPeriod: rentPeriod || {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      },
      amount: paymentAmount,
      paymentMethod,
      phoneNumber: phoneNumber ? phoneNumber.replace(/\D/g, '') : null,
      description: description || 'Rent Payment',
      status: 'processing',
      subaccountCode: await getSubaccountCode(user.apartmentId, userId)
    });
    
    await payment.save();
    
    // M-Pesa payment via Paystack STK Push
    if (paymentMethod === 'mpesa' && phoneNumber) {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : 
        phoneNumber.startsWith('0') ? '254' + phoneNumber.substring(1) : phoneNumber;
      
      const stkResponse = await initiateSTKPush(formattedPhone, paymentAmount, payment.transactionId, user.apartmentId, userId);
      
      if (stkResponse.success) {
        if (process.env.NODE_ENV === 'development' || process.env.AUTO_COMPLETE_PAYMENTS === 'true') {
          setTimeout(async () => {
            try {
              payment.status = 'completed';
              payment.mpesaReceiptNumber = `MPE${Date.now()}`;
              payment.paidAt = new Date();
              
              const userPlan = user.subscription?.plan || 'free';
              const revenueSplit = calculateRevenueSplit(paymentAmount, userPlan);
              payment.revenueSplit = {
                ...revenueSplit,
                planType: userPlan
              };
              
await payment.save();
               
               // Create or update RentLedger record
               try {
                 const { RentLedger } = require('../models');
                 const period = rentPeriod || payment.rentPeriod;
                 
                 const existingRecord = await RentLedger.findOne({
                   tenantId: userId,
                   'period.month': period.month,
                   'period.year': period.year
                 });
                 
                 if (existingRecord) {
                   existingRecord.amountPaid += paymentAmount;
                   existingRecord.balance = existingRecord.rentAmount - existingRecord.amountPaid;
                   existingRecord.status = existingRecord.balance <= 0 ? 'paid' : existingRecord.balance < existingRecord.rentAmount ? 'partial' : 'pending';
                   existingRecord.paymentMethod = 'mpesa';
                   existingRecord.reference = payment.transactionId;
                   existingRecord.paidDate = existingRecord.status === 'paid' ? new Date() : existingRecord.paidDate;
                   await existingRecord.save();
                 } else {
                   await RentLedger.create({
                     tenantId: userId,
                     apartmentId: user.apartmentId,
                     unitNumber: user.roomNumber,
                     period,
                     rentAmount: paymentAmount,
                     amountPaid: paymentAmount,
                     balance: 0,
                     dueDate: new Date(period.year, period.month, 0),
                     paymentMethod: 'mpesa',
                     reference: payment.transactionId,
                     status: 'paid',
                     paidDate: new Date()
                   });
                 }
               } catch (ledgerError) {
                 console.error('Error updating rent ledger:', ledgerError);
               }
               
               const io = req.app.get('io');
               if (io) {
                 const wsService = require('../services/websocketService');
                 wsService.broadcastPaymentUpdate(io, userId, payment.toJSON());
                 wsService.broadcastRentPayment(io, user.apartmentId, payment.toJSON());
               }
               
               if (user.phone) {
                 const { sendSMS } = require('../services/smsService');
                 await sendSMS(user.phone, `BomaSecure: Rent payment of KES ${paymentAmount} received. Thank you!`);
               }
             } catch (err) {
               console.error('Auto-complete rent payment error:', err);
             }
           }, 2000);
         }
        
        res.json({
          success: true,
          message: 'STK Push initiated. Please complete payment on your phone.',
          payment: {
            transactionId: payment.transactionId,
            status: payment.status,
            amount: paymentAmount
          }
        });
      } else {
        payment.status = 'failed';
        await payment.save();
        res.status(400).json({ success: false, message: stkResponse.error || 'Failed to initiate STK Push' });
      }
    }
    // Card payment via Paystack
    else if (paymentMethod === 'card' && cardDetails) {
      try {
        const { cardNumber, expiry, cvv } = cardDetails;
        const [expMonth, expYear] = expiry.split('/');

        // Get subaccount code for revenue splitting
        const subaccountCode = await getSubaccountCode(user.apartmentId, userId);

        const chargeData = {
          email: user.email || `user${userId}@bomasecure.com`,
          amount: (paymentAmount * 100).toString(),
          currency: 'KES',
          card: {
            cvv,
            number: cardNumber,
            expiry_month: expMonth,
            expiry_year: expYear
          },
          metadata: {
            transactionId: payment.transactionId,
            paymentType: 'rent',
            userId: userId.toString()
          }
        };

        // Add subaccount configuration for automatic splitting
        if (subaccountCode) {
          chargeData.bearer_type = 'subaccount';
          chargeData.subaccount = subaccountCode;
        }

        const chargeResponse = await paystack.transaction.charge(chargeData);
        
        if (chargeResponse.status && chargeResponse.data.status === 'success') {
          payment.status = 'completed';
          payment.paidAt = new Date();
          payment.metadata = {
            ...payment.metadata,
            paystackReference: chargeResponse.data.reference,
            last4: cardNumber.slice(-4)
          };
          
          const userPlan = user.subscription?.plan || 'free';
          const revenueSplit = calculateRevenueSplit(paymentAmount, userPlan);
          payment.revenueSplit = {
            ...revenueSplit,
            planType: userPlan
          };
          
          await payment.save();
          
          // Create or update RentLedger record
          try {
            const { RentLedger } = require('../models');
            const period = rentPeriod || payment.rentPeriod;
            
            // Find existing record for this period
            const existingRecord = await RentLedger.findOne({
              tenantId: userId,
              'period.month': period.month,
              'period.year': period.year
            });
            
            if (existingRecord) {
              // Update existing record
              existingRecord.amountPaid += paymentAmount;
              existingRecord.balance = existingRecord.rentAmount - existingRecord.amountPaid;
              existingRecord.status = existingRecord.balance <= 0 ? 'paid' : existingRecord.balance < existingRecord.rentAmount ? 'partial' : 'pending';
              existingRecord.paymentMethod = paymentMethod;
              existingRecord.reference = payment.transactionId;
              existingRecord.paidDate = existingRecord.status === 'paid' ? new Date() : existingRecord.paidDate;
              await existingRecord.save();
            } else {
              // Create new record
              await RentLedger.create({
                tenantId: userId,
                apartmentId: user.apartmentId,
                unitNumber: user.roomNumber,
                period,
                rentAmount: paymentAmount,
                amountPaid: paymentAmount,
                balance: 0,
                dueDate: new Date(period.year, period.month, 0),
                paymentMethod,
                reference: payment.transactionId,
                status: 'paid',
                paidDate: new Date()
              });
            }
          } catch (ledgerError) {
            console.error('Error updating rent ledger:', ledgerError);
          }
          
          const io = req.app.get('io');
          if (io) {
            const wsService = require('../services/websocketService');
            wsService.broadcastPaymentUpdate(io, userId, payment.toJSON());
            wsService.broadcastRentPayment(io, user.apartmentId, payment.toJSON());
          }
          
          if (user.phone) {
            const { sendSMS } = require('../services/smsService');
            await sendSMS(user.phone, `BomaSecure: Rent payment of KES ${paymentAmount} received. Thank you!`);
          }
          
          res.json({
            success: true,
            message: 'Card payment successful',
            payment: {
              transactionId: payment.transactionId,
              status: payment.status,
              amount: paymentAmount
            }
          });
        } else {
          payment.status = 'failed';
          payment.metadata.failureReason = chargeResponse.data?.gateway_response || 'Payment failed';
          await payment.save();
          res.status(400).json({ success: false, message: chargeResponse.data?.gateway_response || 'Card payment failed' });
        }
      } catch (cardError) {
        console.error('Card Payment Error:', cardError.response?.data || cardError.message);
        payment.status = 'failed';
        payment.metadata = { ...payment.metadata, failureReason: cardError.message };
        await payment.save();
        res.status(400).json({ success: false, message: cardError.response?.data?.message || 'Card payment processing error' });
      }
    }
    // Bank transfer - create virtual account
    else if (paymentMethod === 'bank') {
      let bankDetails = null;
      
      if (checkPaystackConfig()) {
        try {
          const virtualAccountRef = `RENT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          
          const vaResponse = await paystack.treasury.createDedicatedAccount({
            customer: {
              email: user.email || `user${userId}@bomasecure.com`,
              first_name: user.name?.split(' ')[0] || 'BomaSecure',
              last_name: user.name?.split(' ').slice(1).join(' ') || 'Tenant',
              phone: user.phone || ''
            },
            preferred_bank: 'guarantee_trust_bank',
            reference: virtualAccountRef
          });
          
          if (vaResponse.status) {
            bankDetails = {
              bankName: vaResponse.data.bank?.name || 'Guarantee Trust Bank',
              accountNumber: vaResponse.data.account_number,
              accountName: vaResponse.data.account_name,
              expiresAt: vaResponse.data.expires_at,
              isVirtualAccount: true
            };
            
            payment.metadata = {
              ...payment.metadata,
              virtualAccountRef,
              virtualAccountExpiresAt: vaResponse.data.expires_at
            };
            payment.bankName = bankDetails.bankName;
            payment.accountNumber = bankDetails.accountNumber;
            await payment.save();
          }
        } catch (vaError) {
          console.error('Paystack VA Error:', vaError.response?.data || vaError.message);
        }
      }
      
      // Fallback to manual bank transfer if Paystack VA fails
      if (!bankDetails) {
        const { BankAccount } = require('../models');
        const defaultBank = await BankAccount.findOne({ isDefault: true, isActive: true });
        
        if (defaultBank) {
          bankDetails = {
            bankName: defaultBank.bankName,
            accountNumber: defaultBank.accountNumber,
            accountName: defaultBank.accountName,
            branch: defaultBank.branch,
            isVirtualAccount: false
          };
        } else {
          bankDetails = {
            bankName: 'Standard Chartered Bank',
            accountNumber: '0123456789',
            accountName: 'BomaSecure Solutions Ltd',
            isVirtualAccount: false
          };
        }
        
        payment.bankName = bankDetails.bankName;
        payment.accountNumber = bankDetails.accountNumber;
        payment.status = 'pending';
        await payment.save();
      }
      
      res.json({
        success: true,
        message: bankDetails.isVirtualAccount 
          ? 'Virtual account created. Please pay within the valid period.' 
          : 'Bank transfer details generated. Please make payment within 24 hours.',
        payment: {
          transactionId: payment.transactionId,
          status: payment.status,
          amount: paymentAmount,
          bankDetails
        }
      });
    }
    // Cash or other payment methods - mark as completed (admin records)
    else {
      const userPlan = user.subscription?.plan || 'free';
      const revenueSplit = calculateRevenueSplit(paymentAmount, userPlan);
      payment.status = 'completed';
      payment.paidAt = new Date();
      payment.revenueSplit = {
        ...revenueSplit,
        planType: userPlan
      };
      await payment.save();
      
      const io = req.app.get('io');
      if (io) {
        const wsService = require('../services/websocketService');
        wsService.broadcastPaymentUpdate(io, userId, payment.toJSON());
        wsService.broadcastRentPayment(io, user.apartmentId, payment.toJSON());
      }
      
      res.json({
        success: true,
        message: 'Payment recorded successfully',
        payment: {
          transactionId: payment.transactionId,
          status: payment.status,
          amount: paymentAmount
        }
      });
    }
  } catch (error) {
    console.error('Make Rent Payment Error:', error);
    res.status(500).json({ success: false, message: 'Error processing rent payment' });
  }
};

// Get admin's tenants for finance tracking
exports.getAdminTenantsFinance = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    const { Apartment } = require('../models');
    const userApartments = await Apartment.find({ adminId: userId }).select('_id');
    const userApartmentIds = userApartments.map(a => new mongoose.Types.ObjectId(a._id));
    
    if (userApartmentIds.length === 0) {
      return res.json({
        success: true,
        tenants: [],
        summary: {
          totalTenants: 0,
          totalRentExpected: 0,
          totalCollected: 0,
          totalPending: 0,
          totalOverdue: 0
        }
      });
    }
    
    const tenants = await User.find({
      apartmentId: { $in: userApartmentIds },
      role: 'tenant'
    }).populate('apartmentId', 'buildingName buildingCode');
    
    const tenantIds = tenants.map(t => t._id);
    
    const payments = await Payment.find({
      userId: { $in: tenantIds },
      paymentType: { $in: ['rent', 'deposit'] },
      status: 'completed'
    });
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const tenantData = await Promise.all(tenants.map(async (tenant) => {
      const tenantPayments = payments.filter(p => p.userId.toString() === tenant._id.toString());
      
      const paidThisMonth = tenantPayments
        .filter(p => {
          const paidAt = new Date(p.paidAt);
          return paidAt.getMonth() + 1 === currentMonth && paidAt.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);
      
      const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
      const rentAmount = tenant.rentAmount || 0;
      const balance = Math.max(0, rentAmount - paidThisMonth);
      
      const rentStatus = balance <= 0 ? 'paid' : 
        paidThisMonth > 0 ? 'partial' : 
        new Date() > currentPeriodEnd ? 'overdue' : 'pending';
      
      return {
        id: tenant._id,
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        roomNumber: tenant.roomNumber,
        apartment: tenant.apartmentId ? {
          id: tenant.apartmentId._id,
          name: tenant.apartmentId.buildingName,
          code: tenant.apartmentId.buildingCode
        } : null,
        rentAmount,
        depositAmount: tenant.depositAmount || 0,
        depositPaid: tenant.depositPaid || false,
        balance,
        paidThisMonth,
        totalPaid,
        rentStatus,
        lastPayment: tenantPayments[0] ? {
          amount: tenantPayments[0].amount,
          date: tenantPayments[0].paidAt
        } : null,
        createdBy: tenant.createdBy
      };
    }));
    
    const summary = {
      totalTenants: tenants.length,
      totalRentExpected: tenantData.reduce((sum, t) => sum + t.rentAmount, 0),
      totalCollected: tenantData.reduce((sum, t) => sum + t.paidThisMonth, 0),
      totalPending: tenantData.filter(t => t.rentStatus === 'pending' || t.rentStatus === 'partial').length,
      totalOverdue: tenantData.filter(t => t.rentStatus === 'overdue').length
    };
    
    res.json({
      success: true,
      tenants: tenantData,
      summary
    });
  } catch (error) {
    console.error('Get Admin Tenants Finance Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching tenants finance' });
  }
};

// Update tenant rent settings (by admin)
exports.updateTenantRent = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { rentAmount, depositAmount, dueDate, roomNumber, rentDueDay, rentDueTime } = req.body;
    const adminId = req.user.userId;
    
    const tenant = await User.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    
    const { Apartment } = require('../models');
    const apartment = await Apartment.findOne({
      _id: tenant.apartmentId,
      adminId
    });
    
    if (!apartment) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this tenant' });
    }
    
    if (rentAmount !== undefined) tenant.rentAmount = rentAmount;
    if (depositAmount !== undefined) tenant.depositAmount = depositAmount;
    if (dueDate !== undefined) tenant.rentDueDate = dueDate;
    if (roomNumber !== undefined) tenant.roomNumber = roomNumber;
    if (rentDueDay !== undefined) tenant.rentDueDay = rentDueDay;
    if (rentDueTime !== undefined) tenant.rentDueTime = rentDueTime;
    
    // Sync rent to unit if tenant has room assigned
    if ((rentAmount !== undefined || rentDueDay !== undefined) && tenant.roomNumber && apartment) {
      const unitIndex = apartment.units.findIndex(u => 
        u.number && u.number.toString().toLowerCase().trim() === tenant.roomNumber.toString().toLowerCase().trim()
      );
      if (unitIndex !== -1) {
        if (rentAmount !== undefined) apartment.units[unitIndex].rent = rentAmount;
        if (rentDueDay !== undefined) apartment.units[unitIndex].rentDueDay = rentDueDay;
        await apartment.save();
      }
    }
    
    if (dueDate || rentDueDay) {
      tenant.currentPeriodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      tenant.currentPeriodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    }
    
    await tenant.save();
    
    res.json({
      success: true,
      message: 'Tenant rent settings updated',
      tenant: {
        id: tenant._id,
        rentAmount: tenant.rentAmount,
        depositAmount: tenant.depositAmount,
        rentDueDate: tenant.rentDueDate,
        rentDueDay: tenant.rentDueDay,
        rentDueTime: tenant.rentDueTime,
        roomNumber: tenant.roomNumber
      }
    });
  } catch (error) {
    console.error('Update Tenant Rent Error:', error);
    res.status(500).json({ success: false, message: 'Error updating tenant rent' });
  }
};

// Set global rent due date for all tenants in admin's buildings
exports.setGlobalRentDueDate = async (req, res) => {
  try {
    const { rentDueDay, rentDueTime } = req.body;
    const adminId = req.user.userId;
    
    if (!rentDueDay || rentDueDay < 1 || rentDueDay > 31) {
      return res.status(400).json({ success: false, message: 'Rent due day must be between 1 and 31' });
    }
    
    const { Apartment } = require('../models');
    const apartments = await Apartment.find({ adminId });
    
    if (apartments.length === 0) {
      return res.status(404).json({ success: false, message: 'No buildings found' });
    }
    
    for (const apartment of apartments) {
      apartment.settings = apartment.settings || {};
      apartment.settings.rentDueDay = rentDueDay;
      apartment.settings.rentDueTime = rentDueTime || '00:00';
      await apartment.save();
    }
    
    const tenants = await User.find({
      apartmentId: { $in: apartments.map(a => a._id) },
      role: 'tenant'
    });
    
    for (const tenant of tenants) {
      tenant.rentDueDay = rentDueDay;
      tenant.rentDueTime = rentDueTime || '00:00';
      tenant.currentPeriodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      tenant.currentPeriodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      await tenant.save();
    }
    
    res.json({
      success: true,
      message: `Rent due date updated for ${tenants.length} tenants across ${apartments.length} buildings`,
      settings: {
        rentDueDay,
        rentDueTime: rentDueTime || '00:00'
      }
    });
  } catch (error) {
    console.error('Set Global Rent Due Date Error:', error);
    res.status(500).json({ success: false, message: 'Error setting global rent due date' });
  }
};

// Set specific rent due date for a single tenant
exports.setTenantRentDueDate = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { rentDueDay, rentDueTime } = req.body;
    const adminId = req.user.userId;
    
    const tenant = await User.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    
    const { Apartment } = require('../models');
    const apartment = await Apartment.findOne({
      _id: tenant.apartmentId,
      adminId
    });
    
    if (!apartment) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    if (rentDueDay !== undefined) {
      if (rentDueDay < 1 || rentDueDay > 31) {
        return res.status(400).json({ success: false, message: 'Rent due day must be between 1 and 31' });
      }
      tenant.rentDueDay = rentDueDay;
    }
    
    if (rentDueTime !== undefined) {
      tenant.rentDueTime = rentDueTime;
    }
    
    if (rentDueDay || rentDueTime) {
      tenant.currentPeriodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      tenant.currentPeriodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    }
    
    await tenant.save();
    
    res.json({
      success: true,
      message: 'Tenant rent due date updated',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        rentDueDay: tenant.rentDueDay,
        rentDueTime: tenant.rentDueTime
      }
    });
  } catch (error) {
    console.error('Set Tenant Rent Due Date Error:', error);
    res.status(500).json({ success: false, message: 'Error setting tenant rent due date' });
  }
};
