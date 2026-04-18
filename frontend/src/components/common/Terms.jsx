import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, Mail, MapPin, AlertTriangle } from 'lucide-react';
import { COLORS } from '../../config';

const TermsPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: '#1E293B',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: COLORS.primary,
          textDecoration: 'none',
          marginBottom: '32px',
          fontWeight: 600
        }}>
          <ArrowLeft size={20} /> Back to Home
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: COLORS.primary + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Scale size={32} color={COLORS.primary} />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: 700,
              color: '#F8FAFC'
            }}>
              Terms and Conditions
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '14px' }}>
              Last Updated: April 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ color: '#CBD5E1', lineHeight: 1.8, fontSize: '15px' }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>1. Acceptance of Terms</h2>
            <p>
              By accessing and using BomaSecure ("the Platform", "we", "us", or "our"), you agree to be bound by these Terms and Conditions ("Terms"). Your continued use constitutes full acceptance. If you do not agree to these Terms, do not use our services.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>2. Description of Service</h2>
            <p>
              BomaSecure is a property management and visitor management system. <strong>We reserve the right to modify, suspend, or discontinue any feature at any time without notice.</strong>
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>Visitor registration and tracking</li>
              <li>Delivery management</li>
              <li>Access control and security monitoring</li>
              <li>QR code-based visitor and delivery access</li>
              <li>Maintenance request management</li>
              <li>Emergency alerts and incident reporting</li>
              <li>Announcements and notifications</li>
              <li>Payment tracking and rent management</li>
              <li>Revenue splits and payouts for property managers</li>
              <li>Real-time notifications via SMS and push</li>
              <li>Promotional content management</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>3. User Eligibility</h2>
            
            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>3.1 Admin Users</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
              <li>Must be the property owner or authorized representative</li>
              <li>Must be at least 18 years of age</li>
              <li>Must provide accurate and complete registration information</li>
              <li><strong>Are fully responsible for all activities under their account</strong></li>
              <li><strong>Warrant that they have authority to collect data on behalf of their property</strong></li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>3.2 Guard and Tenant Users</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
              <li>Must be invited by an authorized Admin</li>
              <li>Must accept the invitation and complete registration</li>
              <li>Are subject to these Terms and the Admin's property rules</li>
              <li><strong>Acknowledge that their data may be collected and managed by property admins</strong></li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>3.3 Maintenance Staff</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Must be registered by an authorized Admin</li>
              <li>Are assigned to handle maintenance requests</li>
              <li>Have access to maintenance management features</li>
              <li>Are subject to these Terms and property management rules</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>4. User Responsibilities</h2>
            
            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>4.1 Admin Responsibilities</h3>
            <p>Admin users acknowledge and agree to:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
              <li><strong>Obtain all necessary consents</strong> for data collection from tenants, visitors, and staff</li>
              <li><strong>Comply with all applicable data protection laws</strong> in their jurisdiction</li>
              <li>Maintain accurate records of all users</li>
              <li>Provide appropriate notice to tenants about surveillance and data collection</li>
              <li>Report security incidents to appropriate authorities as required by law</li>
              <li><strong>Accept sole responsibility for the lawful collection of biometric data</strong></li>
              <li><strong>Indemnify BomaSecure for any claims arising from improper data collection</strong></li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>4.2 User Conduct</h3>
            <p>Users agree NOT to:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Use the Platform for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to any data or systems</li>
              <li>Share account credentials with unauthorized persons</li>
              <li>Harass, defame, or invade privacy of others</li>
              <li>Upload malicious code or attempt to disrupt service</li>
              <li>Use the Platform for purposes beyond its intended use</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
            </ul>
            <p style={{ marginTop: '12px', color: '#F87171' }}><strong>Violations may result in immediate account termination without refund.</strong></p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>5. Data Collection and Privacy</h2>
            <p><strong>By using our Platform, you consent to our collection of:</strong></p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>Personal identification (name, phone, email, ID numbers)</li>
              <li>Government-issued ID copies</li>
              <li>Vehicle information and license plates</li>
              <li>Biometric data (facial recognition, fingerprints)</li>
              <li>Photographs and profile images</li>
              <li>Check-in/check-out photos from visitor tracking</li>
              <li>Access logs and timestamps</li>
              <li>Financial data (bank accounts, M-Pesa details)</li>
              <li>Payment and transaction records</li>
              <li>Location data (GPS coordinates)</li>
              <li>Device information (IP addresses, FCM tokens)</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              <strong>You acknowledge that we may use aggregated, anonymized data for any purpose including commercial purposes without compensation.</strong>
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>6. Limitation of Liability</h2>
            
            <div style={{ 
              background: '#EF444420', 
              border: '1px solid #EF444450', 
              borderRadius: '8px', 
              padding: '16px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, color: '#F87171', fontSize: '14px' }}>
                <AlertTriangle size={16} style={{ marginRight: '8px' }} />
                <strong>IMPORTANT: READ THIS SECTION CAREFULLY</strong>
              </p>
            </div>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>6.1 Disclaimer</h3>
            <p>BomaSecure provides the platform "AS IS" and "AS AVAILABLE" without warranties of any kind. <strong>You use the Platform at your own risk.</strong></p>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>6.2 Exclusion of Liability</h3>
            <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, BOMASECURE SHALL NOT BE LIABLE FOR ANY:</strong></p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
              <li>Indirect, incidental, consequential, special, or punitive damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Property damage or personal injury</li>
              <li>Loss of property or belongings</li>
              <li>Security breaches or data loss</li>
              <li>Decisions made based on Platform data</li>
              <li>Acts of God, natural disasters, or Force Majeure</li>
              <li>Third-party actions or inactions</li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>6.3 Liability Cap</h3>
            <p>Our total liability, if any, shall not exceed the fees paid by the user in the 12 months preceding the claim. <strong>This limitation applies regardless of the theory of liability.</strong></p>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>6.4 No Liability for Property Matters</h3>
            <p>BomaSecure is not responsible for:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Any disputes between property owners, tenants, or visitors</li>
              <li>The conduct of any user</li>
              <li>Security incidents or crimes on any property</li>
              <li>The accuracy of visitor or delivery information</li>
              <li>Any property management decisions</li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>6.5 Assumption of Risk</h3>
            <p><strong>You acknowledge that security systems have inherent limitations and you assume all risks associated with using the Platform.</strong></p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>7. Indemnification</h2>
            <p>
              Users agree to <strong>indemnify, defend, and hold harmless</strong> BomaSecure, its officers, directors, employees, agents, and affiliates from <strong>ANY AND ALL claims, damages, losses, costs, and expenses (including reasonable attorneys' fees)</strong> arising from:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>User's use of the Platform</li>
              <li>User's violation of these Terms</li>
              <li>User's violation of any third-party rights</li>
              <li>User's illegal or improper conduct</li>
              <li>Any data the user collects or processes</li>
              <li>Claims by tenants, visitors, or third parties related to user's property</li>
              <li>Any claims arising from user's failure to obtain proper consents</li>
            </ul>
            <p style={{ marginTop: '12px', color: '#F87171' }}>
              <strong>This indemnification is unlimited and applies regardless of whether we contributed to the claim.</strong>
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>8. Termination</h2>
            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>8.1 Termination by User</h3>
            <p>Users may request account deletion at any time. <strong>Data retention policies continue to apply after deletion. No refunds for any paid services.</strong></p>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px', marginTop: '16px' }}>8.2 Termination by Us</h3>
            <p>We may, at our sole discretion, terminate any account <strong>immediately, without notice</strong>, for:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Violation of these Terms</li>
              <li>Non-payment (if applicable)</li>
              <li>Suspected illegal activity</li>
              <li>Failure to maintain accurate information</li>
              <li><strong>Any reason we deem appropriate</strong></li>
            </ul>
            <p style={{ marginTop: '12px' }}><strong>We are not liable for any damages resulting from termination.</strong></p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>9. Governing Law and Arbitration</h2>
            
            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>9.1 Governing Law</h3>
            <p>These Terms shall be governed by the laws of Kenya, without regard to conflict of law principles.</p>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px', marginTop: '16px' }}>9.2 Binding Arbitration</h3>
            <p>Any dispute shall be resolved through <strong>binding arbitration in Nairobi, Kenya</strong>, under the rules of the Nairobi International Arbitration Centre. The arbitrator's decision is final and binding.</p>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px', marginTop: '16px' }}>9.3 Waiver of Class Actions</h3>
            <p><strong>You agree that any claims will be filed on an individual basis only. You waive any right to participate in a class action, class arbitration, or representative action.</strong></p>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px', marginTop: '16px' }}>9.4 Limitation Period</h3>
            <p><strong>Any claims must be filed within one (1) year of the event giving rise to the claim, or are forever barred.</strong></p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>10. Modifications</h2>
            <p>
              We reserve the right to modify these Terms at any time <strong>without notice</strong>. Continued use after changes constitutes acceptance. We may provide notice via email or platform notification, but are not obligated to do so.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>11. Contact Information</h2>
            <p>For questions about these Terms, contact:</p>
            <div style={{ marginTop: '12px', paddingLeft: '20px' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Mail size={16} color={COLORS.primary} /> secureboma@gmail.com
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color={COLORS.primary} /> Nairobi, Kenya
              </p>
            </div>
          </section>

          <div style={{
            background: '#EF444420',
            border: '1px solid #EF444450',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '40px'
          }}>
            <p style={{ margin: 0, color: '#F87171', fontWeight: 600, fontSize: '14px' }}>
              ⚠️ BY USING BOMASECURE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS, INCLUDING THE LIMITATION OF LIABILITY, INDEMNIFICATION, AND ARBITRATION PROVISIONS. YOU WAIVE ANY RIGHT TO PARTICIPATE IN CLASS ACTIONS.
            </p>
            <p style={{ margin: '12px 0 0', color: '#CBD5E1', fontSize: '13px' }}>
              (If you do not agree to these Terms, you must immediately stop using the Platform.)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;