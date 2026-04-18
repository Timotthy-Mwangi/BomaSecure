import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI } from '../../services/api';
import { COLORS, VISITOR_PURPOSES } from '../../config';
import { Users, ArrowLeft, Plus, Calendar, Phone, FileText } from 'lucide-react';
import QRCodeDisplay from '../common/QRCodeDisplay';

const NewVisitor = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [qrData, setQrData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    idNumber: '',
    purpose: 'guest',
    vehiclePlate: '',
    expectedArrival: '',
    notes: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name || !formData.phone) {
      setError('Name and phone number are required');
      setLoading(false);
      return;
    }

    try {
      const response = await visitorsAPI.create({
        ...formData,
        hostTenantId: user._id,
        roomNumber: user.roomNumber
      });
      
      // Check if QR code is already included in the response
      if (response.data.qrCode) {
        setQrData(response.data.qrCode);
      } else {
        // Fetch the QR code if not included
        const qrResponse = await visitorsAPI.getQRCode(response.data.visitor._id);
        setQrData(qrResponse.data.qrCode);
      }
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create visitor');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', paddingTop: '40px' }}>
        <QRCodeDisplay 
          qrData={qrData} 
          type="visitor"
          onClose={() => navigate('/tenant/visitors')}
        />
      </div>
    );
  }

  return (
    <>
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/tenant/visitors" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={18} /> Back to Visitors
        </Link>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: COLORS.dark }}>Pre-approve Visitor</h1>
        <p style={{ margin: '8px 0 0', color: COLORS.gray[700] }}>
          Pre-approve a visitor for quick check-in
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: `${COLORS.accent}15`,
            border: `1px solid ${COLORS.accent}`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: COLORS.accent
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ 
        background: COLORS.white, 
        borderRadius: '16px', 
        padding: '24px',
        border: `1px solid ${COLORS.gray[200]}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Visitor Name */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.gray[700],
              marginBottom: '8px'
            }}>
              Visitor Name *
            </label>
            <div style={{ position: 'relative' }}>
              <Users size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray[400] }} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full name"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: `1px solid ${COLORS.gray[200]}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.gray[700],
              marginBottom: '8px'
            }}>
              Phone Number *
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray[400] }} />
              <input
                id="visitor-phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: `1px solid ${COLORS.gray[200]}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* ID Number */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.gray[700],
              marginBottom: '8px'
            }}>
              ID Number (Optional)
            </label>
            <input
              type="text"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              placeholder="National ID or Passport"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${COLORS.gray[200]}`,
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Purpose */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.gray[700],
              marginBottom: '8px'
            }}>
              Purpose of Visit
            </label>
            <select
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${COLORS.gray[200]}`,
                borderRadius: '8px',
                fontSize: '14px',
                background: COLORS.white,
                boxSizing: 'border-box'
              }}
            >
              {VISITOR_PURPOSES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Plate */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.gray[700],
              marginBottom: '8px'
            }}>
              Vehicle Plate (Optional)
            </label>
            <input
              type="text"
              name="vehiclePlate"
              value={formData.vehiclePlate}
              onChange={handleChange}
              placeholder="Vehicle registration"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${COLORS.gray[200]}`,
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Expected Arrival */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.gray[700],
              marginBottom: '8px'
            }}>
              Expected Arrival (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray[400] }} />
              <input
                type="datetime-local"
                name="expectedArrival"
                value={formData.expectedArrival}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: `1px solid ${COLORS.gray[200]}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.gray[700],
              marginBottom: '8px'
            }}>
              Additional Notes (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: COLORS.gray[400] }} />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional information..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: `1px solid ${COLORS.gray[200]}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={loading}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '14px',
            background: COLORS.primary,
            border: 'none',
            borderRadius: '10px',
            color: COLORS.white,
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Plus size={18} />
          {loading ? 'Creating...' : 'Pre-approve Visitor'}
        </motion.button>
      </form>
    </div>

    </>
  );
};

export default NewVisitor;
