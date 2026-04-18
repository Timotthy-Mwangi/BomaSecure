import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';
import { 
  Search, 
  Users, 
  Phone, 
  Mail, 
  Building, 
  Shield,
  User,
  X,
  Filter,
  Send,
  Wrench,
  Star,
  CheckCircle,
  Clock
} from 'lucide-react';
import { authAPI, apartmentsAPI } from '../../services/api';
import socketService from '../../services/socket';
import smsService from '../../services/smsService';

const UserDirectory = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingUser, setRatingUser] = useState(null);
  const [userRating, setUserRating] = useState(5);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;
  const isAdmin = user?.role === 'admin';
  console.log('UserDirectory - user:', user, 'isAdmin:', isAdmin);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = { limit: 100 };
      
      if (!isAdmin && user?.apartmentId) {
        queryParams.apartmentId = user.apartmentId;
      }
      
      const apartmentParams = isAdmin ? {} : { _id: user?.apartmentId };
      
      const [usersRes, apartmentsRes] = await Promise.all([
        authAPI.getUsers(queryParams),
        apartmentsAPI.getAll(apartmentParams)
      ]);

      const allUsers = usersRes.data.users || [];
      const allBuildings = apartmentsRes.data.apartments || [];
      
      setUsers(allUsers);
      setBuildings(allBuildings);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.apartmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates for users and buildings
  useEffect(() => {
    const handleUserCreated = (data) => {
      if (data.user) {
        setUsers(prev => [data.user, ...prev]);
      }
    };

    const handleUserUpdated = (data) => {
      if (data.user) {
        setUsers(prev => prev.map(u => u._id === data.user._id ? data.user : u));
      }
    };

    const handleUserDeleted = (data) => {
      setUsers(prev => prev.filter(u => u._id !== data.userId));
    };

    const handleApartmentCreated = (data) => {
      if (data.apartment) {
        setBuildings(prev => [data.apartment, ...prev]);
      }
    };

    const handleApartmentUpdated = (data) => {
      if (data.apartment) {
        setBuildings(prev => prev.map(b => b._id === data.apartment._id ? data.apartment : b));
      }
    };

    const handleApartmentDeleted = (data) => {
      setBuildings(prev => prev.filter(b => b._id !== data.apartmentId));
    };

    socketService.onUserCreated(handleUserCreated);
    socketService.onUserUpdated(handleUserUpdated);
    socketService.onUserDeleted(handleUserDeleted);
    socketService.onApartmentCreated(handleApartmentCreated);
    socketService.onApartmentUpdated(handleApartmentUpdated);
    socketService.onApartmentDeleted(handleApartmentDeleted);

    return () => {
      socketService.removeListener('user:created', handleUserCreated);
      socketService.removeListener('user:updated', handleUserUpdated);
      socketService.removeListener('user:deleted', handleUserDeleted);
      socketService.removeListener('apartment:created', handleApartmentCreated);
      socketService.removeListener('apartment:updated', handleApartmentUpdated);
      socketService.removeListener('apartment:deleted', handleApartmentDeleted);
    };
  }, []);

  const sendContactMessage = async () => {
    if (!contactMessage.trim() || !selectedUser?.phone) return;
    
    setSendingMessage(true);
    try {
      const phoneNumber = selectedUser.phone.replace(/[^0-9]/g, '');
      await smsService.sendSMS({
        mobile: phoneNumber,
        msg: `${user?.name || 'A user'} from BomaSecure: ${contactMessage}`
      });
      setShowContactModal(false);
      setContactMessage('');
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleVerifyUser = async (userId) => {
    setVerifying(true);
    try {
      const response = await authAPI.verifyUser(userId);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isVerified: true, ...response.data.user } : u));
      if (selectedUser?._id === userId) {
        setSelectedUser(prev => ({ ...prev, isVerified: true }));
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      alert('Failed to verify user. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const openRatingModal = (user) => {
    setRatingUser(user);
    setUserRating(user.rating || 5);
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async () => {
    if (!ratingUser) return;
    setRatingSaving(true);
    try {
      const response = await authAPI.rateUser(ratingUser._id, userRating);
      setUsers(prev => prev.map(u => u._id === ratingUser._id ? { ...u, rating: response.data.rating, ratingCount: response.data.ratingCount } : u));
      if (selectedUser?._id === ratingUser._id) {
        setSelectedUser(prev => ({ ...prev, rating: response.data.rating, ratingCount: response.data.ratingCount }));
      }
      setShowRatingModal(false);
      setRatingUser(null);
    } catch (error) {
      console.error('Error updating rating:', error);
      alert('Failed to update rating. Please try again.');
    } finally {
      setRatingSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm);
    
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    
    return matchesSearch && matchesRole && u._id !== user?._id;
  });

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b._id === buildingId);
    return building?.buildingName || 'N/A';
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      tenant: { color: '#3B82F6', label: 'Resident', icon: User },
      guard: { color: '#8B5CF6', label: 'Security', icon: Shield },
      admin: { color: '#EF4444', label: 'Admin', icon: Building },
      maintenance: { color: '#F59E0B', label: 'Maintenance', icon: Wrench }
    };
    const config = roleConfig[role] || roleConfig.tenant;
    return (
      <span style={{
        background: config.color + '20',
        color: config.color,
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <config.icon size={12} />
        {config.label}
      </span>
    );
  };

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
          <Search size={32} color={COLORS.primary} />
          User Directory
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#1F2937'
        }}>
          Find residents, security staff, and building managers
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ ...cardStyle, padding: isMobile ? '12px' : '16px' }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ 
            flex: 1, 
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
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
              placeholder="Search by name, email, or phone..."
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

          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '8px'
          }}>
            <Filter size={18} color="#6B7280" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                border: '2px solid #D1D5DB',
                fontSize: '14px',
                background: '#FFFFFF',
                color: '#1F2937',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Roles</option>
              <option value="tenant">Residents</option>
              <option value="guard">Security</option>
              <option value="admin">Admin</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
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
          <p style={{ marginTop: '12px', color: '#6B7280', fontSize: '14px' }}>Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}
        >
          <Users size={48} color="#9CA3AF" style={{ marginBottom: '12px' }} />
          <p style={{ margin: 0, fontSize: '16px', color: '#6B7280' }}>
            No users found matching your search
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <AnimatePresence>
            {filteredUsers.map((u, index) => (
              <motion.div
                key={u._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedUser(u)}
                style={{
                  ...cardStyle,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: selectedUser?._id === u._id ? `2px solid ${COLORS.primary}` : '2px solid transparent'
                }}
                whileHover={{ transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: isMobile ? '48px' : '56px',
                    height: isMobile ? '48px' : '56px',
                    borderRadius: '16px',
                    background: COLORS.primary + '15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{
                      fontSize: isMobile ? '18px' : '22px',
                      fontWeight: 700,
                      color: COLORS.primary
                    }}>
                      {u.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
                        {u.name}
                      </h3>
                      {getRoleBadge(u.role)}
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row', 
                      gap: isMobile ? '4px' : '16px',
                      marginTop: '6px'
                    }}>
                      {u.phone && (
                        <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {u.phone}
                        </span>
                      )}
                      {u.email && (
                        <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} /> {u.email}
                        </span>
                      )}
                    </div>

                    {u.apartmentId && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        marginTop: '6px',
                        fontSize: '13px',
                        color: '#9CA3AF'
                      }}>
                        <Building size={12} />
                        {getBuildingName(typeof u.apartmentId === 'object' ? u.apartmentId._id : u.apartmentId)}
                        {u.roomNumber && ` - Room ${u.roomNumber}`}
                        {u.floor !== undefined && u.floor !== null && u.role === 'tenant' && ` - Floor ${u.floor}`}
                      </div>
                    )}

                    {(u.role === 'maintenance' && u.isVerified) || u.role === 'guard' ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        marginTop: '6px'
                      }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            fill={star <= (u.rating || 0) ? '#F59E0B' : 'none'}
                            color={star <= (u.rating || 0) ? '#F59E0B' : '#D1D5DB'}
                          />
                        ))}
                        <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '4px' }}>
                          ({u.ratingCount || 0})
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openRatingModal(u); }}
                          style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            background: '#F59E0B20',
                            border: '1px solid #F59E0B',
                            borderRadius: '4px',
                            color: '#F59E0B',
                            cursor: 'pointer'
                          }}
                        >
                          Rate
                        </button>
                      </div>
                    ) : null}

                    {u.role === 'maintenance' && !u.isVerified && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        marginTop: '6px'
                      }}>
                        <Clock size={14} color="#EF4444" />
                        <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>
                          Pending Approval
                        </span>
                      </div>
                    )}
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
                      background: u.isOnline ? '#10B981' : '#9CA3AF'
                    }}></div>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {u.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
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
                onClick={() => setSelectedUser(null)}
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
                  background: COLORS.primary + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: COLORS.primary
                  }}>
                    {selectedUser.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1F2937' }}>
                    {selectedUser.name}
                  </h2>
                  {getRoleBadge(selectedUser.role)}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedUser.phone && (
                  <a
                    href={`tel:${selectedUser.phone}`}
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
                      background: COLORS.primary + '15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Phone size={20} color={COLORS.primary} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Phone</p>
                      <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                        {selectedUser.phone}
                      </p>
                    </div>
                  </a>
                )}

                {selectedUser.email && (
                  <a
                    href={`mailto:${selectedUser.email}`}
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
                      background: COLORS.primary + '15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Mail size={20} color={COLORS.primary} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Email</p>
                      <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                        {selectedUser.email}
                      </p>
                    </div>
                  </a>
                )}

                {selectedUser.apartmentId && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      background: '#F9FAFB',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: COLORS.primary + '15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Building size={20} color={COLORS.primary} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Property</p>
                      <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                        {getBuildingName(typeof selectedUser.apartmentId === 'object' ? selectedUser.apartmentId._id : selectedUser.apartmentId)}
                        {selectedUser.roomNumber && ` - Room ${selectedUser.roomNumber}`}
                        {selectedUser.floor !== undefined && selectedUser.floor !== null && selectedUser.role === 'tenant' && ` - Floor ${selectedUser.floor}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {((isAdmin || user?.role === 'admin') && selectedUser.role === 'maintenance') && (
                <div style={{ 
                  marginBottom: '8px', 
                  padding: '12px', 
                  background: selectedUser.isVerified ? '#dcfce7' : '#fee2e2',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selectedUser.isVerified ? '#22c55e' : '#ef4444'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: selectedUser.isVerified ? '#166534' : '#991b1b', marginBottom: '8px' }}>
                    Status: {selectedUser.isVerified ? 'Verified' : 'Pending Approval'}
                  </div>
                  {!selectedUser.isVerified && (
                    <button
                      onClick={() => handleVerifyUser(selectedUser._id)}
                      disabled={verifying}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#22c55e',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: verifying ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <CheckCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                      {verifying ? 'Approving...' : 'Approve & Add to Maintenance Team'}
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                {selectedUser.phone && (
                  <a
                    href={`tel:${selectedUser.phone}`}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: COLORS.primary,
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      textAlign: 'center',
                      minHeight: '52px'
                    }}
                  >
                    <Phone size={20} color="#FFFFFF" style={{ minWidth: '20px' }} />
                    <span>Call</span>
                  </a>
                )}
                {selectedUser.email && (
                  <a
                    href={`mailto:${selectedUser.email}?subject=Contact from BomaSecure`}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: '#10B981',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      textAlign: 'center',
                      minHeight: '52px'
                    }}
                  >
                    <Mail size={20} color="#FFFFFF" style={{ minWidth: '20px' }} />
                    <span>Email</span>
                  </a>
                )}
                {!selectedUser.phone && !selectedUser.email && (
                  <span style={{ color: '#6B7280', fontSize: '14px' }}>
                    No contact information available
                  </span>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      {showContactModal && selectedUser && (
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
                Contact {selectedUser.name}
              </h2>
              <button
                onClick={() => setShowContactModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>

            {selectedUser.phone && (
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6B7280' }}>
                Sending SMS to: {selectedUser.phone}
              </p>
            )}

            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                marginBottom: '16px'
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowContactModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  background: '#fff',
                  color: '#4B5563',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendContactMessage}
                disabled={!contactMessage.trim() || sendingMessage}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: sendingMessage ? '#9CA3AF' : COLORS.primary,
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
                {sendingMessage ? 'Sending...' : <><Send size={16} /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && ratingUser && (
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
          onClick={() => setShowRatingModal(false)}
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
                Rate {ratingUser.name}
              </h2>
              <button
                onClick={() => setShowRatingModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#9CA3AF" />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
              Rate this maintenance team member (1-5 stars)
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <Star
                    size={32}
                    fill={star <= userRating ? '#F59E0B' : 'none'}
                    color={star <= userRating ? '#F59E0B' : '#D1D5DB'}
                  />
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowRatingModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                  color: '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={ratingSaving}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: ratingSaving ? '#9CA3AF' : '#F59E0B',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: ratingSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {ratingSaving ? 'Saving...' : 'Save Rating'}
              </button>
            </div>
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

export default UserDirectory;
