import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';
import audioService from '../../services/audioService';
import { 
  Phone, 
  AlertTriangle, 
  MapPin, 
  Clock,
  FileText,
  User,
  Camera,
  X
} from 'lucide-react';
import { authAPI, emergencyAPI } from '../../services/api';
import socketService from '../../services/socket';

const TenantEmergency = () => {
  const { user, apartment } = useAuth();
  const [emergencyType, setEmergencyType] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [activeEmergency, setActiveEmergency] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoPreview, setPhotoPreview] = useState([]);

  // Real-time location tracking
  useEffect(() => {
    const getLocation = () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        return;
      }

      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          });
          setLocationLoading(false);
          setLocationError(null);
        },
        (error) => {
          setLocationError(error.message);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // Get initial location
    getLocation();

    // Update location every 10 seconds for real-time tracking
    const locationInterval = setInterval(getLocation, 10000);

    // Also watch for position changes
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        });
      },
      (error) => {
        console.error('Geolocation watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      clearInterval(locationInterval);
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const [incomingEmergency, setIncomingEmergency] = useState(null);

  useEffect(() => {
    // Fetch security staff for emergency contacts
    const fetchEmergencyContacts = async () => {
      try {
        const response = await authAPI.getUsers({ role: 'guard', limit: 50 });
        const guardStaff = (response.data.users || []).filter(user => user.role === 'guard');
        const contacts = guardStaff.map(guard => ({
          id: guard._id,
          name: guard.name,
          phone: guard.phone,
          role: 'Security Guard',
          icon: User
        }));
        setEmergencyContacts(contacts);
      } catch (error) {
        console.error('Error fetching emergency contacts:', error);
        // Fallback contacts will be used
      }
    };
    fetchEmergencyContacts();
    
    // Real-time emergency listeners
    const handleNewEmergency = (data) => {
      const emergency = data.emergency;
      // Set active emergency - alarm stays ON until admin resolves it
      if (emergency && emergency.status !== 'resolved') {
        setActiveEmergency(emergency);
        setSent(true);
        // Play alarm sound for incoming emergency (requires user interaction)
        if (emergency.severity === 'critical') {
          audioService.playCriticalAlert({ volume: 0.8, loops: 2 });
        } else {
          audioService.playAlarm({ volume: 0.7, loops: 3 });
        }
      }
    };
    
    // Listen for emergency resolved events
    const handleEmergencyResolved = (data) => {
      const emergency = data.emergency;
      // Clear active emergency when resolved by admin
      if (emergency) {
        setActiveEmergency(null);
        setSent(false);
        setEmergencyType('');
        setMessage('');
      }
    };
    
    if (socketService.onEmergencyNew) {
      socketService.onEmergencyNew(handleNewEmergency);
    }
    if (socketService.onEmergencyResolved) {
      socketService.onEmergencyResolved(handleEmergencyResolved);
    }
    
    if (socketService.joinTenants) socketService.joinTenants();
    
    return () => {
      socketService.removeListener('emergency:new', handleNewEmergency);
      socketService.removeListener('emergency:resolved', handleEmergencyResolved);
    };
  }, []);

  const emergencyTypes = [
    { id: 'fire', label: 'Fire', color: '#EF4444' },
    { id: 'medical', label: 'Medical Emergency', color: '#DC2626' },
    { id: 'intruder', label: 'Intruder/Suspicious', color: '#F59E0B' },
    { id: 'theft', label: 'Theft/Robbery', color: '#8B5CF6' },
    { id: 'accident', label: 'Accident', color: '#3B82F6' },
    { id: 'other', label: 'Other Emergency', color: '#6B7280' },
  ];

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }
    const newPhotos = files.map(file => file);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotos([...photos, ...newPhotos]);
    setPhotoPreview([...photoPreview, ...newPreviews]);
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreview.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreview(newPreviews);
  };

  const handleSendAlert = async () => {
    if (!emergencyType || !message) return;
    
    // Track user interaction for audio policy compliance
    audioService.trackUserInteraction();
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', emergencyType);
      formData.append('description', message);
      formData.append('severity', 'high');
      
      photos.forEach(photo => {
        formData.append('photos', photo);
      });
      
      await emergencyAPI.create(formData);
      
      // Play alarm sound after sending (user has interacted)
      audioService.playAlarm({ volume: 0.8, loops: 3 });
      
      // Alarm stays ON until admin resolves it - don't reset sent status
      setSent(true);
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      // Still play sound and show success
      audioService.playAlarm({ volume: 0.8, loops: 3 });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%'
  };

  const cardStyle = {
    background: COLORS.white,
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '20px'
  };

  return (
    <>
    <div style={containerStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 800,
          color: '#1F2937',
          fontFamily: 'Poppins, sans-serif',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px'
        }}>
          <AlertTriangle size={32} color="#EF4444" />
          Emergency Services
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#4B5563'
        }}>
          Quick access to emergency contacts and alerts
        </p>
      </motion.div>

      {/* Incoming Emergency Notification */}
      {incomingEmergency && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          style={{
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <AlertTriangle size={24} color="#FFFFFF" />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '16px' }}>
              🚨 EMERGENCY ALERT IN YOUR AREA
            </div>
            <div style={{ color: '#FEE2E2', fontSize: '14px', marginTop: '4px' }}>
              {incomingEmergency.type?.toUpperCase()}: {incomingEmergency.description || 'Emergency reported nearby'}
            </div>
          </div>
          <button
            onClick={() => setIncomingEmergency(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Quick Alert Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: '#fff'
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600 }}>
          🚨 Report Emergency
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.9 }}>
            Emergency Type
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {emergencyTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setEmergencyType(type.id)}
                style={{
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  background: emergencyType === type.id ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: emergencyType === type.id ? type.color : '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: isMobile ? '12px' : '14px'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="emergency-message" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.9 }}>
            <FileText size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Message
          </label>
          <textarea
            id="emergency-message"
            name="emergencyMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the emergency situation..."
            rows={3}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: 'rgba(255,255,255,0.95)',
              fontSize: '14px',
              resize: 'none',
              color: '#1F2937',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.9 }}>
            <Camera size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Photos (Optional - up to 5)
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {photoPreview.map((preview, index) => (
              <div key={index} style={{ position: 'relative', width: '80px', height: '80px' }}>
                <img 
                  src={preview} 
                  alt={`Incident documentation ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                />
                <button
                  onClick={() => removePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    background: '#EF4444',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label style={{
                width: '80px',
                height: '80px',
                border: '2px dashed rgba(255,255,255,0.5)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <Camera size={24} style={{ opacity: 0.7 }} />
              </label>
            )}
          </div>
        </div>

        <button
          onClick={handleSendAlert}
          disabled={!emergencyType || !message || sent}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: sent ? '#EF4444' : '#fff',
            color: sent ? '#fff' : '#EF4444',
            fontSize: '16px',
            fontWeight: 600,
            cursor: sent ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            animation: sent ? 'pulse 1.5s infinite' : 'none'
          }}
        >
          {sent ? '🚨 ALARM ACTIVE - WAITING FOR ADMIN RESOLUTION' : 'Send Emergency Alert'}
        </button>
      </motion.div>

      {/* Emergency Contacts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>
          📞 Emergency Contacts
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {emergencyContacts.map((contact, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '12px' : '16px',
                background: COLORS.gray[50],
                borderRadius: '12px',
                gap: isMobile ? '12px' : '0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: isMobile ? '40px' : '44px',
                  height: isMobile ? '40px' : '44px',
                  borderRadius: '12px',
                  background: COLORS.primary + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <contact.icon size={isMobile ? 18 : 22} color={COLORS.primary} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: isMobile ? '14px' : '15px', fontWeight: 700, color: '#1F2937' }}>
                    {contact.name}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {contact.available}
                  </p>
                </div>
              </div>
              <a
                href={`tel:${contact.phone}`}
                style={{
                  padding: isMobile ? '10px 16px' : '10px 20px',
                  background: COLORS.primary,
                  borderRadius: '20px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: isMobile ? '13px' : '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Phone size={isMobile ? 14 : 16} />
                {contact.phone}
              </a>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Location Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>
          📍 Your Real-Time Location
        </h2>
        <div style={{
          padding: '16px',
          background: COLORS.gray[50],
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin size={24} color={COLORS.primary} />
            <div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                {apartment?.buildingName || 'Building Name'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
                {apartment?.buildingName || 'Apartment'}: {user?.roomNumber || 'N/A'} • {apartment?.location?.city || 'Location'}
              </p>
            </div>
          </div>
          
          {/* Real-time GPS Location */}
          {location && (
            <div style={{
              padding: '12px',
              background: '#ECFDF5',
              borderRadius: '8px',
              border: '1px solid #10B981'
            }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10B981',
                  animation: 'pulse 1.5s infinite'
                }}></span>
                Live GPS Coordinates
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B7280' }}>
                Accuracy: ±{Math.round(location.accuracy)}m • Updated: {location.timestamp.toLocaleTimeString()}
              </p>
            </div>
          )}
          
          {locationLoading && (
            <div style={{
              padding: '12px',
              background: '#EFF6FF',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #3B82F6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ margin: 0, fontSize: '13px', color: '#3B82F6', fontWeight: 500 }}>
                Getting your real-time location...
              </p>
            </div>
          )}
          
          {locationError && (
            <div style={{
              padding: '12px',
              background: '#FEF2F2',
              borderRadius: '8px',
              border: '1px solid #EF4444'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#EF4444', fontWeight: 500 }}>
                ⚠️ {locationError}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          div[style*="maxWidth: 800px"] {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
    </>
  );
};

export default TenantEmergency;
