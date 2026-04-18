import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';
import { 
  Wrench, 
  Clock,
  Camera,
  Send,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { maintenanceAPI } from '../../services/api';
import socketService from '../../services/socket';

const MAINTENANCE_CATEGORIES = [
  { id: 'plumbing', label: 'Plumbing', icon: '🔧', description: 'Leaks, clogs, water heater issues' },
  { id: 'electrical', label: 'Electrical', icon: '⚡', description: 'Power outages, outlets, wiring' },
  { id: 'hvac', label: 'HVAC', icon: '❄️', description: 'AC, heating, ventilation issues' },
  { id: 'appliance', label: 'Appliances', icon: '🔌', description: 'Refrigerator, washer, dryer' },
  { id: 'structural', label: 'Structural', icon: '🏠', description: 'Walls, floors, ceilings, doors' },
  { id: 'pest', label: 'Pest Control', icon: '🐛', description: 'Insects, rodents, pests' },
  { id: 'other', label: 'Other', icon: '📋', description: 'Other maintenance issues' }
];

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low', description: 'Non-urgent, can wait a few days', color: '#10B981' },
  { id: 'medium', label: 'Medium', description: 'Should be addressed soon', color: '#F59E0B' },
  { id: 'high', label: 'High', description: 'Urgent, needs quick attention', color: '#EF4444' },
  { id: 'emergency', label: 'Emergency', description: 'Critical issue requiring immediate action', color: '#DC2626' }
];

const TenantMaintenance = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [photos, setPhotos] = useState([]);
  const [photoPreview, setPhotoPreview] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchMyRequests();
    
    const handleRequestUpdated = (data) => {
      if (data.request?.reportedBy === user?._id || data.request?._id) {
        fetchMyRequests();
      }
    };
    
    socketService.onMaintenanceCreated((data) => {
      if (data.request?.reportedBy === user?._id) {
        fetchMyRequests();
      }
    });
    
    socketService.onMaintenanceUpdated(handleRequestUpdated);
    
    const interval = setInterval(() => {
      fetchMyRequests();
    }, 30000);
    
    return () => {
      socketService.removeListener('maintenance:created', fetchMyRequests);
      socketService.removeListener('maintenance:updated', handleRequestUpdated);
      clearInterval(interval);
    };
  }, [user?._id]);

  const fetchMyRequests = async () => {
    try {
      const response = await maintenanceAPI.getMyRequests();
      setMyRequests(response.data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }
    
    const newPhotos = files.map(file => file);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    
    setPhotos([...photos, ...newPhotos]);
    setPhotoPreview([...photoPreview, ...newPreviews]);
    setError('');
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreview.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreview(newPreviews);
  };

  const handleSubmit = async () => {
    if (!category || !description) {
      setError('Please select a category and describe the issue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      formData.append('priority', priority);
      
      photos.forEach(photo => {
        formData.append('photos', photo);
      });

      await maintenanceAPI.create(formData);
      setSubmitted(true);
      setPhotos([]);
      setPhotoPreview([]);
      fetchMyRequests();
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
    background: '#0F172A',
    borderRadius: isMobile ? '12px' : '16px',
    minHeight: '100vh'
  };

  const cardStyle = {
    background: '#1E293B',
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    marginBottom: '20px',
    border: '1px solid #475569'
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return '#3B82F6';
      case 'resolved': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🔧';
      case 'resolved': return '✅';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'emergency': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeRequests = myRequests.filter(r => r.status !== 'resolved' && r.status !== 'cancelled');
  const resolvedRequests = myRequests.filter(r => r.status === 'resolved' || r.status === 'cancelled');

  if (submitted) {
    return (
      <div style={containerStyle}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            ...cardStyle,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF'
          }}
        >
          <CheckCircle size={64} style={{ marginBottom: '16px' }} />
          <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: 700 }}>
            Request Submitted!
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '16px', opacity: 0.9 }}>
            Your maintenance request has been submitted. You'll receive updates as it gets resolved.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setCategory('');
              setDescription('');
              setPriority('medium');
            }}
            style={{
              padding: '12px 24px',
              background: '#FFFFFF',
              color: '#10B981',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Submit Another Request
          </button>
        </motion.div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            width: '100%',
            padding: '14px',
            background: COLORS.gray[100],
            border: 'none',
            borderRadius: '12px',
            color: COLORS.gray[700],
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Clock size={18} />
          {showHistory ? 'Hide' : 'View'} My Requests ({myRequests.length})
        </button>

        {showHistory && myRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '16px' }}
          >
            {myRequests.map((request) => (
              <div
                key={request._id}
                style={{
                  ...cardStyle,
                  padding: isMobile ? '12px' : '16px',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      background: getStatusColor(request.status) + '20',
                      color: getStatusColor(request.status),
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {request.status}
                    </span>
                    <h4 style={{ margin: '8px 0 4px', fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                      {MAINTENANCE_CATEGORIES.find(c => c.id === request.category)?.label || request.category}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
                      {request.description}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    );
  }

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
          color: '#F8FAFC',
          fontFamily: 'Poppins, sans-serif',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px'
        }}>
          <Wrench size={32} color={COLORS.primary} />
          Maintenance Request
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#94A3B8'
        }}>
          Submit a request for repairs and maintenance issues
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: '#FEF2F2',
            border: '1px solid #EF4444',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <AlertCircle size={20} color="#EF4444" />
          <span style={{ color: '#EF4444', fontSize: '14px', fontWeight: 500 }}>{error}</span>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
          Type of Service
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
          {MAINTENANCE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                padding: isMobile ? '12px' : '14px',
                borderRadius: '12px',
                border: category === cat.id ? `2px solid ${COLORS.primary}` : '2px solid #475569',
                background: category === cat.id ? COLORS.primary + '20' : '#1E293B',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '20px', marginRight: '8px' }}>{cat.icon}</span>
              <span style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: 600, color: '#F8FAFC' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
          Priority Level
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {PRIORITY_LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => setPriority(level.id)}
              style={{
                padding: '10px 16px',
                borderRadius: '20px',
                border: priority === level.id ? `2px solid ${level.color}` : '2px solid #475569',
                background: priority === level.id ? level.color + '20' : '#1E293B',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: level.color
              }}></span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>
                {level.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
          Describe the Issue
        </h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please describe the issue in detail. Include location in your unit, when you noticed the problem, and any relevant details..."
          rows={4}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: '2px solid #475569',
            fontSize: '14px',
            resize: 'none',
            color: '#F1F5F9',
            fontFamily: 'inherit',
            outline: 'none',
background: '#0F172A',
              transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = COLORS.primary}
          onBlur={(e) => e.target.style.borderColor = '#475569'}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
          Add Photos (Optional)
        </h2>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            border: '2px dashed #475569',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: '#0F172A'
          }}
        >
          <Camera size={32} color="#64748B" style={{ marginBottom: '8px' }} />
          <span style={{ fontSize: '14px', color: '#CBD5E1', fontWeight: 500 }}>
            Tap to add photos
          </span>
          <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Max 5 photos
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />
        </label>

        {photoPreview.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
            {photoPreview.map((preview, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
                <button
                  onClick={() => removePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#EF4444',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleSubmit}
        disabled={!category || !description || loading}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          background: !category || !description || loading ? '#9CA3AF' : COLORS.primary,
          color: '#FFFFFF',
          fontSize: '16px',
          fontWeight: 600,
          cursor: !category || !description || loading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s ease'
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #FFFFFF',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Submitting...
          </>
        ) : (
          <>
            <Send size={20} />
            Submit Request
          </>
        )}
      </motion.button>

      {myRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: '24px' }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Clock size={20} color={COLORS.primary} />
              My Maintenance Requests
              <span style={{
                background: COLORS.primary,
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {myRequests.length}
              </span>
            </h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '2px solid #475569',
                borderRadius: '8px',
                color: '#94A3B8',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          {activeRequests.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                margin: '0 0 10px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#4B5563',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Active Requests ({activeRequests.length})
              </h4>
              {activeRequests.map((request) => (
                <motion.div
                  key={request._id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedRequest(selectedRequest?._id === request._id ? null : request)}
                  style={{
                    ...cardStyle,
                    padding: isMobile ? '14px' : '16px',
                    marginBottom: '10px',
                    borderLeft: `4px solid ${getStatusColor(request.status)}`,
                    cursor: 'pointer',
                    background: selectedRequest?._id === request._id ? '#475569' : '#334155'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          background: getStatusColor(request.status) + '20',
                          color: getStatusColor(request.status),
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {getStatusIcon(request.status)} {request.status}
                        </span>
                        <span style={{ fontSize: '14px' }}>
                          {getPriorityIcon(request.priority)} {PRIORITY_LEVELS.find(p => p.id === request.priority)?.label}
                        </span>
                      </div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#F1F5F9' }}>
                        {MAINTENANCE_CATEGORIES.find(c => c.id === request.category)?.icon}{' '}
                        {MAINTENANCE_CATEGORIES.find(c => c.id === request.category)?.label || request.category}
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>
                        {request.description.length > 80 ? request.description.substring(0, 80) + '...' : request.description}
                      </p>
                      {selectedRequest?._id === request._id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #475569' }}
                        >
                          {request.assignedTo && (
                            <div style={{ marginBottom: '12px', padding: '10px', background: '#064E3B', borderRadius: '8px' }}>
                              <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#6EE7B7', textTransform: 'uppercase', fontWeight: 600 }}>
                                Assigned Technician
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <User size={16} color="#FFFFFF" />
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#D1FAE5' }}>
                                    {request.assignedTo.name}
                                  </p>
                                  {request.assignedTo.rating && (
                                    <p style={{ margin: 0, fontSize: '11px', color: '#6EE7B7' }}>
                                      ★ {request.assignedTo.rating.toFixed(1)} rating
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#CBD5E1' }}>
                            <strong style={{ color: '#F1F5F9' }}>Full Description:</strong><br />
                            {request.description}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                            <strong style={{ color: '#94A3B8' }}>Submitted:</strong> {formatDate(request.createdAt)}
                            {request.resolvedAt && <><br /><strong style={{ color: '#94A3B8' }}>Resolved:</strong> {formatDate(request.resolvedAt)}</>}
                          </p>
                          {request.resolutionNotes && (
                            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#10B981', padding: '8px', background: '#064E3B', borderRadius: '8px' }}>
                              <strong>Resolution:</strong> {request.resolutionNotes}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {showHistory && resolvedRequests.length > 0 && (
            <div>
              <h4 style={{
                margin: '0 0 10px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Resolved ({resolvedRequests.length})
              </h4>
              {resolvedRequests.slice(0, showHistory ? undefined : 5).map((request) => (
                <div
                  key={request._id}
                  style={{
                    ...cardStyle,
                    padding: isMobile ? '12px' : '14px',
                    marginBottom: '10px',
                    borderLeft: `4px solid ${getStatusColor(request.status)}`,
                    background: '#1E293B',
                    opacity: 0.7
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{
                        background: getStatusColor(request.status) + '20',
                        color: getStatusColor(request.status),
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {getStatusIcon(request.status)} {request.status}
                      </span>
                      <h4 style={{ margin: '6px 0 4px', fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>
                        {MAINTENANCE_CATEGORIES.find(c => c.id === request.category)?.label || request.category}
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                        {request.description.length > 50 ? request.description.substring(0, 50) + '...' : request.description}
                      </p>
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {!showHistory && resolvedRequests.length > 5 && (
                <button
                  onClick={() => setShowHistory(true)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'transparent',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Show {resolvedRequests.length - 5} more resolved requests
                </button>
              )}
            </div>
          )}

          {myRequests.length === 0 && (
            <div style={{
              ...cardStyle,
              textAlign: 'center',
              padding: '32px',
              background: '#1E293B'
            }}>
              <Wrench size={40} color="#64748B" style={{ marginBottom: '12px' }} />
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                No maintenance requests yet. Submit your first request above.
              </p>
            </div>
          )}
        </motion.div>
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

export default TenantMaintenance;
