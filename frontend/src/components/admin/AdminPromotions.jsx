import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { promotionalAPI } from '../../services/api';
import { API_URL } from '../../config';
import { COLORS } from '../../config';
import { Upload, X, DollarSign, Calendar, Image, Trash2, Edit, Camera, Phone } from 'lucide-react';
import socketService from '../../services/socket';

const PRICING = [
  { duration: '24h', label: '24 Hours', price: 2 },
  { duration: '7d', label: '7 Days', price: 12 },
  { duration: '30d', label: '30 Days', price: 55 }
];

const AdminPromotions = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageFiles: [],
    linkUrl: '',
    adType: 'general',
    duration: '24h',
    contactPhone: '',
    rentAmount: '',
    unitNumber: ''
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalAds: 0, activeAds: 0, totalImpressions: 0, totalClicks: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAds();
    fetchStats();

    const handleStatsUpdate = (data) => {
      setAds(prev => prev.map(ad => 
        ad._id === data.adId 
          ? { ...ad, impressions: data.impressions, clicks: data.clicks }
          : ad
      ));
      setStats(prev => ({
        ...prev,
        totalImpressions: prev.totalImpressions + 1,
        totalClicks: prev.totalClicks + 1
      }));
    };

    socketService.addListener('promo:stats:update', handleStatsUpdate);

    return () => {
      socketService.removeListener('promo:stats:update', handleStatsUpdate);
    };
  }, []);

  const fetchAds = async () => {
    try {
      const res = await promotionalAPI.getMyAds();
      setAds(res.data.ads || []);
    } catch (err) {
      console.error('Error fetching ads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await promotionalAPI.getStats();
      setStats(res.data.stats || { totalAds: 0, activeAds: 0, totalImpressions: 0, totalClicks: 0 });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.imageFiles.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }
    
    const validFiles = files.filter(file => {
      if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        setError('Please select valid image files (jpeg, jpg, png, gif, webp)');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Each image must be less than 5MB');
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      setFormData({ ...formData, imageFiles: [...formData.imageFiles, ...validFiles] });
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews]);
      setError('');
    }
  };

  const removeImage = (index) => {
    const newFiles = formData.imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setFormData({ ...formData, imageFiles: newFiles });
    setImagePreviews(newPreviews);
    if (activeImageIndex >= newFiles.length) {
      setActiveImageIndex(Math.max(0, newFiles.length - 1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (formData.imageFiles.length === 0 && !editingAd) {
      setError('Please select at least one image');
      setSaving(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('linkUrl', formData.linkUrl);
      formDataToSend.append('adType', formData.adType);
      formDataToSend.append('duration', formData.duration);
      formDataToSend.append('imageIndex', activeImageIndex);
      if (formData.contactPhone) formDataToSend.append('contactPhone', formData.contactPhone);
      if (formData.rentAmount) formDataToSend.append('rentAmount', formData.rentAmount);
      if (formData.unitNumber) formDataToSend.append('unitNumber', formData.unitNumber);
      
      formData.imageFiles.forEach(file => {
        formDataToSend.append('images', file);
      });

      if (editingAd) {
        await promotionalAPI.update(editingAd._id, formDataToSend);
      } else {
        await promotionalAPI.create(formDataToSend);
      }
      
      await fetchAds();
      await fetchStats();
      setShowModal(false);
      setEditingAd(null);
setFormData({ title: '', description: '', imageFiles: [], linkUrl: '', adType: 'general', duration: '24h', contactPhone: '', rentAmount: '', unitNumber: '' });
      setImagePreviews([]);
      setActiveImageIndex(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save ad');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) return;
    
    try {
      await promotionalAPI.delete(id);
      await fetchAds();
      await fetchStats();
    } catch (err) {
      console.error('Error deleting ad:', err);
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    const images = ad.images || (ad.imageUrl ? [ad.imageUrl] : []);
    const loadedPreviews = images.map(img => 
      img.startsWith('http') ? img : `${API_URL}${img}`
    );
    setFormData({
      title: ad.title,
      description: ad.description || '',
      imageFiles: [],
      linkUrl: ad.linkUrl || '',
      adType: ad.adType || 'general',
      duration: ad.duration,
      contactPhone: ad.contactPhone || '',
      rentAmount: ad.price || '',
      unitNumber: ad.unitId || ''
    });
    setImagePreviews(loadedPreviews);
    setActiveImageIndex(ad.activeImageIndex || 0);
    setShowModal(true);
  };

  const getStatusBadge = (ad) => {
    const isExpired = new Date(ad.endDate) < new Date();
    const isActive = ad.status === 'active' && !isExpired;
    
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: isActive ? '#10B98120' : isExpired ? '#EF444420' : '#F59E0B20',
        color: isActive ? '#10B981' : isExpired ? '#EF4444' : '#F59E0B'
      }}>
        {isActive ? 'Active' : isExpired ? 'Expired' : 'Paused'}
      </span>
    );
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  return (
    <div style={{ padding: '16px' }}>
      <style>{`
        @media (max-width: 768px) {
          .promo-grid { grid-template-columns: 1fr !important; }
          .promo-stats { flex-direction: column !important; }
        }
      `}</style>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: COLORS.text, marginBottom: '4px' }}>Promotions</h1>
            <p style={{ color: COLORS.textSecondary, fontSize: '13px' }}>Create and manage promotional ads for buildings and units</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setEditingAd(null); setFormData({ title: '', description: '', imageFiles: [], linkUrl: '', adType: 'general', duration: '24h', contactPhone: '', rentAmount: '', unitNumber: '' }); setImagePreviews([]); setActiveImageIndex(0); setError(''); }}
            style={{ padding: '10px 20px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={18} /> Create Ad
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }} className="promo-stats">
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: COLORS.text }}>{stats.totalAds}</div>
            <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>Total Ads</div>
          </div>
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{stats.activeAds}</div>
            <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>Active</div>
          </div>
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3B82F6' }}>{stats.totalImpressions}</div>
            <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>Impressions</div>
          </div>
          <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8B5CF6' }}>{stats.totalClicks}</div>
            <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>Clicks</div>
          </div>
        </div>

        {/* Pricing Info */}
        <div style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.text, marginBottom: '12px' }}>Pricing</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {PRICING.map(p => (
              <div key={p.duration} style={{ backgroundColor: '#0F172A', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: COLORS.primary }}>${p.price}</div>
                <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* My Ads */}
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: COLORS.text, marginBottom: '16px' }}>My Ads</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary }}>Loading...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#1E293B', borderRadius: '12px' }}>
            <Image size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p style={{ color: COLORS.textSecondary }}>No ads yet. Create your first ad!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }} className="promo-grid">
            {ads.map((ad) => (
              <div key={ad._id} style={{ backgroundColor: '#1E293B', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ height: '150px', backgroundColor: '#0F172A', backgroundImage: ad.imageUrl ? `url(${getImageUrl(ad.imageUrl)})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                  {!ad.imageUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: COLORS.textSecondary }}>
                      <Image size={32} />
                    </div>
                  )}
                  {getStatusBadge(ad)}
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleEdit(ad)} style={{ padding: '6px', backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit size={14} color="#fff" /></button>
                    <button onClick={() => handleDelete(ad._id)} style={{ padding: '6px', backgroundColor: 'rgba(239,68,68,0.5)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} color="#fff" /></button>
                  </div>
                </div>
                <div style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '4px' }}>{ad.title}</h3>
                  {ad.description && <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '8px' }}>{ad.description}</p>}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: COLORS.textSecondary, flexWrap: 'wrap' }}>
                    {ad.contactPhone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {ad.contactPhone}</span>}
                    {ad.price > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={12} /> KES {ad.price.toLocaleString()}</span>}
                    {ad.unitId && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>#{ad.unitId}</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {new Date(ad.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: COLORS.text, margin: 0 }}>{editingAd ? 'Edit Ad' : 'Create New Ad'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color={COLORS.textSecondary} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: '14px' }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: '14px', minHeight: '80px' }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Upload Image *</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: '150px',
                    border: '2px dashed #334155',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#0F172A',
                    overflow: 'hidden'
                  }}
                >
                  {imagePreviews.length > 0 ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <img 
                        src={imagePreviews[activeImageIndex]} 
                        alt={`Preview ${activeImageIndex + 1}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      {imagePreviews.length > 1 && (
                        <div style={{ 
                          position: 'absolute', 
                          bottom: '8px', 
                          left: '50%', 
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: '4px'
                        }}>
                          {imagePreviews.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setActiveImageIndex(idx); }}
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                border: 'none',
                                background: idx === activeImageIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(activeImageIndex); }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: 'none',
                          background: '#EF4444',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera size={32} color={COLORS.textSecondary} style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>Click to upload images (up to 5)</span>
                      <span style={{ fontSize: '12px', color: COLORS.textSecondary, opacity: 0.7 }}>jpeg, jpg, png, gif, webp (max 5MB each)</span>
                    </>
                  )}
                </div>
              </div>
              
              {imagePreviews.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '8px' }}>
                    All Images ({imagePreviews.length}/5)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {imagePreviews.map((preview, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setActiveImageIndex(idx)}
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '8px', 
                          overflow: 'hidden',
                          border: idx === activeImageIndex ? '2px solid #3B82F6' : '2px solid transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <img src={preview} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                    {imagePreviews.length < 5 && (
                      <label style={{
                        width: '60px',
                        height: '60px',
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
                          onChange={handleImageChange}
                          style={{ display: 'none' }}
                        />
                        <Camera size={20} color="#64748B" />
                      </label>
                    )}
                  </div>
                </div>
              )}
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: '14px' }}
                  placeholder="+254700000000"
                />
              </div>

              {(formData.adType === 'building' || formData.adType === 'unit') && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Rent Amount (KES)</label>
                    <input
                      type="number"
                      value={formData.rentAmount}
                      onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: '14px' }}
                      placeholder="50000"
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Unit Number</label>
                    <input
                      type="text"
                      value={formData.unitNumber}
                      onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: '14px' }}
                      placeholder="101"
                    />
                  </div>
                </>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Link URL (optional)</label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: '14px' }}
                  placeholder="https://example.com/property"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Ad Type</label>
                <select
                  value={formData.adType}
                  onChange={(e) => setFormData({ ...formData, adType: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: '14px' }}
                >
                  <option value="general">General</option>
                  <option value="building">Building</option>
                  <option value="unit">Unit</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' }}>Duration *</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: '14px' }}
                  required
                >
                  {PRICING.map(p => (
                    <option key={p.duration} value={p.duration}>{p.label} - ${p.price}</option>
                  ))}
                </select>
              </div>
              
              {error && <p style={{ color: '#EF4444', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', backgroundColor: '#334155', color: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 20px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editingAd ? 'Update Ad' : 'Create Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
