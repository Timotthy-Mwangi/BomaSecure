# BomaSecure Security Documentation

**Last Updated: April 2026**

## IMPORTANT DISCLAIMER

**BomaSecure provides security features as a management tool only. We do not guarantee that our Platform will prevent crime, unauthorized access, or security breaches. Users acknowledge that:**

- **No security system is 100% effective**
- **Users assume all risk associated with relying on our Platform for security**
- **We are not liable for any security incidents, data breaches, or losses**
- **Users are responsible for their own security practices beyond the Platform**

---

## Overview

This document outlines the security measures implemented in the BomaSecure application and provides guidance for production deployment.

## Implemented Security Features

### Backend Security

#### 1. HTTP Security Headers (Helmet)
- Content Security Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection
- Strict-Transport-Security (HSTS)
- X-Request-ID for request tracing

**Location:** [`backend/middleware/security.js`](backend/middleware/security.js)

#### 2. Rate Limiting
- **General:** 100 requests per 15 minutes per IP
- **Auth:** 10 requests per 15 minutes (prevents brute force)
- **Registration:** 5 accounts per hour per IP

**Location:** [`backend/middleware/security.js`](backend/middleware/security.js)

#### 3. Account Lockout Protection
- After 5 failed login attempts from same IP, block for 15 minutes
- Prevents brute force attacks

**Location:** [`backend/middleware/security.js`](backend/middleware/security.js)

#### 4. NoSQL Injection Prevention
- MongoDB input sanitization blocks operators starting with `$`
- Applied to request body, query params, and URL params

**Location:** [`backend/middleware/security.js`](backend/middleware/security.js)

#### 5. Security Audit Logging
- Logs login attempts (success/failed)
- Logs account lockouts
- Logs authentication errors
- Request ID tracking for traceability

**Location:** [`backend/middleware/security.js`](backend/middleware/security.js)

#### 6. CORS Configuration
- Strict origin validation in production
- Configurable allowed origins via `ALLOWED_ORIGINS` env variable
- Credential support

**Location:** [`backend/server.js`](backend/server.js)

#### 7. Input Validation & Sanitization
- XSS protection via `xss-clean`
- HTTP Parameter Pollution (HPP) protection
- Request body size limits (10KB for API, 50MB for uploads)
- Input length limits on all fields
- Request ID middleware for tracing

**Location:** [`backend/middleware/security.js`](backend/middleware/security.js)

#### 8. JWT Security
- **Production Requirement:** `JWT_SECRET` must be set
- Strong secret generation required
- Token expiration: 7 days (configurable)
- Role-based token validation
- Explicit algorithm specification (HS256) prevents algorithm confusion attacks

**Location:** [`backend/middleware/auth.js`](backend/middleware/auth.js)

#### 9. Password Security
- bcrypt hashing with salt rounds: 12
- Minimum 8 character password requirement
- Production: Requires uppercase, lowercase, and number
- Password validation on registration

**Location:** [`backend/controllers/authController.js`](backend/controllers/authController.js)

#### 10. WebSocket Security
- JWT authentication for socket connections
- User validation before connection
- CORS validation for socket origins

**Location:** [`backend/services/websocketService.js`](backend/services/websocketService.js)

### Frontend Security

#### 1. API Security
- Request timeout (30 seconds)
- Token stored in localStorage (configurable)
- Proper error handling with security-conscious messages

**Location:** [`frontend/src/services/api.js`](frontend/src/services/api.js)

---

## SECURITY LIMITATIONS

**Users acknowledge and accept the following limitations:**

1. **No Guarantee of Protection**: Our security features reduce but do not eliminate security risks
2. **User Conduct**: Security depends on users following best practices
3. **Third-Party Systems**: We are not liable for compromises through third-party systems
4. **Data Breaches**: We are not liable for data breaches regardless of cause
5. **Social Engineering**: We cannot prevent social engineering attacks
6. **Physical Security**: We are not responsible for physical security
7. **Zero-Day Vulnerabilities**: We may not detect or prevent attacks using unknown vulnerabilities
8. **Network Security**: We are not responsible for network security beyond our systems

**Use of our Platform does not constitute insurance or a guarantee of security.**

---

## Environment Variables

### Required for Production

```bash
# Server
NODE_ENV=production
PORT=5000

# Security - JWT (CRITICAL)
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRE=7d

# Security - Allowed Origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com

# Database
MONGODB_URI=mongodb://<host>:<port>/bomasecure
```

### Generate Secure JWT Secret

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Production Deployment Checklist

### Backend

1. **Set Environment Variables**
   - [ ] `NODE_ENV=production`
   - [ ] `JWT_SECRET` (generated secure key)
   - [ ] `ALLOWED_ORIGINS` (production domain)
   - [ ] `MONGODB_URI` (production database)

2. **Database Security**
   - [ ] Enable MongoDB authentication
   - [ ] Use SSL/TLS for database connections
   - [ ] Configure firewall rules

3. **HTTPS Configuration**
   - [ ] Install SSL certificate
   - [ ] Configure HTTPS in reverse proxy (Nginx)
   - [ ] Enable HSTS

4. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

### Frontend

1. **Build for Production**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Environment Configuration**
   - [ ] Set `REACT_APP_API_URL` to production API
   - [ ] Set `REACT_APP_SOCKET_URL` to production socket server
   - [ ] Set `REACT_APP_NODE_ENV=production`

### Nginx Configuration (Recommended)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        root /path/to/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Security Monitoring

### Recommended Tools

1. **Helmet.js** - Already integrated
2. **express-rate-limit** - Already integrated
3. **morgan** - Request logging
4. **mongo-sanitize** - Additional MongoDB injection prevention
5. **snyk** - Dependency vulnerability scanning
6. **Additional Measures**: Consider intrusion detection systems, video monitoring, on-site security

### Logging Considerations

- Log failed authentication attempts
- Monitor rate limit violations
- Track unusual API access patterns
- Review logs regularly

---

## API Security Endpoints

| Endpoint | Method | Rate Limit | Auth Required |
|----------|--------|------------|---------------|
| `/api/auth/login` | POST | 10/15min | No |
| `/api/auth/register` | POST | 5/hour | No |
| `/api/auth/*` | * | 10/15min | Yes |
| `/api/visitors/*` | * | 100/15min | Yes |
| `/api/deliveries/*` | * | 100/15min | Yes |
| `/api/health` | GET | None | No |

---

## USER SECURITY RESPONSIBILITIES

**Users (particularly Admin users) are responsible for:**

1. **Physical Security**: Ensuring proper physical security measures beyond the Platform
2. **Access Control**: Properly managing user access and credentials
3. **Monitoring**: Regularly reviewing logs and alerts
4. **Reporting**: Promptly reporting security incidents
5. **Compliance**: Complying with all applicable security laws and regulations
6. **Insurance**: Obtaining appropriate insurance coverage
7. **Training**: Properly training all users on security practices

**We are not liable for any security failures attributable to user conduct or inactions.**

---

## Troubleshooting

### Common Issues

1. **CORS Errors in Production**
   - Verify `ALLOWED_ORIGINS` is set correctly
   - Check for trailing commas

2. **JWT Token Expiration**
   - Tokens expire after 7 days by default
   - Users must re-login after expiration

3. **Rate Limiting**
   - If legitimate requests are blocked, adjust limits in [`backend/middleware/security.js`](backend/middleware/security.js)

---

## Security Headers Reference

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | Custom | Prevents XSS attacks |
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-XSS-Protection | 1; mode=block | XSS filtering |
| Strict-Transport-Security | max-age=31536000 | Enforces HTTPS |
| X-Request-ID | UUID | Request traceability |

---

## Audit Log Events

| Event | Description |
|-------|-------------|
| LOGIN_SUCCESS | Successful login |
| LOGIN_FAILED | Failed login attempt |
| LOGIN_BLOCKED | Login blocked due to account lockout |
| ACCOUNT_LOCKOUT | Account locked after failed attempts |
| AUTH_ERROR | Authentication-related error |

---

## LIMITATION OF LIABILITY

**To the maximum extent permitted by law:**

- We are not liable for any security breaches
- We are not liable for any data loss or theft
- We are not liable for any resulting damages
- Users assume all security risks

**This limitation applies regardless of the theory of liability.**

---

*Last Updated: April 2026*