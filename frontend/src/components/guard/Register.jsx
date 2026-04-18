import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI, deliveriesAPI, apartmentsAPI, authAPI } from '../../services/api';
import { COLORS } from '../../config';
import { 
  Search, 
  ArrowLeft, 
  Package, 
  User, 
  Car, 
  Phone, 
  Check, 
  X, 
  Send 
} from 'lucide-react';

const GuardRegister = () => {
  const { apartment, user } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const apartmentId = apartment?._id || user?.apartmentId?._id || user?.apartmentId;
  
  // Form state
  const [registrationType, setRegistrationType] = useState('visitor'); // 'visitor' or 'delivery'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [registeredData, setRegisteredData] = useState(null); // Store QR code data
  
  // Tenant search
  const [tenantSearch, setTenantSearch] = useState('');
  const [allTenants, setAllTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  
  // Visitor form
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    phone: '',
    idNumber: '',
    vehiclePlate: '',
    purpose: 'guest',
    notes: ''
  });
  
  // Delivery form
  const [deliveryForm, setDeliveryForm] = useState({
    courierName: '',
    courierPhone: '',
    courierCompany: '',
    vehiclePlate: '',
    parcelDescription: '',
    trackingNumber: '',
    notes: ''
  });

  // Fetch all tenants - try multiple sources
  useEffect(() => {
    const fetchTenants = async () => {
      setTenantsLoading(true);
      
      // First try: get apartment ID and fetch tenants from apartment endpoint
      const apartmentIdToUse = apartment?._id || user?.apartmentId?._id || user?.apartmentId;
      
      if (apartmentIdToUse) {
        try {
          const res = await apartmentsAPI.getTenants(apartmentIdToUse);
          if (res.data.tenants && res.data.tenants.length > 0) {
            setAllTenants(res.data.tenants);
            setTenantsLoading(false);
            return;
          }
        } catch (err) {
          console.log('Apartment tenants API failed, trying auth users');
        }
      }
      
      // Second try: get all users from auth endpoint and filter for tenants
      try {
        const res = await authAPI.getUsers();
        const allUsers = res.data.users || [];
        // Filter to only tenants
        const tenantsOnly = allUsers.filter(u => u.role === 'tenant');
        setAllTenants(tenantsOnly);
      } catch (err) {
        console.error('Auth users API also failed:', err);
        setAllTenants([]);
      } finally {
        setTenantsLoading(false);
      }
    };
    
    fetchTenants();
  }, [apartment, user]);

  // Filter tenants client-side in real-time
  const tenants = tenantSearch
    ? allTenants.filter(t => {
        const q = tenantSearch.toLowerCase();
        return (
          t.name?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.roomNumber?.toLowerCase().includes(q) ||
          t.phone?.includes(tenantSearch)
        );
      })
    : allTenants;

  // Handle tenant selection
  const handleSelectTenant = (tenant) => {
    setSelectedTenant(tenant);
    setTenantSearch(tenant.name ? `${tenant.name} - Room ${tenant.roomNumber}` : `Room ${tenant.roomNumber}`);
    setShowTenantDropdown(false);
  };

  // Clear tenant selection
  const handleClearTenant = () => {
    setSelectedTenant(null);
    setTenantSearch('');
  };

  // Handle visitor form changes
  const handleVisitorChange = (e) => {
    const { name, value } = e.target;
    setVisitorForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle delivery form changes
  const handleDeliveryChange = (e) => {
    const { name, value } = e.target;
    setDeliveryForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit visitor
  const handleSubmitVisitor = async (e) => {
    e.preventDefault();
    
    if (!selectedTenant) {
      setError('Please select a tenant to visit');
      return;
    }
    
    if (!visitorForm.name || !visitorForm.phone) {
      setError('Please fill in required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        ...visitorForm,
        hostTenantId: selectedTenant._id,
        roomNumber: selectedTenant.roomNumber,
        sendSmsNotification: true
      };
      
      // Create visitor and get response with QR code
      const response = await visitorsAPI.create(data);
      setSuccess('Visitor registered successfully!');
      setRegisteredData({ type: 'visitor', ...response.data });
      setVisitorForm({
        name: '',
        phone: '',
        idNumber: '',
        vehiclePlate: '',
        purpose: 'guest',
        notes: ''
      });
      handleClearTenant();
      
      // Don't redirect - show QR code instead
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register visitor');
    } finally {
      setLoading(false);
    }
  };

  // Clear registered data and start new registration
  const handleNewRegistration = () => {
    setRegisteredData(null);
    setSuccess(null);
    setError(null);
  };

  // Submit delivery
  const handleSubmitDelivery = async (e) => {
    e.preventDefault();
    
    if (!selectedTenant) {
      setError('Please select a recipient tenant');
      return;
    }
    
    if (!deliveryForm.courierName || !deliveryForm.courierPhone || !deliveryForm.parcelDescription) {
      setError('Please fill in required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        ...deliveryForm,
        recipientTenantId: selectedTenant._id,
        roomNumber: selectedTenant.roomNumber,
        sendSmsNotification: true
      };
      
      // Create delivery and get response with QR code
      const response = await deliveriesAPI.create(data);
      setSuccess('Delivery registered successfully!');
      setRegisteredData({ type: 'delivery', ...response.data });
      setDeliveryForm({
        courierName: '',
        courierPhone: '',
        courierCompany: '',
        vehiclePlate: '',
        parcelDescription: '',
        trackingNumber: '',
        notes: ''
      });
      handleClearTenant();
      
      // Don't redirect - show QR code instead
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register delivery');
    } finally {
      setLoading(false);
    }
  };

  const purposes = [
    { value: 'guest', label: 'Guest Visit' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'official', label: 'Official' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <>
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/guard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: COLORS.dark }}>Register Visitor/Delivery</h1>
        <p style={{ margin: '8px 0 0', color: COLORS.gray[700], fontWeight: 600 }}>
          {apartment?.buildingName || 'Apartment'} - Record entry details
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '16px',
            background: '#22C55E26',
            border: '2px solid #22C55E',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#22C55E',
            fontWeight: 700
          }}
        >
          <Check size={20} />
          <span style={{ fontWeight: 700 }}>{success}</span>
        </motion.div>
      )}

      {/* QR Code Display */}
      {registeredData && registeredData.qrCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            padding: '24px',
            background: '#fff',
            borderRadius: '16px',
            marginBottom: '24px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
        >
          <h3 style={{ margin: '0 0 16px', color: COLORS.dark, fontSize: '22px', fontWeight: 800 }}>
            {registeredData.type === 'visitor' ? 'Visitor' : 'Delivery'} QR Code
          </h3>
          
          {registeredData.qrCode.qrImage && (
            <img 
              src={registeredData.qrCode.qrImage} 
              alt="QR Code" 
              style={{ width: '200px', height: '200px', margin: '0 auto', display: 'block' }}
            />
          )}
          
          <div style={{ marginTop: '16px', padding: '16px', background: '#FEF3C7', borderRadius: '12px', border: '2px solid #F59E0B' }}>
            <p style={{ margin: 0, fontSize: '16px', color: '#1F2937', fontWeight: 700 }}>
              <strong style={{ color: '#DC2626', fontSize: '15px' }}>📋 Code:</strong> <span style={{ color: '#DC2626', fontSize: '18px', letterSpacing: '1px' }}>{registeredData.qrCode.code}</span>
            </p>
            {registeredData.qrCode.backupCode && (
              <p style={{ margin: '12px 0 0', fontSize: '16px', color: '#7C3AED', fontWeight: 700 }}>
                <strong>📋 Backup Code:</strong> <span style={{ fontSize: '18px', letterSpacing: '1px' }}>{registeredData.qrCode.backupCode}</span>
                <span style={{ fontSize: '14px', color: '#4B5563', marginLeft: '8px', fontWeight: 600 }}>
                  (For visitors without smartphones)
                </span>
              </p>
            )}
            {registeredData.qrCode.expiresAt && (
              <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#1F2937', fontWeight: 700 }}>
                ⏰ <strong>Expires:</strong> {new Date(registeredData.qrCode.expiresAt).toLocaleString()}
                <span style={{ marginLeft: '8px', color: '#DC2626', fontWeight: 800 }}>
                  (24 hours max)
                </span>
              </p>
            )}
            {registeredData.smsSent && (
              <p style={{ margin: '12px 0 0', fontSize: '15px', color: '#059669', fontWeight: 700 }}>
                ✓ <strong>SMS sent to:</strong> {registeredData.type === 'visitor' ? visitorForm.phone : deliveryForm.courierPhone}
              </p>
            )}
            {registeredData.tenantSmsSent && (
              <p style={{ margin: '8px 0 0', fontSize: '15px', color: '#059669', fontWeight: 700 }}>
                ✓ <strong>Tenant notified via SMS</strong>
              </p>
            )}
          </div>
          
          <p style={{ margin: '16px 0 0', fontSize: '13px', color: '#666' }}>
            Share this QR code with the {registeredData.type === 'visitor' ? 'visitor' : 'courier'}
          </p>
          
          <button
            onClick={handleNewRegistration}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Register Another
          </button>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '16px',
            background: '#EF444426',
            border: '2px solid #EF4444',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#EF4444',
            fontWeight: 700
          }}
        >
          <X size={20} />
          <span style={{ fontWeight: 700 }}>{error}</span>
        </motion.div>
      )}

      {/* Registration Type Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        background: COLORS.gray[100],
        padding: '4px',
        borderRadius: '12px'
      }}>
        <button
          onClick={() => setRegistrationType('visitor')}
          style={{
            flex: 1,
            padding: '12px 20px',
            border: 'none',
            borderRadius: '10px',
            background: registrationType === 'visitor' ? COLORS.white : 'transparent',
            color: registrationType === 'visitor' ? COLORS.primary : COLORS.gray[600],
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: registrationType === 'visitor' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <User size={18} /> Register Visitor
        </button>
        <button
          onClick={() => setRegistrationType('delivery')}
          style={{
            flex: 1,
            padding: '12px 20px',
            border: 'none',
            borderRadius: '10px',
            background: registrationType === 'delivery' ? COLORS.white : 'transparent',
            color: registrationType === 'delivery' ? COLORS.primary : COLORS.gray[600],
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: registrationType === 'delivery' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Package size={18} /> Register Delivery
        </button>
      </div>

      {/* Form Card */}
      <div style={{
        background: COLORS.white,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
      }}>
        {/* Tenant Search Section */}
        <div style={{ marginBottom: '24px' }}>
          <label 
            htmlFor="tenant-search"
            style={{ 
              display: 'block', 
              fontSize: '15px', 
              fontWeight: 700, 
              color: COLORS.dark,
              marginBottom: '8px'
            }}
          >
            Search Tenant / Room <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: '16px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: COLORS.gray[400] 
            }} />
            <input
              id="tenant-search"
              type="text"
              name="tenant-search"
              autoComplete="off"
              placeholder="Search by name, email, room number, or phone..."
              value={tenantSearch}
              onChange={(e) => { setTenantSearch(e.target.value); setShowTenantDropdown(true); }}
              onFocus={() => { if (!selectedTenant) setShowTenantDropdown(true); }}
              onBlur={() => setTimeout(() => setShowTenantDropdown(false), 200)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                border: selectedTenant ? `2px solid ${COLORS.secondary}` : `1px solid ${COLORS.gray[200]}`,
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            {selectedTenant && (
              <button
                onClick={handleClearTenant}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: COLORS.gray[100],
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: COLORS.gray[600],
                  fontSize: '12px'
                }}
              >
                Clear
              </button>
            )}

            {/* Tenant Dropdown */}
            {showTenantDropdown && !selectedTenant && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: COLORS.white,
              border: `1px solid ${COLORS.gray[200]}`,
              borderRadius: '10px',
              marginTop: '4px',
              maxHeight: '240px',
              overflowY: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              zIndex: 200
            }}>
              {tenantsLoading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: COLORS.gray[500] }}>
                  Loading...
                </div>
              ) : tenants.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: COLORS.gray[500] }}>
                  No tenants found
                </div>
              ) : (
                tenants.map((tenant) => (
                  <div
                    key={tenant._id}
                    onClick={() => handleSelectTenant(tenant)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${COLORS.gray[100]}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = COLORS.gray[50]}
                    onMouseLeave={(e) => e.currentTarget.style.background = COLORS.white}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: COLORS.primary + '15',
                      color: COLORS.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>
                      {tenant.name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: COLORS.dark }}>
                        {tenant.name || 'Unknown Tenant'}
                      </div>
                      <div style={{ fontSize: '12px', color: COLORS.gray[500] }}>
                        Room {tenant.roomNumber} • {tenant.email || tenant.phone}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            )}
          </div>

          {/* Selected Tenant Display */}
          {selectedTenant && (
            <div style={{
              marginTop: '12px',
              padding: '16px 20px',
              background: '#22C55E26',
              border: '2px solid #22C55E',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <Check size={24} color="#22C55E" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#1F2937' }}>
                  {selectedTenant.name}
                </div>
                <div style={{ fontSize: '15px', color: '#DC2626', fontWeight: 700 }}>
                  📍 Room {selectedTenant.roomNumber} • 📱 {selectedTenant.phone}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visitor Form */}
        {registrationType === 'visitor' && (
          <form onSubmit={handleSubmitVisitor}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label 
                  htmlFor="visitor-name"
                  style={{ 
                    display: 'block', 
                    fontSize: '15px', 
                    fontWeight: 700, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Full Name <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
                </label>
                <input
                  id="visitor-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={visitorForm.name}
                  onChange={handleVisitorChange}
                  placeholder="Enter visitor name"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${COLORS.gray[300]}`,
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1F2937',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="visitor-phone"
                  style={{ 
                    display: 'block', 
                    fontSize: '15px', 
                    fontWeight: 700, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Phone Number <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
                </label>
                <input
                  id="visitor-phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  value={visitorForm.phone}
                  onChange={handleVisitorChange}
                  placeholder="Enter phone number (07xxxxxxxxx)"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${COLORS.gray[300]}`,
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1F2937',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label 
                  htmlFor="visitor-idnumber"
                  style={{ 
                    display: 'block', 
                    fontSize: '15px', 
                    fontWeight: 700, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  ID Number
                </label>
                <input
                  id="visitor-idnumber"
                  type="text"
                  name="idNumber"
                  autoComplete="off"
                  value={visitorForm.idNumber}
                  onChange={handleVisitorChange}
                  placeholder="National ID / Passport Number"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${COLORS.gray[300]}`,
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1F2937',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label 
                  htmlFor="visitor-vehicle"
                  style={{ 
                    display: 'block', 
                    fontSize: '15px', 
                    fontWeight: 700, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Vehicle Plate Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Car size={18} style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: COLORS.gray[400] 
                  }} />
                  <input
                    id="visitor-vehicle"
                    type="text"
                    name="vehiclePlate"
                    autoComplete="off"
                    value={visitorForm.vehiclePlate}
                    onChange={handleVisitorChange}
                    placeholder="KAA 123X (e.g., KBA 456Y)"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 48px',
                      border: `1px solid ${COLORS.gray[300]}`,
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#1F2937',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="visitor-purpose"
                  style={{ 
                    display: 'block', 
                    fontSize: '15px', 
                    fontWeight: 700, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Purpose of Visit
                </label>
                <select
                  id="visitor-purpose"
                  name="purpose"
                  autoComplete="off"
                  value={visitorForm.purpose}
                  onChange={handleVisitorChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${COLORS.gray[300]}`,
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1F2937',
                    outline: 'none',
                    background: COLORS.white,
                    boxSizing: 'border-box'
                  }}
                >
                  {purposes.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label 
                htmlFor="visitor-notes"
                style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: COLORS.dark,
                  marginBottom: '8px'
                }}
              >
                Notes
              </label>
              <textarea
                id="visitor-notes"
                name="notes"
                autoComplete="off"
                value={visitorForm.notes}
                onChange={handleVisitorChange}
                placeholder="Additional notes (optional)"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${COLORS.gray[200]}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !selectedTenant}
              style={{
                width: '100%',
                padding: '14px',
                background: (!selectedTenant || loading) ? COLORS.gray[300] : COLORS.primary,
                border: 'none',
                borderRadius: '10px',
                color: COLORS.white,
                fontSize: '15px',
                fontWeight: 600,
                cursor: (!selectedTenant || loading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                'Registering...'
              ) : (
                <>
                  <Send size={18} /> Register Visitor
                </>
              )}
            </motion.button>
          </form>
        )}

        {/* Delivery Form */}
        {registrationType === 'delivery' && (
          <form onSubmit={handleSubmitDelivery}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label 
                  htmlFor="courier-name"
                  style={{ 
                    display: 'block', 
                    fontSize: '15px', 
                    fontWeight: 700, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Courier Name <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
                </label>
                <input
                  id="courier-name"
                  type="text"
                  name="courierName"
                  autoComplete="name"
                  value={deliveryForm.courierName}
                  onChange={handleDeliveryChange}
                  placeholder="Enter courier name"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${COLORS.gray[300]}`,
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1F2937',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="courier-phone"
                  style={{ 
                    display: 'block', 
                    fontSize: '15px', 
                    fontWeight: 700, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Courier Phone <span style={{ color: COLORS.accent }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: COLORS.gray[400] 
                  }} />
                  <input
                    id="courier-phone"
                    type="tel"
                    name="courierPhone"
                    autoComplete="tel"
                    value={deliveryForm.courierPhone}
                    onChange={handleDeliveryChange}
                    placeholder="Enter phone number"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 48px',
                      border: `1px solid ${COLORS.gray[200]}`,
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="courier-company"
                  style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Courier Company
                </label>
                <input
                  id="courier-company"
                  type="text"
                  name="courierCompany"
                  autoComplete="organization"
                  value={deliveryForm.courierCompany}
                  onChange={handleDeliveryChange}
                  placeholder="e.g., FedEx, DHL, Amazon"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${COLORS.gray[200]}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label 
                  htmlFor="delivery-vehicle"
                  style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Vehicle Plate Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Car size={18} style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: COLORS.gray[400] 
                  }} />
                  <input
                    id="delivery-vehicle"
                    type="text"
                    name="vehiclePlate"
                    autoComplete="off"
                    value={deliveryForm.vehiclePlate}
                    onChange={handleDeliveryChange}
                    placeholder="KAA 123X"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 48px',
                      border: `1px solid ${COLORS.gray[200]}`,
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="parcel-description"
                  style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Parcel Description <span style={{ color: COLORS.accent }}>*</span>
                </label>
                <input
                  id="parcel-description"
                  type="text"
                  name="parcelDescription"
                  autoComplete="off"
                  value={deliveryForm.parcelDescription}
                  onChange={handleDeliveryChange}
                  placeholder="e.g., Small box, Large envelope"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${COLORS.gray[200]}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label 
                  htmlFor="tracking-number"
                  style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: COLORS.dark,
                    marginBottom: '8px'
                  }}
                >
                  Tracking Number
                </label>
                <input
                  id="tracking-number"
                  type="text"
                  name="trackingNumber"
                  autoComplete="off"
                  value={deliveryForm.trackingNumber}
                  onChange={handleDeliveryChange}
                  placeholder="Optional tracking number"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${COLORS.gray[200]}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label 
                htmlFor="delivery-notes"
                style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: COLORS.dark,
                  marginBottom: '8px'
                }}
              >
                Notes
              </label>
              <textarea
                id="delivery-notes"
                name="notes"
                autoComplete="off"
                value={deliveryForm.notes}
                onChange={handleDeliveryChange}
                placeholder="Additional notes (optional)"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${COLORS.gray[200]}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !selectedTenant}
              style={{
                width: '100%',
                padding: '14px',
                background: (!selectedTenant || loading) ? COLORS.gray[300] : COLORS.secondary,
                border: 'none',
                borderRadius: '10px',
                color: COLORS.white,
                fontSize: '15px',
                fontWeight: 600,
                cursor: (!selectedTenant || loading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                'Registering...'
              ) : (
                <>
                  <Send size={18} /> Register Delivery
                </>
              )}
            </motion.button>
          </form>
        )}
      </div>
    </div>

    </>
  );
};

export default GuardRegister;
