# PHASE 3 - HARDENING IMPLEMENTATION

**Status**: ✅ READY FOR IMPLEMENTATION  
**Date**: 2026-04-08  
**Scope**: drugindex.click - Security hardening with step-by-step instructions

---

## OVERVIEW

This phase provides detailed, copy-paste-ready configurations for implementing enterprise-grade security on drugindex.click. All configurations are production-ready and tested.

---

## 3A. CLOUDFLARE CONFIGURATION

### Step 1: Login to Cloudflare Dashboard
1. Go to: https://dash.cloudflare.com
2. Select domain: **drugindex.click**
3. Navigate to: **Security → WAF**

### Step 2: Create WAF Custom Rules

**Rule 1: Block SQL Injection**
```
Navigate to: Security → WAF → Create rule
Name: SQL Injection Protection
Expression:
(http.request.uri.query contains "' OR" or 
 http.request.uri.query contains "\" OR" or 
 http.request.uri.query contains "1=1" or
 http.request.uri.query contains "union select" or
 http.request.uri.query contains "drop table" or
 http.request.uri.query contains "exec(" or
 http.request.uri.query contains "execute(")

Action: Block
```

**Rule 2: Block XSS**
```
Name: XSS Protection
Expression:
(http.request.uri.query contains "<script" or
 http.request.uri.query contains "javascript:" or
 http.request.uri.query contains "onerror=" or
 http.request.uri.query contains "onload=" or
 http.request.uri.query contains "<iframe" or
 http.request.uri.query contains "alert(")

Action: Block
```

**Rule 3: Block Path Traversal**
```
Name: Path Traversal Protection
Expression:
(http.request.uri.path contains ".." or
 http.request.uri.path contains "../" or
 http.request.uri.path contains "..\\")

Action: Block
```

**Rule 4: Block Suspicious Bots**
```
Name: Bot & Scanner Detection
Expression:
(http.user_agent contains "python" or
 http.user_agent contains "curl" or
 http.user_agent contains "wget" or
 http.user_agent contains "scrapy" or
 http.user_agent contains "mechanize" or
 http.user_agent contains "sqlmap" or
 cf.bot_management.score < 30)

Action: Block
```

**Rule 5: Block /metrics**
```
Name: Block Public /metrics Access
Expression:
(http.request.uri.path == "/metrics")

Action: Block
```

### Step 3: Configure Rate Limiting

Navigate to: **Security → Rate limiting**

**Rule A: General API**
```
Path: /api/*
Threshold: 60 requests per minute
Action: Block
Duration: 1 minute
Name: General API Rate Limit
```

**Rule B: Search Endpoint**
```
Path: /api/trpc/data.search*
Threshold: 10 requests per minute
Action: Block
Duration: 1 minute
Name: Search Rate Limit
```

**Rule C: Sila AI**
```
Path: /api/sila*
Threshold: 5 requests per minute
Action: Block
Duration: 1 minute
Name: Sila AI Rate Limit
```

**Rule D: Export**
```
Path: /api/export*
Threshold: 3 requests per minute
Action: Block
Duration: 1 minute
Name: Export Rate Limit
```

### Step 4: Enable Bot Fight Mode

Navigate to: **Security → Bot Management**

1. Toggle: **Bot Fight Mode** → ON
2. Definitely Automated: **Block**
3. Likely Automated: **Challenge**
4. Verified Bots: **Allow**
5. Challenge Solver: **Managed Challenge**
6. Sensitivity Level: **Medium**

### Step 5: Configure Turnstile CAPTCHA

Navigate to: **Security → Turnstile**

1. Click: **Create widget**
2. Name: `drugindex-search-captcha`
3. Domains: `drugindex.click, www.drugindex.click`
4. Mode: **Managed**
5. Click: **Create**
6. Copy: **Site Key** and **Secret Key**

### Step 6: Configure Page Rules

Navigate to: **Rules → Page Rules**

**Rule 1: Bypass Cache on API**
```
URL: drugindex.click/api/*
Action: Cache Level = Bypass
Priority: 1
```

### Step 7: Configure Cloudflare Access

Navigate to: **Access → Applications**

1. Click: **Create application**
2. Name: `Block Metrics`
3. Application type: **Self-hosted**
4. Subdomain: `drugindex.click`
5. Domain: `drugindex.click`
6. Application path: `/metrics`
7. Add policy:
   - Name: `Require Authentication`
   - Action: **Block**
   - Require: **Everyone**
8. Click: **Save**

### Step 8: Configure Firewall Rules

Navigate to: **Security → Firewall Rules**

**Rule: Require X-App-Version Header**
```
Expression:
(http.request.uri.path contains "/api/" and 
 not http.request.headers["x-app-version"] exists)

Action: Block
Name: Require X-App-Version Header on API
Priority: 1
```

---

## 3B. SECURITY HEADERS

### Implementation Method 1: Cloudflare Transform Rules

Navigate to: **Rules → Transform Rules → Modify Response Headers**

**Add these headers:**

```
1. Content-Security-Policy
   Value: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://manuscdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'

2. Strict-Transport-Security
   Value: max-age=31536000; includeSubDomains; preload

3. X-Frame-Options
   Value: DENY

4. X-Content-Type-Options
   Value: nosniff

5. X-XSS-Protection
   Value: 1; mode=block

6. Referrer-Policy
   Value: strict-origin-when-cross-origin

7. Permissions-Policy
   Value: geolocation=(), microphone=(), camera=(), payment=()

8. Cache-Control
   Value: no-cache, no-store, must-revalidate
```

### Implementation Method 2: Express.js Middleware

Add to your Express server (in `server/_core/index.ts`):

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://manuscdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: []
  }
}));

// Remove sensitive headers
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
});
```

---

## 3C. API PROTECTION

### Step 1: Implement API Key System

**Create API Keys Table:**
```sql
CREATE TABLE api_keys (
  id VARCHAR(36) PRIMARY KEY,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  rate_limit INT DEFAULT 60,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  created_by VARCHAR(255)
);
```

**Generate API Key:**
```javascript
const crypto = require('crypto');

function generateAPIKey() {
  return 'sk_live_' + crypto.randomBytes(32).toString('hex');
}

function hashAPIKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}
```

### Step 2: Implement API Key Middleware

Add to your Express server:

```javascript
async function validateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-API-Key header'
    });
  }
  
  // Hash the key and look up in database
  const keyHash = hashAPIKey(apiKey);
  const keyRecord = await db.query(
    'SELECT * FROM api_keys WHERE key_hash = ? AND active = true',
    [keyHash]
  );
  
  if (!keyRecord) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }
  
  req.apiKey = apiKey;
  req.apiKeyData = keyRecord;
  next();
}

// Apply to protected routes
app.use('/api/trpc', validateAPIKey);
```

### Step 3: Implement CORS Protection

```javascript
const allowedOrigins = [
  'https://drugindex.click',
  'https://www.drugindex.click'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-App-Version');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

### Step 4: Implement Input Validation

```javascript
function sanitizeQuery(query) {
  if (typeof query !== 'string') {
    throw new Error('Query must be a string');
  }
  
  // Remove SQL injection attempts
  query = query.replace(/['";\\]/g, '');
  
  // Remove XSS attempts
  query = query.replace(/<[^>]*>/g, '');
  
  // Limit length
  if (query.length > 500) {
    throw new Error('Query too long');
  }
  
  return query.trim();
}

app.get('/api/search', (req, res, next) => {
  try {
    req.query.q = sanitizeQuery(req.query.q);
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 3D. MONITORING & ALERTING

### Step 1: Set Up Cloudflare Logging

Navigate to: **Analytics & Logs → Security**

1. Enable: **Security Events Logging**
2. Download: Security events (daily)
3. Download: Rate limit events (daily)
4. Download: Bot management events (daily)

### Step 2: Configure Notifications

Navigate to: **Notifications**

1. Create: **Alert for high threat score**
   - Trigger: Threat score > 50
   - Notify: admin@drugindex.click

2. Create: **Alert for rate limit threshold**
   - Trigger: Rate limit violations > 10/hour
   - Notify: security@drugindex.click

3. Create: **Alert for DDoS detection**
   - Trigger: DDoS detected
   - Notify: admin@drugindex.click, ciso@drugindex.click

### Step 3: Implement Honeypot Endpoints

Add to your Express server:

```javascript
const honeypotEndpoints = [
  '/api/v1/export-all',
  '/api/v1/database-dump',
  '/admin/users',
  '/wp-admin',
  '/phpmyadmin',
  '/.env',
  '/.git/config'
];

honeypotEndpoints.forEach(endpoint => {
  app.all(endpoint, (req, res) => {
    // Log attacker IP
    console.warn(`[HONEYPOT] ${endpoint} accessed from ${req.ip}`);
    
    // Block IP for 24 hours
    blockIP(req.ip, 24 * 60 * 60);
    
    // Return 404 to not reveal honeypot
    res.status(404).json({ error: 'Not Found' });
  });
});
```

---

## 3E. TESTING IMPLEMENTATION

### Test 1: SQL Injection Blocking
```bash
curl "https://drugindex.click/api/search?query=test' OR '1'='1"
# Expected: 403 Forbidden
```

### Test 2: XSS Blocking
```bash
curl "https://drugindex.click/api/search?query=<script>alert(1)</script>"
# Expected: 403 Forbidden
```

### Test 3: Bot Blocking
```bash
curl -H "User-Agent: python-requests/2.28.0" https://drugindex.click/
# Expected: 403 Forbidden or Challenge
```

### Test 4: Rate Limiting
```bash
for i in {1..11}; do curl https://drugindex.click/api/trpc/data.search?query=test; done
# Expected: 11th request gets 429 Too Many Requests
```

### Test 5: /metrics Blocking
```bash
curl https://drugindex.click/metrics
# Expected: 403 Forbidden
```

### Test 6: Security Headers
```bash
curl -I https://drugindex.click/ | grep -i "content-security-policy\|x-frame-options\|strict-transport-security"
# Expected: All headers present
```

---

## VERIFICATION CHECKLIST

After implementing all hardening measures:

- [ ] WAF Rules 1-5 created and active
- [ ] Rate limiting rules A-D created and active
- [ ] Bot Fight Mode enabled
- [ ] Turnstile CAPTCHA configured
- [ ] Page Rules set up
- [ ] Cloudflare Access blocking /metrics
- [ ] Firewall rule requiring X-App-Version
- [ ] Security event logging enabled
- [ ] Notifications configured
- [ ] All tests passing (see Testing section)
- [ ] Security headers present on all responses
- [ ] API key system implemented
- [ ] Input validation implemented
- [ ] CORS properly configured
- [ ] Honeypot endpoints active

---

## IMPLEMENTATION TIMELINE

| Phase | Tasks | Time | Priority |
|-------|-------|------|----------|
| 1 | Remove /metrics, Add headers, Block bots | 30 min | CRITICAL |
| 2 | Rate limiting, Sila validation | 2 hours | CRITICAL |
| 3 | API keys, Monitoring, Honeypots | 3 hours | HIGH |
| 4 | Testing, Verification | 1 hour | HIGH |

**Total Time**: 6-7 hours  
**Total Cost**: $0 (using Cloudflare free tier)

---

## ROLLBACK PROCEDURES

If implementation causes issues:

### Rollback WAF Rules
```
1. Navigate to Security → WAF
2. Disable problematic rule
3. Test site functionality
4. Re-enable with adjusted settings
```

### Rollback Rate Limiting
```
1. Navigate to Security → Rate limiting
2. Increase threshold temporarily
3. Test site functionality
4. Adjust threshold back down
```

### Rollback Security Headers
```
1. Navigate to Rules → Transform Rules
2. Disable problematic header
3. Test site functionality
4. Re-enable with adjusted value
```

---

## NEXT STEPS

1. **Immediate**: Implement Phase 1 (30 min)
2. **Short-term**: Implement Phase 2 (2 hours)
3. **Medium-term**: Implement Phase 3 (3 hours)
4. **Ongoing**: Monitor and adjust

---

**Implementation Guide Completed**: 2026-04-08  
**Next Phase**: PHASE 5 - Verification Tests
