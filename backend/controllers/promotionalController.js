const { PromotionalAd, User } = require('../models');
const mongoose = require('mongoose');
const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const axios = require('axios');

const PRICES_USD = {
  '24h': 2,
  '7d': 12,
  '30d': 55
};

const DURATIONS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000
};

const getExchangeRate = async () => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    return response.data?.rates?.KES || 150;
  } catch (err) {
    return 150;
  }
};

const checkPaystackConfig = () => {
  return process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY !== 'sk_test_your-secret-key-here';
};

const promotionalController = {
  // Get promotional ad prices
  async getPrices(req, res) {
    try {
      const exchangeRate = await getExchangeRate();
      
      const prices = Object.entries(PRICES_USD).map(([duration, usd]) => ({
        duration,
        priceUSD: usd,
        priceKES: Math.round(usd * exchangeRate),
        description: `${duration === '24h' ? '24 hours' : duration === '7d' ? '7 days' : '30 days'} promotion`
      }));
      
      return res.json({ success: true, prices, exchangeRate });
    } catch (error) {
      console.error('Get prices error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch prices' });
    }
  },

  async createAd(req, res) {
    try {
      const { title, description, linkUrl, adType, apartmentId, unitId, price, duration, imageIndex, paymentMethod, phoneNumber, cardDetails, contactPhone, rentAmount, unitNumber, buildingId } = req.body;
      
      if (!title || !duration) {
        return res.status(400).json({ success: false, message: 'Title and duration are required' });
      }

      if (!PRICES_USD[duration]) {
        return res.status(400).json({ success: false, message: 'Invalid duration. Choose: 24h, 7d, or 30d' });
      }

      let images = [];
      let imageUrl = '';
      
      // Handle multiple image uploads
      if (req.files && req.files.length > 0) {
        images = req.files.map(file => `/uploads/promos/${file.filename}`);
        imageUrl = images[0];
      } else if (req.body.images && Array.isArray(JSON.parse(req.body.images || '[]'))) {
        // Handle images sent as JSON array
        images = JSON.parse(req.body.images);
        imageUrl = images[0] || '';
      } else if (req.body.imageUrl) {
        images = [req.body.imageUrl];
        imageUrl = req.body.imageUrl;
      }

      if (images.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one image is required' });
      }

      const activeImageIndex = imageIndex ? parseInt(imageIndex) : 0;
      const endDate = new Date(Date.now() + DURATIONS[duration]);
      const priceUSD = PRICES_USD[duration];

      // Handle payment for the promotional ad
      if (paymentMethod && paymentMethod !== 'free') {
        // Get current exchange rate
        const exchangeRate = await getExchangeRate();
        const priceKES = Math.round(priceUSD * exchangeRate);

        // Process payment based on method
        let paymentStatus = 'pending';
        let paymentReference = null;
        let paymentMetadata = {};

        if (paymentMethod === 'mpesa' && phoneNumber) {
          // M-Pesa STK Push payment
          if (checkPaystackConfig()) {
            try {
              const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : 
                phoneNumber.startsWith('0') ? '254' + phoneNumber.substring(1) : phoneNumber;
              
               const transactionData = {
                 email: req.user.email || `user${req.user.userId}@bomasecure.com`,
                 amount: (priceKES * 100).toString(),
                 currency: 'KES',
                 metadata: {
                   paymentType: 'promotional_ad',
                   duration,
                   userId: req.user.userId.toString(),
                   apartmentId: apartmentId || null
                 },
                 channels: ['mobile_money'],
                 callback_url: `${process.env.CLIENT_URL}/promotion/payment/callback`
               };

               // Add subaccount configuration if available
               const subaccountCode = process.env.PAYSTACK_SUBACCOUNT_CODE;
               if (subaccountCode) {
                 transactionData.bearer_type = 'subaccount';
                 transactionData.subaccount = subaccountCode;
               }

               const stkResponse = await paystack.transaction.initialize(transactionData);

              if (stkResponse.status) {
                paymentReference = stkResponse.data.reference;
                paymentMetadata = {
                  checkoutRequestId: stkResponse.data.reference,
                  phone: formattedPhone,
                  amountKES: priceKES,
                  exchangeRate
                };

                // Auto-complete for development
                if (process.env.NODE_ENV === 'development' || process.env.AUTO_COMPLETE_PAYMENTS === 'true') {
                  setTimeout(async () => {
                    try {
                      await paystack.transaction.verify(stkResponse.data.reference);
                    } catch (err) {
                      console.error('Auto-verify promo payment:', err);
                    }
                  }, 3000);
                }
              } else {
                return res.status(400).json({ success: false, message: stkResponse.message || 'Failed to initiate payment' });
              }
            } catch (paystackError) {
              console.error('Paystack STK Error:', paystackError.response?.data || paystackError.message);
              return res.status(400).json({ success: false, message: 'Payment initialization failed' });
            }
          } else {
            // Fallback - mark as pending for manual payment
            paymentMetadata = { manualPayment: true, amountKES: priceKES };
          }
        } else if (paymentMethod === 'card' && cardDetails) {
          // Card payment via Paystack
          if (checkPaystackConfig()) {
            try {
              const { cardNumber, expiry, cvv } = cardDetails;
              const [expMonth, expYear] = expiry.split('/');
              
               const chargeData = {
                 email: req.user.email || `user${req.user.userId}@bomasecure.com`,
                 amount: (priceKES * 100).toString(),
                 currency: 'KES',
                 card: {
                   cvv,
                   number: cardNumber,
                   expiry_month: expMonth,
                   expiry_year: expYear
                 },
                 metadata: {
                   paymentType: 'promotional_ad',
                   duration,
                   userId: req.user.userId.toString(),
                   apartmentId: apartmentId || null
                 }
               };

               // Add subaccount configuration if available
               const subaccountCode = process.env.PAYSTACK_SUBACCOUNT_CODE;
               if (subaccountCode) {
                 chargeData.bearer_type = 'subaccount';
                 chargeData.subaccount = subaccountCode;
               }

               const chargeResponse = await paystack.transaction.charge(chargeData);

              if (chargeResponse.status && chargeResponse.data.status === 'success') {
                paymentStatus = 'completed';
                paymentReference = chargeResponse.data.reference;
                paymentMetadata = {
                  paystackReference: paymentReference,
                  last4: cardNumber.slice(-4),
                  amountKES,
                  exchangeRate
                };
              } else {
                return res.status(400).json({ success: false, message: chargeResponse.data?.gateway_response || 'Card payment failed' });
              }
            } catch (cardError) {
              console.error('Card Payment Error:', cardError.response?.data || cardError.message);
              return res.status(400).json({ success: false, message: cardError.response?.data?.message || 'Card payment processing error' });
            }
          } else {
            return res.status(400).json({ success: false, message: 'Payment gateway not configured' });
          }
        } else if (paymentMethod === 'bank') {
          // Bank transfer - create virtual account or use manual details
          if (checkPaystackConfig()) {
            try {
              const user = await User.findById(req.user.userId);
              const virtualAccountRef = `PROMO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
              
              const vaResponse = await paystack.treasury.createDedicatedAccount({
                customer: {
                  email: user?.email || `user${req.user.userId}@bomasecure.com`,
                  first_name: user?.name?.split(' ')[0] || 'BomaSecure',
                  last_name: user?.name?.split(' ').slice(1).join(' ') || 'User',
                  phone: user?.phone || ''
                },
                preferred_bank: 'guarantee_trust_bank',
                reference: virtualAccountRef
              });

              if (vaResponse.status) {
                paymentMetadata = {
                  virtualAccount: true,
                  bankName: vaResponse.data.bank?.name || 'Guarantee Trust Bank',
                  accountNumber: vaResponse.data.account_number,
                  accountName: vaResponse.data.account_name,
                  expiresAt: vaResponse.data.expires_at,
                  amountKES
                };
              } else {
                throw new Error('Failed to create virtual account');
              }
            } catch (vaError) {
              console.error('VA Error:', vaError.response?.data || vaError.message);
              // Fallback to manual bank details
              paymentMetadata = {
                bankName: 'Standard Chartered Bank',
                accountNumber: '0123456789',
                accountName: 'BomaSecure Solutions Ltd',
                amountKES,
                isManual: true
              };
            }
          } else {
            paymentMetadata = {
              bankName: 'Standard Chartered Bank',
              accountNumber: '0123456789',
              accountName: 'BomaSecure Solutions Ltd',
              amountKES,
              isManual: true
            };
          }
        }

        // Add subaccount code to metadata for tracking
        if (process.env.PAYSTACK_SUBACCOUNT_CODE) {
          paymentMetadata.subaccountCode = process.env.PAYSTACK_SUBACCOUNT_CODE;
        }

        // Create ad with payment status
        const ad = await PromotionalAd.create({
          title,
          description,
          images,
          imageUrl,
          activeImageIndex,
          linkUrl: linkUrl || null,
          adType: adType || 'general',
          apartmentId: buildingId && mongoose.Types.ObjectId.isValid(buildingId) ? buildingId : null,
          unitId: unitNumber || unitId || null,
          price: rentAmount ? parseInt(rentAmount) : priceKES,
          postedBy: req.user.userId,
          duration,
          pricePaid: priceKES,
          currency: 'KES',
          paymentStatus,
          paymentReference,
          paymentMethod: paymentMethod || 'pending',
          paymentMetadata,
          contactPhone: contactPhone || phoneNumber || null,
          endDate
        });

        return res.status(201).json({
          success: true,
          ad,
          payment: paymentMetadata.checkoutRequestId || paymentMetadata.paystackReference || null,
          message: paymentMetadata.checkoutRequestId 
            ? 'STK Push initiated. Please complete payment on your phone.' 
            : paymentMetadata.virtualAccount
              ? 'Virtual account created. Please pay within the valid period.'
              : paymentStatus === 'completed' 
                ? 'Payment successful. Ad created.' 
                : 'Ad created. Please complete payment.'
        });
      }

      // Free ad (no payment required)
      const ad = await PromotionalAd.create({
        title,
        description,
        images,
        imageUrl,
        activeImageIndex,
        linkUrl: linkUrl || null,
        adType: adType || 'general',
        apartmentId: null,
        unitId: unitNumber || unitId || null,
        price: rentAmount ? parseInt(rentAmount) : 0,
        postedBy: req.user.userId,
        duration,
        pricePaid: 0,
        currency: 'KES',
        paymentStatus: 'completed',
        paymentMethod: 'free',
        contactPhone: contactPhone || null,
        endDate
      });

      return res.status(201).json({ success: true, ad });
    } catch (error) {
      console.error('Create ad error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create ad' });
    }
  },

  async getActiveAds(req, res) {
    try {
      console.log('[getActiveAds] Fetching active ads...');
      const ads = await PromotionalAd.find({
        status: 'active',
        endDate: { $gt: new Date() }
      }).sort({ createdAt: -1 }).limit(10);

      console.log('[getActiveAds] Found', ads.length, 'active ads');
      return res.json({ success: true, ads });
    } catch (error) {
      console.error('Get ads error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch ads' });
    }
  },

  async getAdById(req, res) {
    try {
      const { id } = req.params;
      
      console.log('[getAdById] Request received for ad ID:', id);
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('[getAdById] Invalid ID format:', id);
        return res.status(400).json({ success: false, message: 'Invalid ad ID' });
      }
      
      const ad = await PromotionalAd.findById(id);
      
      if (!ad) {
        console.log('[getAdById] Ad not found for ID:', id);
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }
      
      console.log('[getAdById] Found ad:', ad.title);
      return res.json({ success: true, ad });
    } catch (error) {
      console.error('[getAdById] Error:', error.message, error.stack);
      return res.status(500).json({ success: false, message: 'Failed to fetch ad' });
    }
  },

  async getMyAds(req, res) {
    try {
      const ads = await PromotionalAd.find({ postedBy: req.user.userId })
        .sort({ createdAt: -1 });

      return res.json({ success: true, ads });
    } catch (error) {
      console.error('Get my ads error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch ads' });
    }
  },

  async updateAd(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const ad = await PromotionalAd.findOne({ _id: id, postedBy: req.user.userId });
      
      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }

      Object.assign(ad, updates);
      await ad.save();

      return res.json({ success: true, ad });
    } catch (error) {
      console.error('Update ad error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update ad' });
    }
  },

  async deleteAd(req, res) {
    try {
      const { id } = req.params;

      const ad = await PromotionalAd.findOneAndDelete({ _id: id, postedBy: req.user.userId });
      
      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }

      return res.json({ success: true, message: 'Ad deleted' });
    } catch (error) {
      console.error('Delete ad error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete ad' });
    }
  },

  async trackImpression(req, res) {
    try {
      const { id } = req.params;
      
      const ad = await PromotionalAd.findByIdAndUpdate(id, { $inc: { impressions: 1 } }, { new: true });
      
      if (ad && ad.postedBy) {
        const io = req.app.get('io');
        if (io) {
          io.to(`user-${ad.postedBy.toString()}`).emit('promo:stats:update', {
            adId: id,
            impressions: ad.impressions,
            clicks: ad.clicks
          });
        }
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Track impression error:', error);
      return res.status(500).json({ success: false, message: 'Failed to track impression' });
    }
  },

  async trackClick(req, res) {
    try {
      const { id } = req.params;
      
      const ad = await PromotionalAd.findByIdAndUpdate(id, { $inc: { clicks: 1 } }, { new: true });
      
      if (ad && ad.postedBy) {
        const io = req.app.get('io');
        if (io) {
          io.to(`user-${ad.postedBy.toString()}`).emit('promo:stats:update', {
            adId: id,
            impressions: ad.impressions,
            clicks: ad.clicks
          });
        }
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Track click error:', error);
      return res.status(500).json({ success: false, message: 'Failed to track click' });
    }
  },

  async getStats(req, res) {
    try {
      const totalAds = await PromotionalAd.countDocuments({ postedBy: req.user.userId });
      const activeAds = await PromotionalAd.countDocuments({ 
        postedBy: req.user.userId,
        status: 'active',
        endDate: { $gt: new Date() }
      });
      const totalImpressions = await PromotionalAd.aggregate([
        { $match: { postedBy: req.user.userId } },
        { $group: { _id: null, total: { $sum: '$impressions' } } }
      ]);
      const totalClicks = await PromotionalAd.aggregate([
        { $match: { postedBy: req.user.userId } },
        { $group: { _id: null, total: { $sum: '$clicks' } } }
      ]);

      return res.json({
        success: true,
        stats: {
          totalAds,
          activeAds,
          totalImpressions: totalImpressions[0]?.total || 0,
          totalClicks: totalClicks[0]?.total || 0
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
  },

  async paymentWebhook(req, res) {
    try {
      const { event, data } = req.body;

      if (event === 'charge.success' || event === 'paymentrequest.success') {
        const reference = data.reference || data.id;
        
        // Find the ad by payment reference
        const ad = await PromotionalAd.findOne({ paymentReference: reference });
        
        if (ad && ad.paymentStatus === 'pending') {
          ad.paymentStatus = 'completed';
          ad.paymentMetadata = {
            ...ad.paymentMetadata,
            paidAt: new Date(),
            paystackReference: reference
          };
          await ad.save();

          // Send notification to user
          const user = await User.findById(ad.postedBy);
          if (user?.phone) {
            const { sendSMS } = require('../services/smsService');
            await sendSMS(user.phone, `BomaSecure: Your promotional ad "${ad.title}" is now active!`);
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Payment webhook error:', error);
      res.status(500).json({ success: false, message: 'Webhook processing error' });
    }
  }
};

module.exports = promotionalController;
