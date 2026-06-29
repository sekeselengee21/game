# Security Guidelines

## 🔒 Critical Security Rules

### 1. Environment Variables

**NEVER commit sensitive keys to version control!**

- ✅ Use `.env.local` for sensitive data (automatically gitignored by Vite)
- ✅ Use `.env.example` for documentation (no real values)
- ❌ Never commit `.env` files with real credentials
- ❌ Never expose private keys in frontend code

**Current Setup:**
```bash
# .env.example (committed) - template only
VITE_PUBLIC_KEY=your_public_key_here
VITE_URL_ENDPOINT=your_url_here

# .env.local (gitignored) - your actual values
VITE_PUBLIC_KEY=public_abc123...
VITE_URL_ENDPOINT=https://...
```

### 2. Authentication Token Storage

**Current Issue:** Tokens stored in `localStorage` are vulnerable to XSS attacks.

**Recommendations:**
- 🟡 **Short-term:** Continue with localStorage but implement:
  - Strict Content Security Policy (CSP)
  - Input sanitization (✅ implemented in `src/utils/sanitize.ts`)
  - Regular token rotation
  
- ✅ **Long-term:** Move to httpOnly cookies:
  - Server sets cookie with `httpOnly`, `secure`, `sameSite` flags
  - Frontend makes requests without manually handling tokens
  - Protects against XSS token theft

### 3. Input Sanitization

**All user inputs MUST be sanitized!**

✅ **Implemented:** Use utilities in `src/utils/sanitize.ts`

```typescript
import { sanitizeHTML, sanitizeChatMessage, sanitizeUsername } from '@/utils/sanitize';

// Chat messages
const safeMessage = sanitizeChatMessage(userInput);

// Usernames
const safeUsername = sanitizeUsername(username);

// HTML content
const safeHTML = sanitizeHTML(content);
```

### 4. Password Requirements

✅ **Implemented:** Strong password validation in `src/utils/sanitize.ts`

```typescript
import { validatePassword } from '@/utils/sanitize';

const result = validatePassword(password);
if (!result.valid) {
  alert(result.message);
}
```

**Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

### 5. WebSocket Security

**Current Implementation:**
- Token sent after connection opens

**Recommendations:**
- ✅ Validate token on every message
- ✅ Implement rate limiting
- ✅ Auto-disconnect inactive connections
- 🟡 Consider passing token in connection URL: `wss://...?token=xxx`

### 6. API Security

**Best Practices:**
- ✅ Always use HTTPS in production
- ✅ Implement request rate limiting
- ✅ Validate all inputs on backend
- ✅ Use CORS properly
- ✅ Never trust client-side validation alone

### 7. Common Vulnerabilities to Watch

❌ **Never do these:**
```typescript
// XSS - Dangerous!
element.innerHTML = userInput;
dangerouslySetInnerHTML={{ __html: userInput }}

// Code Injection - Dangerous!
eval(userInput);
new Function(userInput)();

// SQL Injection (backend) - Dangerous!
query(`SELECT * FROM users WHERE id = ${userId}`);
```

✅ **Always do these:**
```typescript
// Safe rendering
element.textContent = sanitizeHTML(userInput);

// Safe queries (backend)
query('SELECT * FROM users WHERE id = ?', [userId]);
```

## 🚨 Incident Response

**If you discover a security issue:**

1. **DO NOT** commit the fix immediately
2. Rotate any exposed credentials
3. Assess the impact
4. Fix the vulnerability
5. Document what happened
6. Implement monitoring to prevent recurrence

## 📋 Security Checklist

Before deploying to production:

- [ ] All `.env` files in `.gitignore`
- [ ] No console.logs in production (✅ using `logger.ts`)
- [ ] Input sanitization on all user inputs
- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] Error messages don't leak sensitive info
- [ ] Authentication tokens properly secured
- [ ] Regular dependency updates
- [ ] Security headers configured (HSTS, X-Frame-Options, etc.)

## 🔍 Regular Audits

Run these commands regularly:

```bash
# Check for known vulnerabilities
npm audit

# Update dependencies
npm update

# Check for exposed secrets (install git-secrets)
git secrets --scan

# Lint for security issues
npm run lint
```

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Vite Security](https://vitejs.dev/guide/env-and-mode.html#env-files)
