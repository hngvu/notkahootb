# Deployment Checklist for CORS Issue

## ⚠️ CRITICAL: Vercel Environment Variables

Your backend (`notkahootb`) on Vercel is not reading the `ALLOWED_ORIGINS` environment variable.

### Required Vercel Dashboard Steps (DO NOT SKIP):

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard

2. **Select the `notkahootb` project**

3. **Click Settings → Environment Variables**

4. **Add these variables:**
   ```
   Name: ALLOWED_ORIGINS
   Value: https://notkahootui.vercel.app
   Environment: Production
   ```
   
   Optional (also add for preview builds):
   ```
   Name: NODE_ENV
   Value: production
   Environment: Production
   ```

5. **Click Save**

6. **IMPORTANT: Redeploy**
   - Go to **Deployments** tab
   - Click the latest deployment
   - Click **Redeploy** button
   - Wait for "Ready" status (green checkmark)

---

## ✅ Verification Steps

After redeployment:

1. Open browser DevTools (F12)
2. Go to https://notkahootui.vercel.app/host/login
3. Click login and watch Network tab
4. Look for the `POST /host/login` request
5. Check Response Headers - should see:
   ```
   Access-Control-Allow-Origin: https://notkahootui.vercel.app
   Access-Control-Allow-Credentials: true
   ```

If you still see "No 'Access-Control-Allow-Origin' header":
- The environment variable was NOT picked up
- Redeploy again (sometimes takes 2-3 deployments for env vars to apply)

---

## 🔍 Debugging

If error persists, check:

1. **Is backend even running?**
   - Visit https://notkahootb.vercel.app/ in browser
   - Should see Fastify logs in Vercel dashboard

2. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Deployments → Latest → Logs
   - Look for: "🔐 CORS Configuration:" line
   - Verify it shows the correct allowed origins

3. **Check if .env.local is committed:**
   - `.env.local` is in `.gitignore` (good!)
   - Environment variables MUST be set in Vercel dashboard, not via .env files on Vercel

---

## 📝 Summary

**Problem:** Backend CORS not allowing frontend domain
**Solution:** Set `ALLOWED_ORIGINS` in Vercel dashboard + Redeploy
**Timeline:** Usually works within 2-3 minutes after redeploy
