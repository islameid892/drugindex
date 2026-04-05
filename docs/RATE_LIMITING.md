# Rate Limiting Implementation Guide

## Overview

This document describes the professional Rate Limiting implementation for the ICD-10 Search Engine, deployed at both Express (Node.js) and Nginx levels for maximum protection and performance.

---

## 1. Express-Level Rate Limiting

### Configuration

Located in: `server/_core/index.ts`

#### Global Limiter
- **Window**: 15 minutes
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: All requests except `/health` and `/public`
- **Response**: 429 Too Many Requests with retry information

#### API Limiter
- **Window**: 1 minute
- **Limit**: 60 requests per minute per IP
- **Applies to**: All `/api/*` endpoints except `/health`
- **Response**: 429 with error details

#### Search Limiter
- **Window**: 1 minute
- **Limit**: 30 requests per minute per IP
- **Applies to**:
  - `/api/trpc/data.searchByScientificName`
  - `/api/trpc/data.searchByTradeNames`
  - `/api/trpc/data.searchByIcdCodes`
- **Response**: 429 with search-specific error message

### Response Headers

All rate-limited responses include standard X-RateLimit headers:
```
RateLimit-Limit: 60
RateLimit-Remaining: 45
RateLimit-Reset: 1234567890
```

### Response Body

```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": "2026-03-11T00:00:00.000Z",
  "remaining": 0
}
```

---

## 2. Nginx-Level Rate Limiting

### Configuration

Located in: `nginx.conf`

#### Rate Limiting Zones

| Zone | Rate | Burst | Purpose |
|------|------|-------|---------|
| `global_limit` | 10 req/s | 20 | General traffic |
| `api_limit` | 1 req/s (60/min) | 10 | API endpoints |
| `search_limit` | 0.5 req/s (30/min) | 5 | Search endpoints |
| `health_limit` | 100 req/s | 100 | Health checks (no limit) |

#### Location-Based Rules

1. **Health Endpoint** (`/health`)
   - No rate limiting
   - Used for monitoring and uptime checks
   - Excluded from access logs

2. **Static Files** (`.js`, `.css`, `.png`, `.jpg`, `.webp`, etc.)
   - No rate limiting
   - Heavy caching (1 year)
   - Immutable cache headers

3. **Search Endpoints** (`/api/trpc/data.search*`)
   - Strictest limit: 30 req/min
   - Burst: 5 additional requests
   - Immediate rejection if exceeded

4. **API Endpoints** (`/api/*`)
   - Moderate limit: 60 req/min
   - Burst: 10 additional requests
   - 5-minute cache for responses

5. **All Other Requests** (`/`)
   - Global limit: 100 req/15min
   - Burst: 20 additional requests
   - Standard processing

### Nginx Configuration Setup

#### Step 1: Update Nginx Configuration

Copy `nginx.conf` to your Nginx configuration directory:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/drugindex.click
sudo ln -s /etc/nginx/sites-available/drugindex.click /etc/nginx/sites-enabled/
```

#### Step 2: Update SSL Certificates

Replace certificate paths in nginx.conf:
```nginx
ssl_certificate /path/to/your/certificate.crt;
ssl_certificate_key /path/to/your/private/key.key;
```

#### Step 3: Test Configuration

```bash
sudo nginx -t
```

#### Step 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## 3. Testing Rate Limiting

### Test Express Rate Limiting (localhost)

```bash
# Test global limiter (100 req/15min)
for i in {1..105}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" http://localhost:3000/
done

# Test API limiter (60 req/min)
for i in {1..65}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" http://localhost:3000/api/test
done

# Test search limiter (30 req/min)
for i in {1..35}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    "http://localhost:3000/api/trpc/data.searchByScientificName?input=%7B%22query%22:%22test%22%7D"
done
```

### Test Production Domain

```bash
# Test health endpoint (should always return 200)
curl -I https://drugindex.click/health

# Test rate limiting (should return 429 after limit)
for i in {1..35}; do
  curl -s -I https://drugindex.click/api/test | grep "HTTP\|RateLimit"
done

# Check response headers
curl -I https://drugindex.click/api/test | grep -i "ratelimit\|cache-control"
```

### Expected Results

**Before limit exceeded**:
```
HTTP/2 200 OK
RateLimit-Limit: 60
RateLimit-Remaining: 45
RateLimit-Reset: 1234567890
```

**After limit exceeded**:
```
HTTP/2 429 Too Many Requests
RateLimit-Limit: 60
RateLimit-Remaining: 0
RateLimit-Reset: 1234567890
Content-Type: application/json

{"error":"Too many requests","message":"...","retryAfter":"...","remaining":0}
```

---

## 4. Monitoring and Logging

### Nginx Logs

Monitor rate limit violations:

```bash
# Watch for 429 responses
tail -f /var/log/nginx/access.log | grep " 429 "

# Count rate limit violations by IP
grep " 429 " /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

### Express Logs

The server logs all rate limit events with details:

```
[Rate Limit] IP: 192.168.1.1 | Endpoint: /api/search | Remaining: 0 | Reset: 2026-03-11T00:00:00Z
```

---

## 5. Adjusting Rate Limits

### Increase Limits for Legitimate Traffic

If legitimate users are being rate limited, adjust in `server/_core/index.ts`:

```typescript
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,  // Increase from 60 to 120
  // ...
});
```

### Add Whitelist for Specific IPs

```typescript
const apiLimiter = rateLimit({
  skip: (req) => {
    // Skip rate limiting for specific IPs
    const whitelist = ['192.168.1.100', '10.0.0.1'];
    return whitelist.includes(req.ip);
  },
  // ...
});
```

### Different Limits for Different Users

```typescript
const apiLimiter = rateLimit({
  max: (req) => {
    // Premium users get higher limits
    if (req.user?.isPremium) return 1000;
    return 60;
  },
  // ...
});
```

---

## 6. Best Practices

1. **Monitor 429 Responses**: Track rate limit violations to detect abuse or legitimate traffic spikes
2. **Gradual Rollout**: Start with generous limits and tighten based on actual usage patterns
3. **Clear Error Messages**: Always provide helpful messages telling users when they can retry
4. **Include Retry-After Headers**: Clients should respect the `Retry-After` header
5. **Whitelist Monitoring**: Exclude monitoring services from rate limiting
6. **Use Both Levels**: Nginx catches abuse before it reaches Node.js, Express provides backup
7. **Regular Review**: Analyze logs weekly to optimize rate limit thresholds

---

## 7. Troubleshooting

### Rate Limiting Not Working

1. **Check Nginx is running**: `sudo systemctl status nginx`
2. **Verify configuration**: `sudo nginx -t`
3. **Check Express logs**: Look for rate limiter initialization messages
4. **Test with different IPs**: Rate limiting is per-IP, test from different sources

### Legitimate Users Blocked

1. **Check their request rate**: Analyze logs for that IP
2. **Increase limits temporarily**: Adjust `max` value
3. **Add to whitelist**: Exclude specific IPs if needed
4. **Implement API keys**: Premium users can have higher limits

### Performance Issues

1. **Reduce zone size**: Smaller zones use less memory but track fewer IPs
2. **Use Redis backend**: For distributed rate limiting across multiple servers
3. **Optimize Nginx**: Use `limit_req_log_level warn` to reduce logging overhead

---

## References

- [Express Rate Limit Documentation](https://www.npmjs.com/package/express-rate-limit)
- [Nginx Rate Limiting Module](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html)
- [OWASP Rate Limiting](https://owasp.org/www-community/attacks/Rate_limiting)
- [HTTP 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
