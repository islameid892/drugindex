# Cloudflare Turnstile Implementation Guide

**Website**: https://drugindex.click  
**Widget Type**: Invisible (Non-Interactive)  
**Trigger**: After 5 searches in 2 minutes

---

## STEP 1: SETUP TURNSTILE IN CLOUDFLARE

### Dashboard Path
```
Cloudflare Dashboard → Turnstile
```

### Steps

1. **Login to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select your account

2. **Navigate to Turnstile**
   - Left sidebar → Turnstile

3. **Create New Site**
   - Click "Create Site"
   - **Domain**: drugindex.click
   - **Widget type**: Invisible (Non-Interactive)
   - Click "Create"

4. **Copy Keys**
   - **Site Key**: `1x00000000000000000000AA` (example)
   - **Secret Key**: `1x0000000000000000000000000000000AA` (example)
   - Save these keys securely

---

## STEP 2: ADD TURNSTILE TO FRONTEND

### Location 1: Search Box (SearchBar.tsx)

**File**: `client/src/components/SearchBar.tsx`

**Add imports**:
```typescript
import { useEffect, useRef } from 'react';

// Add at top of file
declare global {
  interface Window {
    turnstile: any;
  }
}
```

**Add state**:
```typescript
const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
const [showTurnstile, setShowTurnstile] = useState(false);
const [searchCount, setSearchCount] = useState(0);
const turnstileContainerRef = useRef<HTMLDivElement>(null);
```

**Add Turnstile script to index.html**:
```html
<!-- In client/index.html, add before closing </head> tag -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

**Add Turnstile initialization**:
```typescript
useEffect(() => {
  if (showTurnstile && turnstileContainerRef.current && window.turnstile) {
    window.turnstile.render('#turnstile-container', {
      sitekey: '1x00000000000000000000AA', // Replace with your site key
      theme: 'light',
      callback: (token: string) => {
        setTurnstileToken(token);
      },
    });
  }
}, [showTurnstile]);
```

**Modify search handler**:
```typescript
const handleSearch = async (query: string) => {
  // Increment search count
  setSearchCount(prev => prev + 1);
  
  // Show Turnstile after 5 searches
  if (searchCount >= 5 && !turnstileToken) {
    setShowTurnstile(true);
    return; // Don't proceed until CAPTCHA is solved
  }
  
  // If Turnstile is required but not solved, don't search
  if (searchCount >= 5 && !turnstileToken) {
    return;
  }
  
  // Proceed with search
  onChange(query);
  
  // Reset count after successful search
  if (searchCount >= 5) {
    setSearchCount(0);
    setTurnstileToken(null);
  }
};
```

**Add Turnstile container to JSX**:
```tsx
{showTurnstile && (
  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <p className="text-sm text-slate-600 mb-3">
      Please verify you're human to continue searching
    </p>
    <div id="turnstile-container" ref={turnstileContainerRef}></div>
  </div>
)}
```

---

### Location 2: Drug Lens Search (DrugLens.tsx)

**File**: `client/src/pages/DrugLens.tsx`

**Add same Turnstile logic**:
```typescript
const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
const [showTurnstile, setShowTurnstile] = useState(false);
const [searchCount, setSearchCount] = useState(0);
const turnstileContainerRef = useRef<HTMLDivElement>(null);

// Initialize Turnstile
useEffect(() => {
  if (showTurnstile && turnstileContainerRef.current && window.turnstile) {
    window.turnstile.render('#turnstile-container-druglens', {
      sitekey: '1x00000000000000000000AA', // Replace with your site key
      theme: 'light',
      callback: (token: string) => {
        setTurnstileToken(token);
      },
    });
  }
}, [showTurnstile]);

// Modify search handler
const handleSearch = (query: string) => {
  setSearchCount(prev => prev + 1);
  
  if (searchCount >= 5 && !turnstileToken) {
    setShowTurnstile(true);
    return;
  }
  
  setSearchQuery(query);
  
  if (searchCount >= 5) {
    setSearchCount(0);
    setTurnstileToken(null);
  }
};
```

**Add Turnstile container**:
```tsx
{showTurnstile && (
  <div className="my-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <p className="text-sm text-slate-600 mb-3">
      Please verify you're human to continue searching
    </p>
    <div id="turnstile-container-druglens" ref={turnstileContainerRef}></div>
  </div>
)}
```

---

### Location 3: Sila AI Chat (SilaChat.tsx or AIChatBox.tsx)

**File**: `client/src/components/AIChatBox.tsx`

**Add Turnstile logic**:
```typescript
const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
const [showTurnstile, setShowTurnstile] = useState(false);
const [messageCount, setMessageCount] = useState(0);
const turnstileContainerRef = useRef<HTMLDivElement>(null);

// Initialize Turnstile
useEffect(() => {
  if (showTurnstile && turnstileContainerRef.current && window.turnstile) {
    window.turnstile.render('#turnstile-container-chat', {
      sitekey: '1x00000000000000000000AA', // Replace with your site key
      theme: 'light',
      callback: (token: string) => {
        setTurnstileToken(token);
      },
    });
  }
}, [showTurnstile]);

// Modify message send handler
const handleSendMessage = (message: string) => {
  setMessageCount(prev => prev + 1);
  
  // Show Turnstile after 5 messages
  if (messageCount >= 5 && !turnstileToken) {
    setShowTurnstile(true);
    return;
  }
  
  // Send message
  sendMessage(message, turnstileToken || undefined);
  
  // Reset after 5 messages
  if (messageCount >= 5) {
    setMessageCount(0);
    setTurnstileToken(null);
  }
};
```

**Add Turnstile container**:
```tsx
{showTurnstile && (
  <div className="my-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <p className="text-sm text-slate-600 mb-3">
      Please verify you're human to continue chatting with Sila
    </p>
    <div id="turnstile-container-chat" ref={turnstileContainerRef}></div>
  </div>
)}
```

---

## STEP 3: BACKEND VALIDATION

### Add Turnstile Verification to tRPC Procedures

**File**: `server/routers.ts` or `server/_core/trpc.ts`

**Add verification function**:
```typescript
import axios from 'axios';

const verifyTurnstile = async (token: string): Promise<boolean> => {
  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }
    );
    return response.data.success;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
};
```

**Add to search procedure**:
```typescript
export const searchRouter = router({
  search: publicProcedure
    .input(z.object({
      query: z.string(),
      turnstileToken: z.string().optional(),
    }))
    .query(async ({ input }) => {
      // Verify Turnstile if provided
      if (input.turnstileToken) {
        const isValid = await verifyTurnstile(input.turnstileToken);
        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Turnstile verification failed',
          });
        }
      }
      
      // Proceed with search
      // ... rest of search logic
    }),
});
```

---

## STEP 4: ENVIRONMENT VARIABLES

**Add to `.env`**:
```
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

**Add to `server/_core/env.ts`**:
```typescript
export const env = {
  // ... existing env vars
  TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY || '',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',
};
```

---

## STEP 5: TESTING

### Test Turnstile Widget

1. **Open browser DevTools** (F12)
2. **Go to Search page** or Drug Lens
3. **Perform 5 searches** in quick succession
4. **Verify Turnstile appears** after 5th search
5. **Solve CAPTCHA** (click checkbox or wait for invisible verification)
6. **Verify search proceeds** after CAPTCHA is solved

### Test Backend Verification

```bash
# Get Turnstile token from browser console
# Then test API with token
curl -X POST https://drugindex.click/api/trpc/data.search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "diabetes",
    "turnstileToken": "TOKEN_FROM_BROWSER"
  }'
```

---

## STEP 6: CONFIGURATION OPTIONS

### Customize Turnstile Widget

**Theme Options**:
- `light` - Light background
- `dark` - Dark background

**Size Options**:
- `normal` - Standard size
- `compact` - Smaller widget

**Language Options**:
- `en` - English
- `ar` - Arabic
- `auto` - Auto-detect

**Example with options**:
```typescript
window.turnstile.render('#turnstile-container', {
  sitekey: '1x00000000000000000000AA',
  theme: 'light',
  size: 'normal',
  language: 'en',
  callback: (token: string) => {
    setTurnstileToken(token);
  },
  'error-callback': () => {
    console.error('Turnstile error');
  },
  'expired-callback': () => {
    setTurnstileToken(null);
  },
});
```

---

## TROUBLESHOOTING

### Turnstile widget not appearing

1. Check if script is loaded: `window.turnstile` should exist
2. Verify site key is correct
3. Check browser console for errors
4. Ensure container div exists with correct ID

### Verification failing

1. Check secret key is correct
2. Verify token is being sent to backend
3. Check network requests in DevTools
4. Ensure backend has correct environment variables

### Token expiring

1. Tokens expire after 5 minutes
2. Add error callback to reset state
3. Implement token refresh logic if needed

---

## SECURITY BEST PRACTICES

1. **Never expose secret key** in frontend code
2. **Always verify token on backend** before processing
3. **Use HTTPS only** for all requests
4. **Rotate keys periodically** (every 90 days)
5. **Monitor Turnstile analytics** for abuse patterns
6. **Implement rate limiting** in addition to Turnstile

---

## MONITORING

### Cloudflare Turnstile Analytics

**Dashboard Path**:
```
Cloudflare Dashboard → Turnstile → Analytics
```

**Metrics to monitor**:
- Total challenges
- Success rate
- Average solve time
- Blocked requests
- Suspicious activity

---

## DEPLOYMENT CHECKLIST

- [ ] Turnstile site created in Cloudflare
- [ ] Site key copied to frontend
- [ ] Secret key added to environment variables
- [ ] Turnstile script added to index.html
- [ ] SearchBar.tsx updated with Turnstile logic
- [ ] DrugLens.tsx updated with Turnstile logic
- [ ] AIChatBox.tsx updated with Turnstile logic
- [ ] Backend verification function implemented
- [ ] tRPC procedures updated to verify tokens
- [ ] Environment variables configured
- [ ] Testing completed
- [ ] Monitoring enabled

---

**Status**: ✅ Ready for Production  
**Last Updated**: 2026-04-08  
**Version**: 1.0
