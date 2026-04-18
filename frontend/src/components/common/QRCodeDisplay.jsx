import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, Copy, X, Check, Clock, MapPin, User, Package } from 'lucide-react';
import { COLORS } from '../../config';

const QRCodeDisplay = ({ 
  qrData, 
  type = 'visitor', // 'visitor' or 'delivery'
  onClose,
  showDetails = true,
  size = 'normal' // 'small', 'normal', 'large'
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!qrData) return null;

  const { qrImage, code, name, roomNumber, hostName, purpose, parcelDescription, courierName, courierCompany, expiresAt } = qrData;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `${type}-qr-${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1000);
  };

  const getStatusColor = () => {
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      if (expiryDate < now) return COLORS.accent;
    }
    return COLORS.secondary;
  };

  const sizeStyles = {
    small: { maxWidth: '250px', qrSize: '150px', fontSize: '12px' },
    normal: { maxWidth: '350px', qrSize: '250px', fontSize: '14px' },
    large: { maxWidth: '450px', qrSize: '350px', fontSize: '16px' }
  };

  const styles = sizeStyles[size] || sizeStyles.normal;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: COLORS.white,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        maxWidth: styles.maxWidth,
        margin: '0 auto',
        position: 'relative'
      }}
    >
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: COLORS.gray[100],
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: COLORS.gray[600]
          }}
        >
          <X size={18} />
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          background: type === 'visitor' ? COLORS.primary + '15' : COLORS.secondary + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          {type === 'visitor' ? (
            <User size={28} color={COLORS.primary} />
          ) : (
            <Package size={28} color={COLORS.secondary} />
          )}
        </div>
        <h2 style={{ 
          margin: 0, 
          fontSize: '20px', 
          fontWeight: 700, 
          color: COLORS.dark 
        }}>
          {type === 'visitor' ? 'Visitor Pass' : 'Package Pickup Code'}
        </h2>
        <p style={{ 
          margin: '4px 0 0', 
          fontSize: '13px', 
          color: COLORS.gray[500] 
        }}>
          {type === 'visitor' 
            ? 'Show this QR code at the gate for quick check-in' 
            : 'Show this QR code to collect your package'}
        </p>
      </div>

      {/* QR Code Image */}
      <div style={{
        background: COLORS.gray[50],
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <img 
          src={qrImage} 
          alt="QR Code" 
          style={{
            width: styles.qrSize,
            height: styles.qrSize,
            borderRadius: '8px'
          }}
        />
      </div>

      {/* Code Display */}
      <div style={{
        background: COLORS.gray[100],
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrCode size={16} color={COLORS.gray[500]} />
          <code style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: COLORS.dark,
            fontFamily: 'monospace'
          }}>
            {code}
          </code>
        </div>
        <button
          onClick={copyCode}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: copied ? COLORS.secondary : COLORS.gray[500],
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {/* Details */}
      {showDetails && (
        <div style={{ fontSize: styles.fontSize, color: COLORS.gray[600], marginBottom: '20px' }}>
          {type === 'visitor' ? (
            <>
              {name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User size={16} />
                  <span><strong>{name}</strong></span>
                </div>
              )}
              {roomNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={16} />
                  <span>Room <strong>{roomNumber}</strong></span>
                </div>
              )}
              {hostName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User size={16} />
                  <span>Host: <strong>{hostName}</strong></span>
                </div>
              )}
              {purpose && (
                <div style={{ textTransform: 'capitalize' }}>
                  Purpose: <strong>{purpose}</strong>
                </div>
              )}
            </>
          ) : (
            <>
              {parcelDescription && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>{parcelDescription}</strong>
                </div>
              )}
              {courierCompany && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Package size={16} />
                  <span>{courierCompany}</span>
                </div>
              )}
              {courierName && (
                <div style={{ marginBottom: '8px' }}>
                  Courier: <strong>{courierName}</strong>
                </div>
              )}
              {roomNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} />
                  <span>Room <strong>{roomNumber}</strong></span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Expiry */}
      {expiresAt && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          background: getStatusColor() + '15',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          color: getStatusColor()
        }}>
          <Clock size={16} />
          <span>
            {new Date(expiresAt) < new Date() 
              ? 'Expired - Please request a new code' 
              : `Valid until: ${new Date(expiresAt).toLocaleString()}`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadQR}
          disabled={downloading}
          style={{
            flex: 1,
            padding: '12px',
            background: COLORS.primary,
            border: 'none',
            borderRadius: '8px',
            color: COLORS.white,
            fontSize: '14px',
            fontWeight: 600,
            cursor: downloading ? 'not-allowed' : 'pointer',
            opacity: downloading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Download size={16} />
          {downloading ? 'Saving...' : 'Save QR Code'}
        </motion.button>
      </div>

      {/* Info */}
      <p style={{
        margin: '16px 0 0',
        fontSize: '12px',
        color: COLORS.gray[400],
        textAlign: 'center'
      }}>
        {type === 'visitor' 
          ? 'Present this code at the security gate for quick verification'
          : 'Show this code at the security office to collect your package'}
      </p>
    </motion.div>
  );
};

export default QRCodeDisplay;
