import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck, Cookie, AlertCircle, Mail, MapPin } from 'lucide-react';
import { COLORS } from '../../config';

const PrivacyPage = () => {
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
            <Shield size={32} color={COLORS.primary} />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: 700,
              color: '#F8FAFC'
            }}>
              Privacy Policy
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '14px' }}>
              Last Updated: April 2026
            </p>
          </div>
        </div>

        {/* Quick Summary */}
        <div style={{
          background: '#10B98120',
          border: '1px solid #10B98150',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <Eye size={32} color="#10B981" />
          <div>
            <h3 style={{ margin: 0, color: '#10B981', fontSize: '16px' }}>Your Privacy Matters</h3>
            <p style={{ margin: '4px 0 0', color: '#CBD5E1', fontSize: '14px' }}>
              We never sell your personal data. Your information is used only to provide our services.
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ color: '#CBD5E1', lineHeight: 1.8, fontSize: '15px' }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserCheck size={24} color={COLORS.primary} /> Who We Are
            </h2>
            <p>
              BomaSecure ("we", "our", "us") operates a property management and visitor management platform. By using our Platform, you expressly consent to our collection, use, and disclosure of your information as described in this policy.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Database size={24} color={COLORS.primary} /> What Data We Collect
            </h2>
            
            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>Personal Data</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
              <li>Full name and contact information (phone, email, address)</li>
              <li>Government-issued ID numbers and copies</li>
              <li>Vehicle registration details and license plates</li>
              <li>Photographs and profile images</li>
              <li>Biometric data (facial recognition - with explicit consent)</li>
              <li>Unit/Apartment number and building information</li>
              <li>FCM tokens for push notifications</li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>Financial & Payment Data</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
              <li>Bank account details (bank name, account number, account name)</li>
              <li>M-Pesa phone number</li>
              <li>Payout settings and percentage configurations</li>
              <li>Payment history and transaction records</li>
              <li>Rent amounts, deposits, and balances</li>
              <li>Platform fees and revenue split calculations</li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>Property & Security Data</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
              <li>Building name, code, and location (GPS coordinates)</li>
              <li>Unit details (number, floor, type, rent)</li>
              <li>Gate camera URLs and security configurations</li>
              <li>Security guard assignments</li>
              <li>Access logs and timestamps</li>
              <li>Visitor check-in/check-out photos</li>
              <li>Maintenance request photos and descriptions</li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>Automatically Collected Data</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
              <li>IP address and device information</li>
              <li>Browser type and operating system</li>
              <li>Usage data and interactions</li>
            </ul>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>Sensitive Data</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Biometric identifiers</li>
              <li>Financial account information</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Eye size={24} color={COLORS.primary} /> How We Use Your Data
            </h2>
            <p>We use your data for the following purposes:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li><strong>Service Delivery:</strong> Managing visitor registrations, deliveries, and access control</li>
              <li><strong>Financial Services:</strong> Processing payments, calculating revenue splits, managing payouts</li>
              <li><strong>Security:</strong> Monitoring and recording property access, tracking vehicles</li>
              <li><strong>Communication:</strong> Sending notifications, alerts, and updates via SMS and push notifications</li>
              <li><strong>Verification:</strong> Verifying identity of users and visitors</li>
              <li><strong>Maintenance:</strong> Managing maintenance requests and work orders</li>
              <li><strong>Payments:</strong> Tracking rent payments and financial transactions</li>
              <li><strong>Business Operations:</strong> Analyzing usage, improving services, developing new features</li>
              <li><strong>Legal Compliance:</strong> Meeting statutory and regulatory requirements</li>
              <li><strong>Protection of Rights:</strong> Enforcing our Terms and protecting our legal interests</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Lock size={24} color={COLORS.primary} /> Data Sharing & Disclosure
            </h2>
            
            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px' }}>We Do NOT Sell Your Data</h3>
            <p>Your personal data is never sold to third parties for marketing purposes.</p>

            <h3 style={{ color: '#F1F5F9', fontSize: '16px', marginBottom: '12px', marginTop: '16px' }}>When We Share Data</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li><strong>Property Management:</strong> With property admins for managing their properties</li>
              <li><strong>Service Providers:</strong> With IT, hosting, payment, and analytics providers</li>
              <li><strong>Financial Institutions:</strong> Banks and mobile money providers for payment processing</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</li>
              <li><strong>Emergency Services:</strong> To police, fire, or medical services when necessary</li>
              <li><strong>Business Transfer:</strong> In connection with any merger, sale, or transfer of our business</li>
              <li><strong>Legal Advisors:</strong> Our legal advisors and consultants</li>
            </ul>

            <div style={{ 
              background: '#EF444420', 
              border: '1px solid #EF444450', 
              borderRadius: '8px', 
              padding: '16px',
              marginTop: '16px'
            }}>
              <p style={{ margin: 0, color: '#F87171', fontSize: '14px' }}>
                <strong>Important:</strong> No system is perfectly secure. We cannot guarantee that your information will never be accessed, disclosed, or altered. You use our Platform at your own risk.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={24} color={COLORS.primary} /> Data Security
            </h2>
            <p>We implement industry-standard security measures:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>SSL/TLS encryption for data in transit</li>
              <li>Encryption for stored data</li>
              <li>Access controls and role-based permissions</li>
              <li>Regular security assessments</li>
            </ul>
            <div style={{ 
              background: '#F59E0B20', 
              border: '1px solid #F59E0B50', 
              borderRadius: '8px', 
              padding: '16px',
              marginTop: '16px'
            }}>
              <p style={{ margin: 0, color: '#FBBF24', fontSize: '14px' }}>
                <strong>Disclaimer:</strong> NO SECURITY MEASURE IS 100% EFFECTIVE. We cannot guarantee absolute security. Use of our Platform does not constitute a guarantee of security.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Database size={24} color={COLORS.primary} /> Data Retention
            </h2>
            <p>We retain your information for as long as necessary to:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>Provide our services</li>
              <li>Comply with legal obligations</li>
              <li>Protect our rights</li>
              <li>Conduct our business</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              <strong>We may retain your information indefinitely, even after account deletion.</strong> We are not obligated to delete your information at any time. Data may be retained for security, legal, or business purposes.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserCheck size={24} color={COLORS.primary} /> Your Rights
            </h2>
            <p>Under the Kenya Data Protection Act, 2019, subject to applicable law, you may have the right to:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (subject to our retention policies)</li>
              <li><strong>Restriction:</strong> Request limitation on processing</li>
              <li><strong>Portability:</strong> Request data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing</li>
              <li><strong>Withdrawal:</strong> Withdraw consent at any time</li>
              <li><strong>Complaint:</strong> Lodge a complaint with the Data Protection Commissioner</li>
            </ul>
            <div style={{ 
              background: '#6366F120', 
              border: '1px solid #6366F150', 
              borderRadius: '8px', 
              padding: '16px',
              marginTop: '16px'
            }}>
              <p style={{ margin: 0, color: '#A5B4FC', fontSize: '14px' }}>
                <strong>Note:</strong> We reserve the right to deny any request in our sole discretion. Your rights may be limited when required by law, needed for security investigations, or part of ongoing legal proceedings. We may charge fees for processing requests.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Cookie size={24} color={COLORS.primary} /> Cookies & Tracking
            </h2>
            <p>We use cookies to enhance your experience:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li><strong>Essential Cookies:</strong> Required for basic platform functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Advertising Cookies:</strong> For marketing purposes</li>
            </ul>
            <p style={{ marginTop: '12px' }}>You can manage cookies through your browser settings. Note that disabling cookies may affect functionality or prevent access to our Platform.</p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={24} color={COLORS.primary} /> Children's Privacy
            </h2>
            <p>
              Our services are not intended for children under 18. Property administrators may collect information about children for security purposes. Parents/guardians are responsible for monitoring children's use of the Platform.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>International Data Transfers</h2>
            <p>
              Data may be transferred to servers outside Kenya for processing. By using our Platform, you consent to such transfers. We are not responsible for data protection in other jurisdictions.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>Changes to This Policy</h2>
            <p>
              We may update this policy at any time without notice. Continued use after changes constitutes acceptance. We will notify users of material changes via email or platform notification.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>Complaints</h2>
            <p style={{ fontWeight: 600 }}>
              We encourage you to contact us first to resolve any concerns.
            </p>
            <div style={{ marginTop: '16px', paddingLeft: '20px' }}>
              <p style={{ fontWeight: 600, color: '#F1F5F9' }}>Office of the Data Protection Commissioner</p>
              <p>Email: info@odpc.go.ke</p>
              <p>Website: www.odpc.go.ke</p>
            </div>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F8FAFC', fontSize: '20px', marginBottom: '16px' }}>Contact Us</h2>
            <p>For any privacy-related inquiries:</p>
            <div style={{ marginTop: '12px', paddingLeft: '20px' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Mail size={16} color={COLORS.primary} /> secureboma@gmail.com
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color={COLORS.primary} /> Nairobi, Kenya
              </p>
            </div>
          </section>

          {/* Footer Note */}
          <div style={{
            borderTop: '1px solid #334155',
            paddingTop: '24px',
            marginTop: '32px',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: '14px'
          }}>
            <p>© 2026 BomaSecure. All rights reserved.</p>
            <p style={{ marginTop: '8px' }}>
              <Link to="/terms" style={{ color: COLORS.primary, textDecoration: 'none' }}>Terms and Conditions</Link>
              {' • '}
              <Link to="/privacy" style={{ color: COLORS.primary, textDecoration: 'none' }}>Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;