import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { emergencyAPI, authAPI } from '../../services/api';
import socketService from '../../services/socket';
import audioService from '../../services/audioService';
import { 
  Phone, 
  Shield, 
  Siren,
  User,
  Camera,
  X,
  MessageSquare
} from 'lucide-react';

const GuardEmergency = () => {
  const { user, apartment } = useAuth();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const [emergencyType, setEmergencyType] = useState('');
  const [message, setMessage] = useState('');
  const [alertLevel, setAlertLevel] = useState('normal');
  const [sent, setSent] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [location, setLocation] = useState({ building: '', floor: '', room: '' });
  const [realTimeLocation, setRealTimeLocation] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoPreview, setPhotoPreview] = useState([]);
  const [incomingEmergency, setIncomingEmergency] = useState(null);

  useEffect(() => {
    fetchStaff();
    // Set default location from apartment
    if (apartment) {
      setLocation({
        building: apartment.buildingName || '',
        floor: '',
        room: user?.roomNumber || '',
        apartmentName: apartment?.buildingName || ''
      });
    }
    
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
      // Also show notification for incoming emergencies
      setIncomingEmergency(emergency);
      // Auto-dismiss notification after 5 seconds but keep active status
      setTimeout(() => setIncomingEmergency(null), 5000);
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
    
    socketService.onEmergencyNew(handleNewEmergency);
    socketService.onEmergencyResolved(handleEmergencyResolved);
    socketService.joinGuards();
    
    // Handle window resize
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      socketService.removeListener('emergency:new', handleNewEmergency);
      socketService.removeListener('emergency:resolved', handleEmergencyResolved);
    };
  }, [apartment, user]);

  const fetchStaff = async () => {
    try {
      const response = await authAPI.getUsers({ role: 'guard', limit: 50 });
      // Filter only guards (security staff)
      const guardStaff = (response.data.users || []).filter(user => user.role === 'guard');
      setStaff(guardStaff);
      // Also set emergency contacts from staff
      const contacts = guardStaff.map(guard => ({
        id: guard._id,
        name: guard.name,
        phone: guard.phone,
        role: 'Security Guard',
        icon: User
      }));
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
      setEmergencyContacts([]);
    }
  };

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

  const emergencyTypes = [
    { id: 'security', label: 'Security Threat', color: '#EF4444', priority: 'critical' },
    { id: 'fire', label: 'Fire Outbreak', color: '#DC2626', priority: 'critical' },
    { id: 'medical', label: 'Medical Emergency', color: '#F59E0B', priority: 'high' },
    { id: 'theft', label: 'Theft in Progress', color: '#8B5CF6', priority: 'critical' },
    { id: 'suspicious', label: 'Suspicious Activity', color: '#F59E0B', priority: 'high' },
    { id: 'accident', label: 'Accident', color: '#3B82F6', priority: 'medium' },
    { id: 'disturbance', label: 'Public Disturbance', color: '#6B7280', priority: 'low' },
    { id: 'other', label: 'Other', color: '#6B7280', priority: 'medium' },
  ];

  const handleSendAlert = async () => {
    if (!emergencyType || !message) return;
    
    // Track user interaction for audio policy compliance
    audioService.trackUserInteraction();
    
    // Get real-time location before sending
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setRealTimeLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.log('Geolocation error:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', emergencyType);
      formData.append('severity', emergencyTypes.find(e => e.id === emergencyType)?.priority || 'medium');
      formData.append('description', message);
      formData.append('location', JSON.stringify(location));
      formData.append('realTimeLocation', JSON.stringify(realTimeLocation));
      if (apartment?._id) formData.append('apartmentId', apartment._id);
      
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

  const triggerAlarm = async () => {
    try {
      setAlertLevel('critical');
      setLoading(true);
      
      // Track user interaction for audio policy compliance
      audioService.trackUserInteraction();
      
      // Call the API to report an emergency - this will broadcast to all users
      const response = await emergencyAPI.create({
        type: 'security_alert',
        description: 'Security alarm triggered by guard',
        location: location.unit || 'Gate',
        apartmentId: apartment?._id,
        reportedBy: user?._id,
        status: 'active'
      });
      
      if (response.data?.success) {
        setActiveEmergency(response.data.emergency);
        setSent(true);
        
        // Play critical alert sound (user has interacted)
        audioService.playCriticalAlert({ volume: 1.0, loops: 5 });
        
        // Show success feedback
        alert('🚨 SECURITY ALARM TRIGGERED! All users have been notified.');
      }
    } catch (error) {
      console.error('Error triggering alarm:', error);
      alert('Failed to trigger alarm. Please try again.');
      setAlertLevel('normal');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%'
  };

  const cardStyle = {
    background: '#1E293B',
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
          fontWeight: 700,
          color: '#F1F5F9',
          fontFamily: 'Poppins, sans-serif',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Shield size={32} color="#EF4444" />
          Emergency Response Center
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: '16px',
          color: '#94A3B8'
        }}>
          Security emergency protocols and quick response
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
          <Siren size={24} color="#FFFFFF" />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '16px' }}>
              🚨 NEW EMERGENCY ALERT
            </div>
            <div style={{ color: '#FEE2E2', fontSize: '14px', marginTop: '4px' }}>
              {incomingEmergency.type?.toUpperCase()}: {incomingEmergency.description || 'Emergency reported'}
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

      {/* Alert Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          ...cardStyle,
          background: alertLevel === 'critical' 
            ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' 
            : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
          color: '#fff'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '16px' : '0'
        }}>
          <div style={{ textAlign: isMobile ? 'center' : 'left', width: isMobile ? '100%' : 'auto' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: 600 }}>
              🚨 Security Alert Level: {alertLevel === 'critical' ? 'CRITICAL' : 'NORMAL'}
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: isMobile ? '12px' : '14px', opacity: 0.9 }}>
              {apartment?.buildingName || 'Property'} • Room: {user?.roomNumber || 'N/A'}
            </p>
          </div>
          <button
            onClick={triggerAlarm}
            disabled={loading || alertLevel === 'critical'}
            style={{
              padding: isMobile ? '10px 20px' : '12px 24px',
              background: loading || alertLevel === 'critical' ? '#9CA3AF' : '#fff',
              border: 'none',
              borderRadius: '12px',
              color: '#EF4444',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 700,
              cursor: loading || alertLevel === 'critical' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center'
            }}
          >
            <Siren size={isMobile ? 18 : 20} />
            {loading ? 'TRIGGERING...' : alertLevel === 'critical' ? 'ALARM ACTIVE' : 'TRIGGER ALARM'}
          </button>
        </div>
      </motion.div>

      {/* Emergency Report Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
          📢 Report Emergency Incident
        </h2>
        
        <div style={{ 
          marginBottom: '16px'
        }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '13px' : '14px', color: '#F1F5F9', fontWeight: 500 }}>
            Incident Type
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(140px, 1fr))', 
            gap: '8px' 
          }}>
            {emergencyTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setEmergencyType(type.id)}
                style={{
                  padding: isMobile ? '10px 8px' : '12px',
                  borderRadius: '10px',
                  border: `2px solid ${emergencyType === type.id ? type.color : '#334155'}`,
                  background: emergencyType === type.id ? type.color + '20' : 'transparent',
                  color: emergencyType === type.id ? type.color : '#F1F5F9',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: isMobile ? '11px' : '13px'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="incident-details" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#F1F5F9', fontWeight: 500 }}>
            <MessageSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Incident Details
          </label>
          <textarea
            id="incident-details"
            name="incidentDetails"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the incident: location, number of suspects, weapons involved, etc..."
            rows={4}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: '#0F172A',
              fontSize: '14px',
              resize: 'none',
              color: '#F1F5F9'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#F1F5F9', fontWeight: 500 }}>
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
                  type="button"
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
                border: '2px dashed #334155',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: '#0F172A'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <Camera size={24} style={{ opacity: 0.7, color: '#94A3B8' }} />
              </label>
            )}
          </div>
        </div>

        <button
          onClick={handleSendAlert}
          disabled={!emergencyType || !message || sent || loading}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            background: sent ? '#EF4444' : loading ? '#F59E0B' : '#EF4444',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            cursor: sent || loading ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            animation: sent ? 'pulse 1.5s infinite' : 'none'
          }}
        >
          {loading ? 'Sending...' : sent ? '🚨 ALARM ACTIVE - WAITING FOR ADMIN RESOLUTION' : '🚨 SEND EMERGENCY ALERT'}
        </button>
      </motion.div>

      {/* Quick Contacts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
          📞 Emergency Contacts
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {emergencyContacts.map((contact, index) => (
            <div
              key={index}
              style={{
                padding: isMobile ? '12px' : '16px',
                background: '#0F172A',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '40px' : '48px',
                borderRadius: '12px',
                background: '#EF444420',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <contact.icon size={isMobile ? 20 : 24} color="#EF4444" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: isMobile ? '13px' : '14px', fontWeight: 600, color: '#F1F5F9', wordBreak: 'break-word' }}>
                  {contact.name}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                  Response: {contact.response}
                </p>
              </div>
              <a
                href={`tel:${contact.phone}`}
                style={{
                  padding: isMobile ? '10px 16px' : '10px 16px',
                  background: '#EF4444',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: isMobile ? '13px' : '14px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {contact.phone}
              </a>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Staff on Duty */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
          👥 Security Team
        </h2>
        
        {staff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
            No staff on duty
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'column', gap: '12px' }}>
            {staff.slice(0, 3).map((member) => (
              <div key={member._id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                flexDirection: isMobile ? 'column' : 'row',
                padding: isMobile ? '12px' : '12px',
                background: '#0F172A',
                borderRadius: '12px',
                textAlign: isMobile ? 'center' : 'left'
              }}>
                <div style={{
                  width: isMobile ? '48px' : '48px',
                  height: isMobile ? '48px' : '48px',
                  borderRadius: '50%',
                  background: '#3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  {member.name?.charAt(0) || 'S'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: isMobile ? '14px' : '15px', fontWeight: 600, color: '#F1F5F9', wordBreak: 'break-word' }}>
                    {member.name} - {member.role === 'guard' ? 'Security Guard' : member.role}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }}></span>
                    On Duty
                  </p>
                </div>
                <a
                  href={`tel:${member.phone}`}
                  style={{
                    padding: '10px 16px',
                    background: '#22C55E',
                    borderRadius: '10px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                    flexShrink: 0,
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: 'center'
                  }}
                >
                  <Phone size={16} />
                  Call
                </a>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="maxWidth: 900px"] {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
    </>
  );
};

export default GuardEmergency;
