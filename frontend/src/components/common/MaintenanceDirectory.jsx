import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';
import { 
  Search, 
  Phone, 
  Mail, 
  Camera, 
  Send,
  X,
  Wrench,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';
import { maintenanceAPI } from '../../services/api';
import socketService from '../../services/socket';

const MaintenanceDirectory = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [imageSent, setImageSent] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const response = await maintenanceAPI.getStaff();
      setStaff(response.data.staff || response.data || []);
    } catch (err) {
      console.error('Error fetching maintenance staff:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    const handleMaintenanceCreated = (data) => {
      if (data.maintenanceStaff) {
        setStaff(prev => [...prev, data.maintenanceStaff]);
      }
    };

    const handleMaintenanceUpdated = (data) => {
      if (data.maintenanceStaff) {
        setStaff(prev => prev.map(s => s._id === data.maintenanceStaff._id ? data.maintenanceStaff : s));
      }
    };

    socketService.onMaintenanceCreated(handleMaintenanceCreated);
    socketService.onMaintenanceUpdated(handleMaintenanceUpdated);

    return () => {
      socketService.removeListener('maintenance:created', handleMaintenanceCreated);
      socketService.removeListener('maintenance:updated', handleMaintenanceUpdated);
    };
  }, []);

  const sendMessage = async () => {
    if (!contactMessage.trim() || !selectedStaff?._id) return;
    
    setSendingMessage(true);
    try {
      await maintenanceAPI.sendMessage(selectedStaff._id, {
        message: contactMessage,
        from: user?.name,
        role: user?.role
      });
      setMessageSent(true);
      setTimeout(() => {
        setShowContactModal(false);
        setContactMessage('');
        setMessageSent(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const sendImage = async () => {
    if (!selectedPhoto || !selectedStaff?._id) return;
    
    setSendingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedPhoto);
      formData.append('from', user?.name);
      formData.append('role', user?.role);
      
      await maintenanceAPI.sendImage(selectedStaff._id, formData);
      setImageSent(true);
      setTimeout(() => {
        setSelectedPhoto(null);
        setPhotoPreview(null);
        setImageSent(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending image:', error);
      alert('Failed to send image. Please try again.');
    } finally {
      setSendingImage(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = !searchTerm || 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.includes(searchTerm) ||
      s.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const containerStyle = {
    padding: isMobile ? '12px' : '20px',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%'
  };

  const cardStyle = {
    background: '#FFFFFF',
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '16px'
  };

  return (
    <div style={containerStyle}>
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
          <Wrench size={32} color={COLORS.primary} />
          Maintenance Team
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#4B5563'
        }}>
          Contact maintenance staff directly - call, email, or send photos
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ ...cardStyle, padding: isMobile ? '12px' : '16px' }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search 
            size={18} 
            color="#9CA3AF" 
            style={{ 
              position: 'absolute', 
              left: '14px',
              pointerEvents: 'none'
            }} 
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, specialization, or phone..."
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              borderRadius: '12px',
              border: '2px solid #1f1f21',
              background: '#FFFFFF',
              color: '#1F2937',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = COLORS.primary}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>
        <div style={{ marginTop: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
            {filteredStaff.length} maintenance staff available
          </span>
        </div>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E5E7EB',
            borderTopColor: COLORS.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '12px', color: '#6B7280', fontSize: '14px' }}>Loading maintenance team...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}
        >
          <Wrench size={48} color="#9CA3AF" style={{ marginBottom: '12px' }} />
          <p style={{ margin: 0, fontSize: '16px', color: '#6B7280' }}>
            No maintenance staff available
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <AnimatePresence>
            {filteredStaff.map((s, index) => (
              <motion.div
                key={s._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedStaff(s)}
                style={{
                  ...cardStyle,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: selectedStaff?._id === s._id ? `2px solid ${COLORS.primary}` : '2px solid transparent'
                }}
                whileHover={{ transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: isMobile ? '48px' : '56px',
                    height: isMobile ? '48px' : '56px',
                    borderRadius: '16px',
                    background: '#F59E0B15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{
                      fontSize: isMobile ? '18px' : '22px',
                      fontWeight: 700,
                      color: '#F59E0B'
                    }}>
                      {s.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'M'}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
                      {s.name}
                    </h3>
                    
                    {s.specialization && (
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#F59E0B', 
                        background: '#FEF3C7',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        display: 'inline-block',
                        marginTop: '4px'
                      }}>
                        {s.specialization}
                      </span>
                    )}

                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row', 
                      gap: isMobile ? '4px' : '16px',
                      marginTop: '6px'
                    }}>
                      {s.phone && (
                        <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {s.phone}
                        </span>
                      )}
                      {s.email && (
                        <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} /> {s.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: s.isActive ? '#10B981' : '#9CA3AF'
                    }}></div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {s.isActive ? 'Available' : 'Busy'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selectedStaff && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStaff(null)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#000',
                zIndex: 999
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: '#FFFFFF',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px',
                zIndex: 1001,
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              <button
                onClick={() => setSelectedStaff(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#F3F4F6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} color="#6B7280" />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '20px',
                  background: '#F59E0B15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#F59E0B'
                  }}>
                    {selectedStaff.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'M'}
                  </span>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1F2937' }}>
                    {selectedStaff.name}
                  </h2>
                  {selectedStaff.specialization && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#F59E0B', 
                      background: '#FEF3C7',
                      padding: '2px 10px',
                      borderRadius: '10px',
                      display: 'inline-block',
                      marginTop: '4px'
                    }}>
                      {selectedStaff.specialization}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedStaff.phone && (
                  <a
                    href={`tel:${selectedStaff.phone}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      background: '#F9FAFB',
                      borderRadius: '12px',
                      textDecoration: 'none'
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#10B98115',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Phone size={20} color="#10B981" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Call</p>
                      <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                        {selectedStaff.phone}
                      </p>
                    </div>
                  </a>
                )}

                {selectedStaff.email && (
                  <a
                    href={`mailto:${selectedStaff.email}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      background: '#F9FAFB',
                      borderRadius: '12px',
                      textDecoration: 'none'
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#3B82F615',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Mail size={20} color="#3B82F6" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Email</p>
                      <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                        {selectedStaff.email}
                      </p>
                    </div>
                  </a>
                )}
              </div>

              <button
                onClick={() => setShowContactModal(true)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: COLORS.primary,
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <MessageSquare size={20} />
                Send Message / Photo
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showContactModal && selectedStaff && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
          onClick={() => setShowContactModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
                Contact {selectedStaff.name}
              </h2>
              <button
                onClick={() => setShowContactModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>

            {messageSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: '#D1FAE5',
                  borderRadius: '12px',
                  color: '#065F46'
                }}
              >
                <MessageSquare size={32} style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Message sent successfully!</p>
              </motion.div>
            ) : imageSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: '#D1FAE5',
                  borderRadius: '12px',
                  color: '#065F46'
                }}
              >
                <ImageIcon size={32} style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Image sent successfully!</p>
              </motion.div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
                    <MessageSquare size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Send Message
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      marginBottom: '12px'
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!contactMessage.trim() || sendingMessage}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: sendingMessage ? '#9CA3AF' : '#10B981',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: sendingMessage ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {sendingMessage ? 'Sending...' : <><Send size={16} /> Send Message</>}
                  </button>
                </div>

                <div style={{ 
                  borderTop: '1px solid #E5E7EB', 
                  paddingTop: '16px',
                  marginTop: '8px'
                }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
                    <Camera size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Send Photo
                  </label>
                  
                  {photoPreview ? (
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <img
                        src={photoPreview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                      <button
                        onClick={() => { setSelectedPhoto(null); setPhotoPreview(null); }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#EF4444',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        border: '2px dashed #E5E7EB',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: '#F9FAFB',
                        marginBottom: '12px'
                      }}
                    >
                      <Camera size={24} color="#9CA3AF" style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '14px', color: '#6B7280' }}>Tap to select photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                  
                  <button
                    onClick={sendImage}
                    disabled={!selectedPhoto || sendingImage}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: sendingImage ? '#9CA3AF' : '#3B82F6',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: sendingImage ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {sendingImage ? 'Sending...' : <><ImageIcon size={16} /> Send Photo</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MaintenanceDirectory;