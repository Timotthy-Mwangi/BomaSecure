import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME, APP_TAGLINE, COLORS, API_BASE_URL } from '../../config';
import { Users, Package, QrCode, Bell, Key, Building, ArrowRight, Wrench, CreditCard, AlertTriangle, MessageSquare } from 'lucide-react';
import api, { promotionalAPI } from '../../services/api';
import logo from "../../assets/bomasecure.png";

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80',
    title: 'Welcome to BomaSecure',
    subtitle: 'Modern Visitor Management System',
    description: 'Streamline your apartment complex security with real-time visitor tracking'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&q=80',
    title: 'Real-Time Monitoring',
    subtitle: 'Stay Connected',
    description: 'Get instant notifications when visitors arrive at your doorstep'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=1200&q=80',
    title: 'Smart Delivery Management',
    subtitle: 'Never Miss a Package',
    description: 'Track and manage all deliveries with our intelligent system'
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
    title: 'Secure Access Control',
    subtitle: 'Your Safety First',
    description: 'QR code based check-in for seamless and secure visitor entry'
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80',
    title: 'Maintenance Management',
    subtitle: 'Keep Your Property Running',
    description: 'Submit and track maintenance requests with ease'
  },
  {
    id: 6,
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80',
    title: 'Online Rent Payments',
    subtitle: 'Simple & Secure',
    description: 'Pay rent online and track your payment history'
  }
];

const features = [
  {
    icon: Users,
    title: 'Visitor Tracking',
    description: 'Real-time visitor check-in and check-out tracking',
    color: COLORS.primary
  },
  {
    icon: Package,
    title: 'Delivery Management',
    description: 'Smart package notifications and retrieval system',
    color: '#F59E0B'
  },
  {
    icon: QrCode,
    title: 'QR Check-In',
    description: 'Contactless visitor registration with QR codes',
    color: COLORS.secondary
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    description: 'Get notified instantly about arrivals',
    color: '#10B981'
  },
  {
    icon: Wrench,
    title: 'Maintenance Tracking',
    description: 'Submit and track maintenance requests easily',
    color: '#8B5CF6'
  },
  {
    icon: CreditCard,
    title: 'Rent Payments',
    description: 'Online rent payment and ledger tracking',
    color: '#EC4899'
  },
  {
    icon: AlertTriangle,
    title: 'Emergency Alerts',
    description: 'Quick emergency broadcast to all residents',
    color: '#EF4444'
  },
  {
    icon: MessageSquare,
    title: 'Feedback System',
    description: 'Share feedback and suggestions with management',
    color: '#06B6D4'
  }
];

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [plans, setPlans] = useState([]);
  const [activeAds, setActiveAds] = useState([]);

  useEffect(() => {
    fetchPlans();
    fetchActiveAds();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/payments/plans');
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchActiveAds = async () => {
    try {
      const res = await promotionalAPI.getActive();
      setActiveAds(res.data.ads || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAdClick = async (ad) => {
    try {
      await promotionalAPI.trackClick(ad._id);
    } catch (error) {
      console.error('Error tracking click:', error);
    }
    if (ad.linkUrl) {
      window.open(ad.linkUrl, '_blank');
    }
  };

  const getAdImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  // Get the current display image from ads with multiple images
  const getDisplayImage = (ad, index) => {
    if (ad.images && ad.images.length > 0) {
      const imgIndex = ad.activeImageIndex || 0;
      return getAdImageUrl(ad.images[imgIndex]);
    }
    return getAdImageUrl(ad.imageUrl);
  };

  // Auto-rotate through images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAds(prev => prev.map(ad => {
        if (ad.images && ad.images.length > 1) {
          const currentIndex = ad.activeImageIndex || 0;
          const nextIndex = (currentIndex + 1) % ad.images.length;
          return { ...ad, activeImageIndex: nextIndex };
        }
        return ad;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Slider */}
      <div style={{
        position: 'relative',
        height: 'clamp(500px, 80vh, 800px)',
        minHeight: '500px',
        overflow: 'hidden'
      }}>
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${slides[currentSlide].image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        </AnimatePresence>
        
        {/* Glass Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)',
          backdropFilter: 'blur(2px)'
        }} />

        {/* Glass Cards */}
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '900px',
              textAlign: 'center',
              padding: 'clamp(32px, 6vw, 64px)',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 'clamp(20px, 5vw, 32px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)'
            }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '30px',
                color: '#fff',
                fontSize: 'clamp(11px, 2vw, 14px)',
                fontWeight: 600,
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              {slides[currentSlide].subtitle}
            </motion.span>
            
            {/* Logo */}
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
              src={logo}
              alt="BomaSecure Logo"
              style={{
                width: '120px',
                height: '120px',
                marginBottom: '20px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }}
            />
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                fontSize: 'clamp(28px, 5vw, 48px)',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '8px',
                lineHeight: 1.2
              }}
            >
              {slides[currentSlide].title}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                fontSize: 'clamp(14px, 2vw, 16px)',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '20px',
                maxWidth: '600px',
                margin: '0 auto 20px'
              }}
            >
              {slides[currentSlide].description}
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '14px 32px',
                    background: COLORS.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: 'clamp(14px, 2vw, 18px)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Sign In <ArrowRight size={20} />
                </motion.button>
              </Link>
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '14px 32px',
                    background: 'rgba(255, 255, 255, 0.25)',
                    color: '#fff',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '12px',
                    fontSize: 'clamp(14px, 2vw, 18px)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Get Started
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

        </AnimatePresence>

          {/* Slide Indicators */}
          <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '12px'
          }}>
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                style={{
                  width: currentSlide === index ? '32px' : '12px',
                  height: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: currentSlide === index 
                    ? COLORS.primary 
                    : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
</div>
        </div>

        {/* Airbnb-style Promotional Ads Banner - Placed at edges */}
        {activeAds.length > 0 && (
          <div style={{
            padding: '24px',
            background: 'linear-gradient(180deg, #f8f9fa 0%, #fff 100%)',
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '16px',
              paddingLeft: '4px'
            }}>
              Featured Properties
            </h3>
            <div style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              paddingBottom: '12px',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch'
            }}>
              {activeAds.map((ad) => (
                <motion.div
                  key={ad._id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAdClick(ad)}
                  style={{
                    minWidth: '260px',
                    maxWidth: '280px',
                    background: '#fff',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: ad.linkUrl ? 'pointer' : 'default',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid #e8e8e8',
                    flexShrink: 0,
                    scrollSnapAlign: 'start'
                  }}
                >
                  <div style={{
                    height: '160px',
                    backgroundColor: '#f0f0f0',
                    position: 'relative'
                  }}>
                    {ad.images && ad.images.length > 0 ? (
                      <img 
                        src={getDisplayImage(ad, 0)}
                        alt={ad.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '32px',
                        fontWeight: '700'
                      }}>
                        {ad.title?.charAt(0) || 'F'}
                      </div>
                    )}
                    {ad.images && ad.images.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '4px'
                      }}>
                        {ad.images.map((_, i) => (
                          <span key={i} style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: i === (ad.activeImageIndex || 0) ? '#fff' : 'rgba(255,255,255,0.5)'
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px' }}>
                    <h4 style={{
                      margin: '0 0 6px 0',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {ad.title}
                    </h4>
                    {ad.description && (
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#666',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {ad.description}
                      </p>
                    )}
                    {ad.rentAmount && (
                      <p style={{
                        margin: '8px 0 0 0',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#1a1a1a'
                      }}>
                        KES {parseInt(ad.rentAmount).toLocaleString()}/mo
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            <style>{`
              div[style*="overflowX: 'auto'"]::-webkit-scrollbar {
                height: 6px;
              }
              div[style*="overflowX: 'auto'"]::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
              }
              div[style*="overflowX: 'auto'"]::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 3px;
              }
              div[style*="overflowX: 'auto'"]::-webkit-scrollbar-thumb:hover {
                background: #aaa;
              }
            `}</style>
          </div>
        )}

        {/* Static Pricing Section */}
      {plans.length > 0 && (
        <div style={{
          padding: '40px 20px',
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ maxWidth: '900px', margin: '0 auto' }}
          >
            <h2 style={{
              textAlign: 'center',
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#e2e8f0',
              marginBottom: '24px'
            }}>
              Simple Pricing for Admins
            </h2>
            <p style={{
              textAlign: 'center',
              color: '#94a3b8',
              marginBottom: '24px'
            }}>
              Guards & Tenants get FREE lifetime access! <br/>
              <span style={{ fontSize: '14px', color: '#fbbf24' }}>
                💡 Contact your landlord/landlady/property manager to get your account registered
              </span>
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              {plans.map((plan) => (
                <div key={plan.id} style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  textAlign: 'center',
                  minWidth: '200px',
                }}>
                  <h4 style={{ color: '#60a5fa', margin: '0 0 12px 0', fontSize: '18px' }}>{plan.name}</h4>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>${plan.priceUSD}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>/mo</span>
                  </div>
                  {plan.priceKES && (
                    <p style={{ color: 'rgba(148, 163, 184, 0.9)', fontSize: '12px', margin: '0 0 16px 0' }}>
                      KES {plan.priceKES.toLocaleString()}
                    </p>
                  )}
                  <button
                    onClick={() => window.location.href = '/admin/payment'}
                    style={{
                      background: '#1E293B',
                      color: '#60A5FA',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    {plan.trialDays > 0 ? `Start ${plan.trialDays}-Day Trial` : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Features Section */}
      <div style={{
        padding: '80px 20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <h2 style={{
            fontSize: '42px',
            fontWeight: 700,
            color: COLORS.text,
            marginBottom: '16px'
          }}>
            Why Choose BomaSecure?
          </h2>
          <p style={{
            fontSize: '20px',
            color: COLORS.textSecondary,
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            A comprehensive solution for modern apartment living
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '32px'
        }}>
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              style={{
                padding: '40px',
                background: '#1E293B',
                borderRadius: '20px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: feature.color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <feature.icon size={40} color={feature.color} />
              </div>
              <h3 style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#F1F5F9',
                marginBottom: '12px'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#94A3B8',
                lineHeight: 1.6
              }}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div style={{
        padding: '80px 20px',
        background: '#1E293B'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '60px' }}
          >
            <h2 style={{
              fontSize: '42px',
              fontWeight: 700,
              color: COLORS.dark,
              marginBottom: '16px'
            }}>
              How It Works
            </h2>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '40px',
            textAlign: 'center'
          }}>
            {[
              { icon: Key, title: 'Landlord Signs Up', desc: 'Property owner/manager creates account' },
              { icon: Building, title: 'Landlord Invites', desc: 'Property manager registers guards & tenants' },
              { icon: Bell, title: 'Get Notified', desc: 'Tenants & guards receive alerts' },
              { icon: QrCode, title: 'Track', desc: 'Monitor all activity in real-time' },
              { icon: Wrench, title: 'Maintenance', desc: 'Submit & track repair requests' },
              { icon: CreditCard, title: 'Pay Rent', desc: 'Online payments with ledger tracking' }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  position: 'relative',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)'
                }}>
                  <step.icon size={44} color="#fff" />
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: COLORS.accent,
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {index + 1}
                  </div>
                </div>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: COLORS.dark,
                  marginBottom: '12px'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: COLORS.gray[600]
                }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '60px 20px',
        background: COLORS.dark,
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '140px',
            height: '140px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img 
              src={logo}
              alt="BomaSecure Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <span style={{
            fontSize: '40px',
            fontWeight: 700,
            color: '#fff'
          }}>
            {APP_NAME}
          </span>
        </div>
        <p style={{
          color: COLORS.gray[400],
          fontSize: '16px'
        }}>
          {APP_TAGLINE}
        </p>
        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '24px'
        }}>
          <a href="/terms" style={{ color: COLORS.gray[400], textDecoration: 'none', fontSize: '14px' }}>Terms & Conditions</a>
          <a href="/privacy" style={{ color: COLORS.gray[400], textDecoration: 'none', fontSize: '14px' }}>Privacy Policy</a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .glass-card {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            transform: none !important;
            width: 95% !important;
            max-width: none !important;
            padding: 20px !important;
            border-radius: 16px !important;
            margin: 20px auto !important;
          }
        }
        @media (max-width: 480px) {
          .glass-card {
            padding: 16px !important;
            margin: 16px auto !important;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
