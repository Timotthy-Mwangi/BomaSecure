import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Share2, Check, Star, X } from 'lucide-react';
import api from '../../services/api';
import { authAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteRole, setInviteRole] = useState('tenant');
  const [selectedRole, setSelectedRole] = useState('tenant');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingUser, setRatingUser] = useState(null);
  const [userRating, setUserRating] = useState(5);
  const [ratingSaving, setRatingSaving] = useState(false);

  // Synchronize selection state with modal
  useEffect(() => {
    if (showModal) {
      setSelectedRole(editingUser?.role || 'tenant');
      setSelectedBuildingId(editingUser?.apartmentId?._id || editingUser?.apartmentId || '');
    } else {
      setSelectedRole('tenant');
      setSelectedBuildingId('');
    }
  }, [showModal, editingUser]);

  const handleShareLink = async () => {
    try {
      const res = await authAPI.generateInvite({ role: inviteRole });
      const link = `${window.location.origin}/invite?token=${res.data.inviteToken}`;
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to generate invite link:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      const response = await api.get('/apartments');
      console.log('Apartments API response:', response.data);
      const raw = response.data.apartments || response.data;
      const aptList = Array.isArray(raw) ? raw : [];
      console.log('Apartments list:', aptList);
      setApartments(aptList);
    } catch (err) {
      console.error('Error fetching apartments:', err);
    }
  };

  // Real-time updates
  useEffect(() => {
    const handleUserCreated = (data) => {
      console.log('New user created:', data);
      // Add new user directly to state instead of refetching
      if (data.user) {
        setUsers(prev => {
          // Safety check - ensure prev is an array
          const userList = Array.isArray(prev) ? prev : [];
          // Avoid duplicates
          if (userList.some(u => u._id === data.user._id)) return userList;
          return [data.user, ...userList];
        });
      } else {
        // Fallback: refetch if full user data not provided
        fetchUsers();
      }
    };

    const handleUserUpdated = (data) => {
      console.log('User updated:', data);
      // Update user directly in state instead of refetching
      if (data.userId && data.updates) {
        setUsers(prev => prev.map(u => 
          u._id === data.userId ? { ...u, ...data.updates } : u
        ));
      } else {
        // Fallback: refetch if full update data not provided
        fetchUsers();
      }
    };

    const handleUserDeleted = (data) => {
      console.log('User deleted:', data);
      setUsers(prev => prev.filter(u => u._id !== data.userId));
    };

    socketService.onUserCreated(handleUserCreated);
    socketService.onUserUpdated(handleUserUpdated);
    socketService.onUserDeleted(handleUserDeleted);
    socketService.joinAdmin();

    return () => {
      socketService.removeListener('user:created', handleUserCreated);
      socketService.removeListener('user:updated', handleUserUpdated);
      socketService.removeListener('user:deleted', handleUserDeleted);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      console.log('Users API response:', response.data);
      const userList = response.data.users || [];
      console.log('Sample user data:', userList[0]); // Debug first user
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
};

  const handleStatusToggle = async (user) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await api.put(`/auth/users/${user._id}`, { isActive: newStatus === 'active' });
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, status: newStatus } : u));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleRatingSubmit = async () => {
    if (!ratingUser) return;
    setRatingSaving(true);
    try {
      await api.put(`/auth/users/${ratingUser._id}`, { rating: userRating });
      setUsers(prev => prev.map(u => u._id === ratingUser._id ? { ...u, rating: userRating } : u));
      setShowRatingModal(false);
      setRatingUser(null);
    } catch (error) {
      console.error('Error updating rating:', error);
    } finally {
      setRatingSaving(false);
    }
  };

  const getFilteredUsers = () => {
    if (!Array.isArray(users)) return [];
    return users.filter(user => {
      const aptId = typeof user.apartmentId === 'string' ? user.apartmentId : user.apartmentId?._id;
      const buildingName = user.apartmentId?.buildingName || apartments.find(a => a._id === aptId)?.buildingName || '';

      const matchesSearch = 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buildingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || user.role === filter;
      return matchesSearch && matchesFilter;
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return COLORS.danger;
      case 'guard': return COLORS.secondary;
      case 'tenant': return COLORS.primary;
      case 'maintenance': return '#F59E0B';
      default: return COLORS.gray[500];
    }
  };

  const isMaintenanceUser = (user) => {
    return user.role === 'maintenance' || user.role?.toLowerCase() === 'maintenance';
  };

  const handleEditClick = (user) => {
    if (isMaintenanceUser(user)) {
      alert('Cannot edit maintenance users');
      return;
    }
    setEditingUser(user);
    setFormError('');
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    const user = users.find(u => u._id === id);
    if (isMaintenanceUser(user)) {
      alert('Cannot delete maintenance users');
      return;
    }
    handleDelete(id);
  };

  const handleStatusToggleClick = (user) => {
    if (isMaintenanceUser(user)) {
      alert('Cannot activate/deactivate maintenance users');
      return;
    }
    handleStatusToggle(user);
  };

  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: COLORS.text,
      marginBottom: '4px',
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: '14px',
    },
    addButton: {
      padding: '10px 20px',
      backgroundColor: COLORS.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.2s',
    },
    filters: {
      display: 'flex',
      gap: '16px',
      marginBottom: '20px',
      flexWrap: 'wrap',
    },
    searchInput: {
      flex: '1',
      minWidth: '200px',
      padding: '10px 14px',
      border: '1px solid #334155',
      borderRadius: '8px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: '#0F172A',
      color: '#F1F5F9',
    },
    filterButtons: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
    },
    filterButton: {
      padding: '8px 16px',
      border: '1px solid #334155',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s',
    },
    tableContainer: {
      backgroundColor: '#1E293B',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      padding: '16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      borderBottom: '1px solid #334155',
      backgroundColor: '#0F172A',
    },
    td: {
      padding: '16px',
      fontSize: '14px',
      color: COLORS.text,
      borderBottom: '1px solid #334155',
    },
    tr: {
      transition: 'background-color 0.2s',
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: COLORS.primary,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      fontSize: '16px',
    },
    userName: {
      fontWeight: '600',
      fontSize: '14px',
      color: COLORS.text,
    },
    userEmail: {
      fontSize: '12px',
      color: COLORS.textSecondary,
    },
    roleBadge: {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
    },
    statusButton: {
      padding: '4px 12px',
      border: 'none',
      borderRadius: '20px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    actions: {
      display: 'flex',
      gap: '8px',
    },
    actionButton: {
      padding: '6px 10px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s',
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '48px',
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #334155',
      borderTopColor: COLORS.primary,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      color: COLORS.textSecondary,
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },
    modal: {
      backgroundColor: '#1E293B',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: COLORS.text,
      marginBottom: '20px',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #334155',
      borderRadius: '8px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: '#0F172A',
      color: '#F1F5F9',
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #334155',
      borderRadius: '8px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: '#0F172A',
      color: '#F1F5F9',
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
    },
    cancelButton: {
      padding: '10px 20px',
      backgroundColor: 'transparent',
      color: COLORS.text,
      border: '1px solid #334155',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    submitButton: {
      padding: '10px 24px',
      backgroundColor: COLORS.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Users Management</h1>
            <p style={styles.subtitle}>Manage all system users</p>
          </div>
          <button onClick={() => { setShowModal(true); setEditingUser(null); setFormError(''); }} style={styles.addButton}>
            + Add User
          </button>
        </div>

        <div style={styles.filters}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <div style={styles.filterButtons}>
            {['all', 'admin', 'guard', 'tenant', 'maintenance'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterButton,
                  backgroundColor: filter === f ? COLORS.primary : 'transparent',
                  color: filter === f ? '#fff' : COLORS.textSecondary,
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>👥</span>
            <h3>No users found</h3>
          </div>
        ) : (
          <div style={styles.tableContainer} className="users-table-container">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Property Details</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Joined</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    style={styles.tr}
                  >
                    <td style={styles.td}>
                      <div style={styles.userInfo}>
                        <div style={styles.avatar}>
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={styles.userName}>{user.name || 'Unknown'}</div>
                          <div style={styles.userEmail}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.roleBadge,
                        backgroundColor: getRoleBadgeColor(user.role) + '20',
                        color: getRoleBadgeColor(user.role),
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '600', color: COLORS.text, fontSize: '14px' }}>
                        {(user.role === 'admin' || user.role?.toLowerCase() === 'admin') && user.managedBuildings?.length > 0 ? (
                          <span title={user.managedBuildings.map(b => b.buildingName).join(', ')}>
                            {user.managedBuildings.length} {user.managedBuildings.length === 1 ? 'Building' : 'Buildings'}
                          </span>
                        ) : (
                          (() => {
                            const aptId = typeof user.apartmentId === 'string' ? user.apartmentId : user.apartmentId?._id;
                            const building = apartments.find(a => a._id === aptId);
                            return user.buildingName || user.apartmentId?.buildingName || user.apartment?.buildingName || building?.buildingName || '-';
                          })()
                        )}
                      </div>
                      {(user.role === 'tenant' || user.role?.toLowerCase() === 'tenant') && (
                        <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>
                          Unit: {user.roomNumber || 'N/A'} • Floor: {user.floor !== null && user.floor !== undefined ? user.floor : 'N/A'}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>{user.phone || '-'}</td>
                    <td style={styles.td}>
                        <button
                          onClick={() => handleStatusToggleClick(user)}
                          style={{
                            ...styles.statusButton,
                            backgroundColor: user.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                            color: user.status === 'active' ? '#065F46' : '#991B1B',
                          }}
                        >
                        {user.status}
                      </button>
                    </td>
                    <td style={styles.td}>
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleEditClick(user)}
                          style={styles.actionButton}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user._id)}
                          style={styles.actionButton}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => {
              setShowModal(false);
              setEditingUser(null);
              setFormError('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={styles.modal}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ ...styles.modalTitle, marginBottom: 0 }}>
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                {!editingUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1F2937',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="tenant">Tenant</option>
                      <option value="guard">Security Guard</option>
                    </select>
                    <motion.button
                      onClick={handleShareLink}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Copy invite link"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px',
                        backgroundColor: linkCopied ? COLORS.secondary : 'transparent',
                        color: linkCopied ? '#fff' : COLORS.primary,
                        border: `1px solid ${linkCopied ? COLORS.secondary : COLORS.primary}`,
                        borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {linkCopied ? <Check size={14} /> : <Share2 size={14} />}
                    {linkCopied ? 'Copied!' : 'Share Link'}
                  </motion.button>
                  </div>
                )}
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setFormError('');
                setFormSaving(true);
                const formData = new FormData(e.target);
                const rawData = Object.fromEntries(formData);
                const data = {
                  name: rawData.name,
                  email: rawData.email || undefined,
                  phone: rawData.phone,
                  role: rawData.role,
                  roomNumber: rawData.roomNumber || undefined,
                  apartmentId: rawData.apartmentId || undefined,
                  password: rawData.password || undefined,
                  ...(currentUser?._id && { createdBy: currentUser._id })
                };
                try {
                  if (editingUser) {
                    await api.put(`/auth/users/${editingUser._id}`, data);
                  } else {
                    await api.post('/auth/register', data);
                  }
                  await fetchUsers();
                  setShowModal(false);
                  setEditingUser(null);
                } catch (error) {
                  setFormError(error.response?.data?.message || 'Failed to save user');
                } finally {
                  setFormSaving(false);
                }
              }}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="user-name">Name</label>
                  <input
                    id="user-name"
                    name="name"
                    defaultValue={editingUser?.name}
                    style={styles.input}
                    required
                    autoComplete="name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="user-email">Email</label>
                  <input
                    id="user-email"
                    name="email"
                    type="email"
                    defaultValue={editingUser?.email}
                    style={styles.input}
                    required
                    autoComplete="email"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="user-phone">Phone <span style={{color: COLORS.danger}}>*</span></label>
                  <input
                    id="user-phone"
                    name="phone"
                    type="tel"
                    defaultValue={editingUser?.phone}
                    style={styles.input}
                    required
                    autoComplete="tel"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="user-role">Role</label>
                  <select 
                    id="user-role" name="role" 
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    style={styles.select}
                  >
                    <option value="tenant">Tenant</option>
                    <option value="guard">Guard</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {(selectedRole === 'tenant' || selectedRole === 'guard') && (
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="user-apartment">
                      {selectedRole === 'guard' ? 'Assigned Building' : 'Apartment/Building'}
                    </label>
                    <select
                      id="user-apartment"
                      name="apartmentId"
                      value={selectedBuildingId}
                      onChange={(e) => setSelectedBuildingId(e.target.value)}
                      style={styles.select}
                    >
                      <option value="">— Select Building —</option>
                      {apartments.map(apt => (
                        <option key={apt._id} value={apt._id}>{apt.buildingName}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedRole === 'tenant' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="user-unit">Room Number</label>
                    {selectedBuildingId ? (
                      <select
                        key={selectedBuildingId}
                        id="user-unit"
                        name="roomNumber"
                        defaultValue={editingUser?.roomNumber}
                        style={styles.select}
                      >
                        <option value="">— Select Unit —</option>
                        {apartments.find(a => a._id === selectedBuildingId)?.units?.map(u => (
                          <option key={u._id} value={u.number}>
                            Unit {u.number} {u.isOccupied && u.tenantId?._id !== editingUser?._id && u.tenantId !== editingUser?._id ? '(Occupied)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="user-unit"
                        name="roomNumber"
                        style={styles.input}
                        placeholder="Select a building first"
                        disabled
                      />
                    )}
                  </div>
                )}
                {editingUser && (
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="user-password">New Password</label>
                    <input
                      id="user-password"
                      name="password"
                      type="password"
                      style={styles.input}
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                )}
                {!editingUser && (
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="user-password">Password <span style={{ color: COLORS.accent }}>*</span></label>
                    <input
                      id="user-password"
                      name="password"
                      type="password"
                      style={styles.input}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                )}
                {formError && (
                  <p style={{ color: COLORS.danger, fontSize: '13px', marginBottom: '12px' }}>{formError}</p>
                )}
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingUser(null); setFormError(''); }}
                    style={styles.cancelButton}
                    disabled={formSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={{ ...styles.submitButton, opacity: formSaving ? 0.7 : 1 }} disabled={formSaving}>
                    {formSaving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && ratingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setShowRatingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ ...styles.modal, maxWidth: '400px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ ...styles.modalTitle, marginBottom: 0 }}>Rate {ratingUser.name}</h2>
                <button
                  onClick={() => setShowRatingModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} color="#9CA3AF" />
                </button>
              </div>

              <p style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '20px' }}>
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

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowRatingModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRatingSubmit}
                  disabled={ratingSaving}
                  style={{ ...styles.submitButton, opacity: ratingSaving ? 0.7 : 1 }}
                >
                  {ratingSaving ? 'Saving...' : 'Save Rating'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 1024px) {
          .users-table-container { overflow-x: auto !important; }
        }
        @media (max-width: 768px) {
          div[style*="padding: 24px"] { padding: 16px !important; }
          h1 { font-size: 22px !important; }
          div[style*="justifyContent: space-between"] { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
        }
        @media (max-width: 500px) {
          div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default Users;
