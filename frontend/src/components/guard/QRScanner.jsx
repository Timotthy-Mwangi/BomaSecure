import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI, deliveriesAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { 
  QrCode, 
  Camera, 
  Check, 
  X, 
  ArrowLeft, 
  RefreshCw, 
  Package 
} from 'lucide-react';

// eslint-disable-next-line no-unused-vars
const GuardQRScanner = () => {
  // eslint-disable-next-line no-unused-vars
  const { apartment, user } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Real-time updates for visitor status changes
  useEffect(() => {
    const handleVisitorCheckedIn = (data) => {
      setRecentScans(prev => [{
        ...data.visitor,
        type: 'visitor',
        action: 'checked_in',
        time: new Date()
      }, ...prev].slice(0, 5));
    };

    const handleAccessGranted = (data) => {
      setRecentScans(prev => [{
        ...data.visitor,
        type: 'visitor',
        action: 'granted',
        time: new Date()
      }, ...prev].slice(0, 5));
    };

    const handleAccessDenied = (data) => {
      setRecentScans(prev => [{
        ...data.visitor,
        type: 'visitor',
        action: 'denied',
        time: new Date()
      }, ...prev].slice(0, 5));
    };

    const handleDeliveryCollected = (data) => {
      setRecentScans(prev => [{
        ...data.delivery,
        type: 'delivery',
        action: 'collected',
        time: new Date()
      }, ...prev].slice(0, 5));
    };

    socketService.onVisitorCheckedIn(handleVisitorCheckedIn);
    socketService.onAccessGranted(handleAccessGranted);
    socketService.onAccessDenied(handleAccessDenied);
    socketService.onDeliveryCollected(handleDeliveryCollected);

    return () => {
      socketService.removeListener('visitor:checked_in', handleVisitorCheckedIn);
      socketService.removeListener('access:granted', handleAccessGranted);
      socketService.removeListener('access:denied', handleAccessDenied);
      socketService.removeListener('delivery:collected', handleDeliveryCollected);
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);
      setResult(null); // Clear previous results when starting new scan
    } catch (error) {
      console.error('Camera error:', error);
      // Provide more helpful error messages
      if (error.name === 'NotAllowedError') {
        setResult({ success: false, message: 'Camera access denied. Please allow camera permissions in your browser settings and try again, or use manual entry below.' });
      } else if (error.name === 'NotFoundError') {
        setResult({ success: false, message: 'No camera found. Please connect a camera and try again, or use manual entry below.' });
      } else if (error.name === 'NotReadableError') {
        setResult({ success: false, message: 'Camera is in use by another app. Please close other apps using the camera and try again.' });
      } else {
        setResult({ success: false, message: 'Unable to access camera. Please use manual entry below.' });
      }
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  // Simulate QR scan (in production, use a QR library)
  const simulateScan = async (code) => {
    setProcessing(true);
    setResult(null);
    
    try {
      // Detect if it's a visitor or delivery QR code
      const isVisitorQR = code.startsWith('VIS-') || code.includes('"type":"visitor"');
      const isDeliveryQR = code.startsWith('DEL-') || code.includes('"type":"delivery"');
      
      if (isVisitorQR || (!isDeliveryQR)) {
        // Try visitor verification first (default)
        try {
          const response = await visitorsAPI.verifyQR(code);
          const { visitor, canAccess, action, message } = response.data;
          
          if (canAccess || action === 'checked_in') {
            setResult({
              success: true,
              type: 'visitor',
              visitor,
              message: message || `Welcome, ${visitor?.name}!`,
              action: action || 'checked_in'
            });
            setRecentScans(prev => [{
              ...visitor,
              type: 'visitor',
              action: 'checked_in',
              time: new Date()
            }, ...prev].slice(0, 5));
            setProcessing(false);
            return;
          } else {
            setResult({
              success: false,
              type: 'visitor',
              visitor,
              message: message || (visitor?.status === 'denied' 
                ? 'Access denied' 
                : visitor?.status === 'pending'
                  ? 'Pending approval'
                  : 'Visitor not found or not approved'),
              action: action || 'denied'
            });
            setProcessing(false);
            return;
          }
        } catch (visitorError) {
          // If visitor verification fails, try delivery
          console.log('Not a visitor QR, trying delivery:', visitorError.message);
        }
      }
      
      // Try delivery verification
      try {
        const response = await deliveriesAPI.verifyQR(code);
        const { delivery, canAccess, action, message } = response.data;
        
        if (canAccess || action === 'collected') {
          setResult({
            success: true,
            type: 'delivery',
            delivery,
            message: message || `Package collected by ${delivery?.courierName}!`,
            action: action || 'collected'
          });
          setRecentScans(prev => [{
            ...delivery,
            type: 'delivery',
            action: 'collected',
            time: new Date()
          }, ...prev].slice(0, 5));
        } else {
          setResult({
            success: false,
            type: 'delivery',
            delivery,
            message: message || (delivery?.status === 'delivered' 
              ? 'Already collected' 
              : delivery?.status === 'returned'
                ? 'Package returned'
                : 'Cannot collect'),
            action: action || 'denied'
          });
        }
      } catch (deliveryError) {
        setResult({
          success: false,
          message: 'Invalid QR code - not recognized as visitor or delivery'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Invalid QR code'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Manual code entry
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      simulateScan(manualCode.trim());
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getResultColor = (success, action) => {
    if (!success) return COLORS.accent;
    if (action === 'checked_in' || action === 'granted') return COLORS.secondary;
    return COLORS.accent;
  };

  return (
    <>
    <div className="scanner-container" style={{ 
      padding: '24px', 
      maxWidth: '800px', 
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Header */}
      <div className="scanner-header" style={{ marginBottom: '24px' }}>
        <Link to="/guard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: COLORS.dark }}>QR Code Scanner</h1>
        <p style={{ margin: '8px 0 0', color: COLORS.gray[500] }}>
          Scan visitor QR codes for quick check-in
        </p>
      </div>

      {/* Responsive Grid - 1 column on mobile, 2 on desktop */}
      <div className="scanner-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px',
        width: '100%'
      }}>
        {/* Scanner Section */}
        <div style={{ width: '100%' }}>
          {/* Camera Preview */}
          <div style={{ 
            background: COLORS.dark, 
            borderRadius: '16px', 
            overflow: 'hidden',
            marginBottom: '16px',
            aspectRatio: '1',
            maxWidth: '400px',
            margin: '0 auto 16px auto'
          }}>
            {scanning ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Scanning overlay */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  border: `3px solid ${COLORS.primary}`,
                  borderRadius: '16px',
                  boxShadow: `0 0 0 9999px rgba(0,0,0,0.5)`
                }} />
              </>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                color: COLORS.white
              }}>
                <QrCode size={64} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>Camera not active</p>
              </div>
            )}
          </div>

          {/* Scanner Controls */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={scanning ? stopCamera : startCamera}
              style={{
                flex: 1,
                padding: '14px',
                background: scanning ? COLORS.accent : COLORS.primary,
                border: 'none',
                borderRadius: '10px',
                color: COLORS.white,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {scanning ? (
                <><Camera size={18} /> Stop Scanning</>
              ) : (
                <><Camera size={18} /> Start Scanner</>
              )}
            </motion.button>
          </div>

          {/* Manual Entry */}
          <div style={{ 
            background: COLORS.white, 
            borderRadius: '12px', 
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: COLORS.dark }}>
              Manual Entry
            </h3>
            <form onSubmit={handleManualSubmit} className="manual-entry-form" style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="qr-code-input" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: COLORS.gray[600] }}>
                  Enter QR Code
                </label>
                <input
                  id="qr-code-input"
                  name="qrCode"
                  type="text"
                  autoComplete="off"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter QR code..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${COLORS.gray[200]}`,
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={processing || !manualCode.trim()}
                  style={{
                    padding: '10px 16px',
                    background: COLORS.primary,
                    border: 'none',
                    borderRadius: '8px',
                    color: COLORS.white,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: processing ? 'not-allowed' : 'pointer',
                    opacity: processing ? 0.7 : 1
                  }}
                >
                  Verify
                </motion.button>
              </div>
            </form>
          </div>
        </div>

        {/* Result & Recent Scans */}
        <div style={{ width: '100%' }}>
          {/* Result Display */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: COLORS.white,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${getResultColor(result.success, result.action)}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {result.success ? (
                  <Check size={32} color={COLORS.secondary} />
                ) : (
                  <X size={32} color={COLORS.accent} />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: COLORS.dark }}>
                    {result.success ? 'Access Granted' : 'Access Denied'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: COLORS.gray[500] }}>
                    {result.message}
                  </p>
                </div>
              </div>

              {result.visitor && (
                <div style={{ 
                  background: COLORS.gray[50], 
                  borderRadius: '8px', 
                  padding: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '13px', color: COLORS.gray[600], marginBottom: '4px' }}>
                    <strong>{result.visitor.name}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.gray[500] }}>
                    {result.visitor.phone} • Room {result.visitor.roomNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.gray[500], marginTop: '4px', textTransform: 'capitalize' }}>
                    Purpose: {result.visitor.purpose}
                  </div>
                </div>
              )}

              {result.delivery && (
                <div style={{ 
                  background: COLORS.gray[50], 
                  borderRadius: '8px', 
                  padding: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '13px', color: COLORS.gray[600], marginBottom: '4px' }}>
                    <Package size={14} style={{ marginRight: '4px' }} />
                    <strong>{result.delivery.parcelDescription}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.gray[500] }}>
                    {result.delivery.courierName} ({result.delivery.courierCompany}) • Room {result.delivery.roomNumber}
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setResult(null)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: COLORS.gray[100],
                  border: 'none',
                  borderRadius: '8px',
                  color: COLORS.gray[700],
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Clear Result
              </motion.button>
            </motion.div>
          )}

          {/* Recent Scans */}
          <div style={{ 
            background: COLORS.white, 
            borderRadius: '12px', 
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: COLORS.dark }}>
              Recent Scans
            </h3>
            
            {recentScans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: COLORS.gray[400] }}>
                <RefreshCw size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>No recent scans</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentScans.map((scan, index) => (
                  <div 
                    key={scan._id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      background: scan.action === 'checked_in' || scan.action === 'granted' || scan.action === 'collected'
                        ? COLORS.secondary + '10' 
                        : scan.action === 'denied' 
                          ? COLORS.accent + '10' 
                          : COLORS.gray[50],
                      borderRadius: '8px'
                    }}
                  >
                    {scan.type === 'delivery' ? (
                      <Package size={16} color={COLORS.secondary} />
                    ) : scan.action === 'checked_in' || scan.action === 'granted' ? (
                      <Check size={16} color={COLORS.secondary} />
                    ) : (
                      <X size={16} color={COLORS.accent} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: COLORS.dark }}>
                        {scan.name || scan.courierName || scan.parcelDescription || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '11px', color: COLORS.gray[500] }}>
                        {scan.type === 'delivery' ? 'Delivery' : 'Visitor'} • {scan.time?.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    </>
  );
};

export default GuardQRScanner;
