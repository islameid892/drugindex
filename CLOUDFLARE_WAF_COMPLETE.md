# Cloudflare WAF Rules - Complete Implementation Guide

**Website**: https://drugindex.click  
**Status**: Ready for deployment  
**Last Updated**: 2026-04-08

---

## STEP 1: CLOUDFLARE RATE LIMITING RULES

### Dashboard Path
```
Cloudflare Dashboard → Security → WAF → Rate Limiting Rules
```

---

### Rule 1.1: Block /metrics Endpoint

**Name**: Block /metrics Completely

**Expression**:
```
(http.request.uri.path eq "/metrics")
```

**Action**: Block  
**Duration**: Permanent  
**Priority**: 1 (Highest)

**Steps**:
1. Go to Cloudflare Dashboard → Security → WAF → Rate Limiting Rules
2. Click "Create rule"
3. Name: "Block /metrics Completely"
4. Paste expression above
5. Action: Block
6. Save

---

### Rule 1.2: General Rate Limiting

**Name**: Rate Limit General Traffic

**Expression**:
```
(http.request.uri.path matches "^/")
```

**Rate**: 60 requests per 60 seconds per IP  
**Action**: Block  
**Block Duration**: 60 seconds  
**Priority**: 10

**Steps**:
1. Click "Create rule"
2. Name: "Rate Limit General Traffic"
3. Paste expression above
4. Set rate to: 60 requests per 60 seconds
5. Action: Block for 60 seconds
6. Save

---

### Rule 1.3: Search Endpoints Rate Limiting

**Name**: Rate Limit Search Endpoints

**Expression**:
```
(http.request.uri.path contains "/drug-lens") or (http.request.uri.path contains "/search") or (http.request.uri.path contains "/api/trpc/data.search")
```

**Rate**: 10 requests per 60 seconds per IP  
**Action**: Block  
**Block Duration**: 600 seconds (10 minutes)  
**Priority**: 5

**Steps**:
1. Click "Create rule"
2. Name: "Rate Limit Search Endpoints"
3. Paste expression above
4. Set rate to: 10 requests per 60 seconds
5. Action: Block for 600 seconds
6. Save

---

### Rule 1.4: Sila AI Chat Rate Limiting

**Name**: Rate Limit Sila AI Chat

**Expression**:
```
(http.request.uri.path contains "/api/chat") or (http.request.uri.path contains "/sila") or (http.request.uri.path contains "/ai") or (http.request.uri.path contains "/api/trpc/sila")
```

**Rate**: 5 requests per 60 seconds per IP  
**Action**: Block  
**Block Duration**: 900 seconds (15 minutes)  
**Priority**: 3

**Steps**:
1. Click "Create rule"
2. Name: "Rate Limit Sila AI Chat"
3. Paste expression above
4. Set rate to: 5 requests per 60 seconds
5. Action: Block for 900 seconds
6. Save

---

## STEP 2: CLOUDFLARE WAF RULES (Custom Rules)

### Dashboard Path
```
Cloudflare Dashboard → Security → WAF → Custom Rules
```

---

### Rule 2.1: Block Bad User Agents (Scanners/Bots)

**Name**: Block Malicious User Agents

**Expression**:
```
(http.user_agent matches "(?i)(sqlmap|nikto|nmap|masscan|zgrab|nuclei|dirbuster|gobuster|wfuzz|hydra|scrapy|python-requests|curl|wget|Wget|Curl)")
```

**Action**: Block  
**Priority**: 1

**Steps**:
1. Go to Cloudflare Dashboard → Security → WAF → Custom Rules
2. Click "Create rule"
3. Name: "Block Malicious User Agents"
4. Paste expression above
5. Action: Block
6. Save

---

### Rule 2.2: Block SQLi and XSS Attempts

**Name**: Block SQLi and XSS Attacks

**Expression**:
```
(http.request.uri.query matches "(?i)(union\\s+select|<script|exec\\s*\\(|drop\\s+table|\\.\\.[\\/\\\\]|onerror=|javascript:|alert\\(|eval\\()")
```

**Action**: Block  
**Priority**: 2

**Steps**:
1. Click "Create rule"
2. Name: "Block SQLi and XSS Attacks"
3. Paste expression above
4. Action: Block
5. Save

---

### Rule 2.3: Block Prompt Injection Attempts

**Name**: Block Prompt Injection on AI Endpoints

**Expression**:
```
(http.request.uri.path contains "/sila" or http.request.uri.path contains "/ai" or http.request.uri.path contains "/chat") and (http.request.body.string matches "(?i)(ignore.{0,20}(previous|all).{0,20}instructions|system prompt|reveal your|what is your api key|list all.{0,20}(drugs|records|data).{0,20}json)")
```

**Action**: Block  
**Priority**: 3

**Steps**:
1. Click "Create rule"
2. Name: "Block Prompt Injection on AI Endpoints"
3. Paste expression above
4. Action: Block
5. Save

---

### Rule 2.4: Block Honeypot Paths (Auto-ban)

**Name**: Block Honeypot Paths and Auto-ban

**Expression**:
```
(http.request.uri.path in {"/wp-admin" "/wp-login.php" "/phpmyadmin" "/.env" "/.git/config" "/actuator" "/api/v0/users" "/config.php" "/backup" "/admin" "/.htaccess"})
```

**Action**: Block  
**Priority**: 4

**Additional Action**: Enable "Challenge the visitor's IP for 24 hours"

**Steps**:
1. Click "Create rule"
2. Name: "Block Honeypot Paths and Auto-ban"
3. Paste expression above
4. Action: Block
5. Enable "Also challenge the visitor's IP for 24 hours"
6. Save

---

## STEP 3: CLOUDFLARE TRANSFORM RULES (Security Headers)

### Dashboard Path
```
Cloudflare Dashboard → Rules → Transform Rules → Modify Response Headers
```

---

### Add Security Headers

**Steps**:
1. Go to Cloudflare Dashboard → Rules → Transform Rules
2. Click "Create rule" under "Modify Response Headers"
3. For each header below, create a new rule:

---

#### Header 1: X-Frame-Options

**Name**: Add X-Frame-Options Header

**Expression**:
```
true
```

**Header Operation**: Add  
**Header Name**: `X-Frame-Options`  
**Header Value**: `DENY`

---

#### Header 2: X-Content-Type-Options

**Name**: Add X-Content-Type-Options Header

**Expression**:
```
true
```

**Header Operation**: Add  
**Header Name**: `X-Content-Type-Options`  
**Header Value**: `nosniff`

---

#### Header 3: Referrer-Policy

**Name**: Add Referrer-Policy Header

**Expression**:
```
true
```

**Header Operation**: Add  
**Header Name**: `Referrer-Policy`  
**Header Value**: `strict-origin-when-cross-origin`

---

#### Header 4: Permissions-Policy

**Name**: Add Permissions-Policy Header

**Expression**:
```
true
```

**Header Operation**: Add  
**Header Name**: `Permissions-Policy`  
**Header Value**: `geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=()`

---

#### Header 5: Strict-Transport-Security

**Name**: Add HSTS Header

**Expression**:
```
true
```

**Header Operation**: Add  
**Header Name**: `Strict-Transport-Security`  
**Header Value**: `max-age=31536000; includeSubDomains; preload`

---

#### Header 6: X-XSS-Protection

**Name**: Add X-XSS-Protection Header

**Expression**:
```
true
```

**Header Operation**: Add  
**Header Name**: `X-XSS-Protection`  
**Header Value**: `1; mode=block`

---

#### Header 7: Content-Security-Policy

**Name**: Add CSP Header

**Expression**:
```
true
```

**Header Operation**: Add  
**Header Name**: `Content-Security-Policy`  
**Header Value**:
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://files.manuscdn.com https://d2xsxph8kpxj0f.cloudfront.net; style-src 'self' 'unsafe-inline' https://files.manuscdn.com; img-src 'self' data: blob: https://files.manuscdn.com https://d2xsxph8kpxj0f.cloudfront.net; font-src 'self' https://files.manuscdn.com; connect-src 'self' https://files.manuscdn.com https://d2xsxph8kpxj0f.cloudfront.net https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;
```

---

#### Header 8: Remove X-Powered-By

**Name**: Remove X-Powered-By Header

**Expression**:
```
true
```

**Header Operation**: Remove  
**Header Name**: `X-Powered-By`

---

#### Header 9: Remove Server Header

**Name**: Remove Server Header

**Expression**:
```
true
```

**Header Operation**: Remove  
**Header Name**: `Server`

---

## STEP 4: BOT FIGHT MODE

### Dashboard Path
```
Cloudflare Dashboard → Security → Bots → Bot Fight Mode
```

**Steps**:
1. Go to Cloudflare Dashboard → Security → Bots
2. Find "Bot Fight Mode"
3. Toggle to **ON**
4. Settings:
   - **Definitely automated**: Block
   - **Likely automated**: Challenge (Turnstile)
   - **Verified bots**: Allow (Google, Bing, etc.)
5. Save

---

## STEP 5: CLOUDFLARE TURNSTILE (CAPTCHA)

### Dashboard Path
```
Cloudflare Dashboard → Turnstile
```

**Steps**:
1. Go to Cloudflare Dashboard → Turnstile
2. Click "Create Site"
3. **Domain**: drugindex.click
4. **Widget type**: Invisible (Non-Interactive)
5. Copy the **Site Key** and **Secret Key**
6. Save

**Implementation** (see separate document for frontend code)

---

## VERIFICATION CHECKLIST

After deploying all rules, verify:

- [ ] /metrics returns 403 (blocked)
- [ ] Rapid requests (>60/min) return 429 (rate limited)
- [ ] Search requests (>10/min) return 429 (rate limited)
- [ ] AI requests (>5/min) return 429 (rate limited)
- [ ] Python/curl user agents return 403 (blocked)
- [ ] SQL injection attempts return 403 (blocked)
- [ ] Honeypot paths return 403 (blocked)
- [ ] Security headers present in all responses
- [ ] CSP header properly configured
- [ ] Bot Fight Mode active

---

## TESTING COMMANDS

```bash
# Test /metrics blocking
curl -I https://drugindex.click/metrics

# Test rate limiting (should fail after 60 requests)
for i in {1..70}; do curl -s -o /dev/null -w "Request $i: %{http_code}\n" https://drugindex.click/; done

# Test search rate limiting (should fail after 10 requests)
for i in {1..15}; do curl -s -o /dev/null -w "Request $i: %{http_code}\n" https://drugindex.click/drug-lens?query=test; done

# Test AI rate limiting (should fail after 5 requests)
for i in {1..10}; do curl -s -o /dev/null -w "Request $i: %{http_code}\n" https://drugindex.click/api/trpc/sila.chat; done

# Test bot blocking
curl -I -A "python-requests/2.28.0" https://drugindex.click/

# Test SQLi blocking
curl -I "https://drugindex.click/?q=1' UNION SELECT * FROM users--"
```

---

## PRIORITY ORDER FOR DEPLOYMENT

1. **CRITICAL** (Deploy first):
   - Rule 1.1: Block /metrics
   - Rule 2.1: Block malicious user agents
   - Rule 2.4: Block honeypot paths

2. **HIGH** (Deploy within 1 hour):
   - Rule 1.2: General rate limiting
   - Rule 1.3: Search rate limiting
   - Rule 1.4: AI rate limiting
   - Rule 2.2: Block SQLi/XSS
   - Rule 2.3: Block prompt injection

3. **MEDIUM** (Deploy within 24 hours):
   - All security headers
   - Bot Fight Mode
   - Turnstile CAPTCHA

---

## SUPPORT

If you encounter issues:
1. Check Cloudflare Analytics to see which rules are triggering
2. Whitelist legitimate traffic if needed
3. Adjust rate limits based on actual usage patterns
4. Contact Cloudflare support for advanced configurations

---

**Status**: ✅ Ready for Production  
**Last Updated**: 2026-04-08  
**Version**: 1.0
