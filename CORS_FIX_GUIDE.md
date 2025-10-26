# 🚀 CORS Fix Guide

## The Issue

```
Access to fetch at 'https://notkahootb.vercel.app/host/login' from origin 'https://notkahootui.vercel.app' 
has been blocked by CORS policy
```

**Root Cause:** Backend doesn't know about frontend domain

---

## ✅ Complete Fix (Step-by-Step)

### Step 1: Commit Changes Locally
Push these files to Git:
- `notkahootb/server.js` (updated CORS logging)
- `notkahootb/.env.local` (added frontend domain)
- `notkahootb/vercel.json` (NEW - Vercel config)
- `notkahootb/DEPLOYMENT_CHECKLIST.md` (NEW - this guide)

```bash
cd notkahootb
git add .
git commit -m "fix: add Vercel config and improve CORS setup"
git push
```

### Step 2: Set Environment Variables on Vercel

**For Backend Project (notkahootb):**
1. Go to https://vercel.com/dashboard
2. Click on `notkahootb` project
3. Click **Settings** → **Environment Variables**
4. Add variable:
   - **Name:** `ALLOWED_ORIGINS`
   - **Value:** `https://notkahootui.vercel.app`
   - **Environment:** Select "Production" (or "All")
5. Click **Add** and then **Save**

### Step 3: Verify Frontend Configuration

**For Frontend Project (notkahootui):**
1. Go to https://vercel.com/dashboard
2. Click on `notkahootui` project
3. Click **Settings** → **Environment Variables**
4. Ensure these are set:
   - `VITE_API_BASE_URL=https://notkahootb.vercel.app/`
   - `VITE_WS_BASE_URL=wss://notkahootb.vercel.app/`

### Step 4: Redeploy Both Projects

**Backend:**
1. In Vercel dashboard → `notkahootb` project
2. Go to **Deployments**
3. Click on latest deployment
4. Click **Redeploy**
5. Wait for "Ready" (green checkmark)

**Frontend:**
1. In Vercel dashboard → `notkahootui` project
2. Go to **Deployments**
3. Click on latest deployment
4. Click **Redeploy**
5. Wait for "Ready"

---

## 🔍 Verify It Works

1. Open https://notkahootui.vercel.app/host/login
2. Open DevTools (F12) → Network tab
3. Enter a password and click "Đăng Nhập"
4. Look at the POST request to `/host/login`
5. Click on the request and check **Response Headers**
6. Should see:
   ```
   access-control-allow-origin: https://notkahootui.vercel.app
   access-control-allow-credentials: true
   ```

If you see these headers → **CORS is fixed! ✅**

---

## ❌ Troubleshooting

### Still Getting CORS Error?

**Possibility 1: Environment variable not applied**
- Redeploy again (sometimes needs 2-3 attempts)
- Wait 2-3 minutes between redeployments

**Possibility 2: Browser cache**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private window

**Possibility 3: Wrong domain in ALLOWED_ORIGINS**
- Check spelling: `https://notkahootui.vercel.app` (no trailing `/`)
- Verify in Vercel dashboard it's set correctly

**Possibility 4: Backend not responding**
- Visit https://notkahootb.vercel.app/ directly
- Should see Fastify server response (not a 404)
- If 404, backend might not be deployed properly

### Check Backend Logs

1. Go to Vercel → `notkahootb` project
2. Click **Deployments** → latest
3. Click **Logs** button
4. Look for `🔐 CORS Configuration:` message
5. Verify `Allowed Origins:` includes your frontend domain

---

## 📋 Checklist Before Asking for Help

- [ ] Pushed all code changes to Git
- [ ] Set `ALLOWED_ORIGINS=https://notkahootui.vercel.app` on Vercel backend
- [ ] Redeployed backend (status = "Ready")
- [ ] Set `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` on Vercel frontend
- [ ] Redeployed frontend (status = "Ready")
- [ ] Hard-refreshed browser (`Ctrl+Shift+R`)
- [ ] Checked Response Headers in Network tab
- [ ] Waited 5+ minutes after redeploy

---

## 📞 If Still Not Working

Collect this info for debugging:

1. Screenshot of Vercel backend Environment Variables
2. Screenshot of Response Headers in Network tab (failed request)
3. Backend logs from Vercel Deployments → Logs
4. What error message exactly appears?
