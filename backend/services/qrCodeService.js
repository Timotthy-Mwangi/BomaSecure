const QRCode = require('qrcode');

const QR_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache: key -> { qrData, generatedAt }
const qrCache = new Map();

class QRCodeService {
  _getCacheKey(type, id) {
    return `${type}:${id}`;
  }

  _isCacheValid(entry) {
    return entry && Date.now() - entry.generatedAt < QR_TTL_MS;
  }

  async generateAsDataURL(code, options = {}) {
    const opts = {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
      ...options
    };
    try {
      return await QRCode.toDataURL(code, opts);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  async generateAsSVG(code, options = {}) {
    const opts = {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
      ...options
    };
    try {
      return await QRCode.toString(code, { ...opts, type: 'svg' });
    } catch (error) {
      console.error('Error generating QR code SVG:', error);
      throw new Error('Failed to generate QR code SVG');
    }
  }

  async generateVisitorQR(visitor) {
    const id = visitor._id?.toString() || visitor.id;
    const cacheKey = this._getCacheKey('visitor', id);
    const cached = qrCache.get(cacheKey);

    if (this._isCacheValid(cached)) {
      console.log(`QR cache hit: visitor ${id}`);
      return cached.qrData;
    }

    const expiresAt = visitor.expectedArrival
      ? new Date(new Date(visitor.expectedArrival).getTime() + QR_TTL_MS)
      : new Date(Date.now() + QR_TTL_MS);

    // Generate a short backup code from the qrCode token
    const backupCode = visitor.qrCode.slice(-8).toUpperCase();

    const qrPayload = JSON.stringify({
      type: 'visitor',
      id,
      code: visitor.qrCode,
      backupCode,
      name: visitor.name,
      room: visitor.roomNumber,
      host: visitor.hostTenantId?.name || visitor.hostName || '',
      purpose: visitor.purpose,
      validUntil: expiresAt.getTime()
    });

    const qrImage = await this.generateAsDataURL(qrPayload, {
      width: 400,
      errorCorrectionLevel: 'H'
    });

    const qrData = {
      code: visitor.qrCode,
      backupCode,
      qrImage,
      type: 'visitor',
      visitorId: id,
      name: visitor.name,
      roomNumber: visitor.roomNumber,
      purpose: visitor.purpose,
      hostName: visitor.hostTenantId?.name || visitor.hostName || '',
      expiresAt
    };

    qrCache.set(cacheKey, { qrData, generatedAt: Date.now() });
    console.log(`QR generated & cached: visitor ${id}, expires ${expiresAt.toISOString()}`);
    return qrData;
  }

  async generateDeliveryQR(delivery) {
    const id = delivery._id?.toString() || delivery.id;
    const cacheKey = this._getCacheKey('delivery', id);
    const cached = qrCache.get(cacheKey);

    if (this._isCacheValid(cached)) {
      console.log(`QR cache hit: delivery ${id}`);
      return cached.qrData;
    }

    const expiresAt = new Date(Date.now() + QR_TTL_MS);
    const backupCode = delivery.qrCode.slice(-8).toUpperCase();

    const qrPayload = JSON.stringify({
      type: 'delivery',
      id,
      code: delivery.qrCode,
      backupCode,
      recipient: delivery.recipientTenantId?.name || delivery.recipientName || '',
      room: delivery.roomNumber,
      courier: delivery.courierName,
      company: delivery.courierCompany,
      description: delivery.parcelDescription,
      validUntil: expiresAt.getTime()
    });

    const qrImage = await this.generateAsDataURL(qrPayload, {
      width: 400,
      errorCorrectionLevel: 'H'
    });

    const qrData = {
      code: delivery.qrCode,
      backupCode,
      qrImage,
      type: 'delivery',
      deliveryId: id,
      parcelDescription: delivery.parcelDescription,
      courierName: delivery.courierName,
      courierCompany: delivery.courierCompany,
      roomNumber: delivery.roomNumber,
      recipientName: delivery.recipientTenantId?.name || delivery.recipientName || '',
      expiresAt
    };

    qrCache.set(cacheKey, { qrData, generatedAt: Date.now() });
    console.log(`QR generated & cached: delivery ${id}, expires ${expiresAt.toISOString()}`);
    return qrData;
  }

  // Invalidate cache entry (call when visitor/delivery status changes)
  invalidateCache(type, id) {
    const key = this._getCacheKey(type, id);
    qrCache.delete(key);
    console.log(`QR cache invalidated: ${key}`);
  }

  parseQRData(qrString) {
    try {
      return JSON.parse(qrString);
    } catch {
      return {
        code: qrString,
        type: qrString.startsWith('VIS-') ? 'visitor' : qrString.startsWith('DEL-') ? 'delivery' : 'unknown'
      };
    }
  }
}

module.exports = new QRCodeService();
