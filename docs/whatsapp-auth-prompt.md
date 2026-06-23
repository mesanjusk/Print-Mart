
# WhatsApp Authentication — Magic Link Flow (Copy-Paste Prompt for Claude Code)

Implement WhatsApp-based authentication (register, login, forgot password via magic link)
in this project. Use the following project as a reference implementation:
https://github.com/mesanjusk/Print-Mart

---

## Overview

When a user texts a keyword to the WhatsApp bot, they receive a one-time magic login
link instead of a password. Clicking it logs them in and redirects to their profile
page to set a new password. No OTP codes, no temp passwords.

---

## What to build

### Backend

1. **User model** — add two fields:
   - `magicToken: { type: String }`
   - `magicTokenExpire: { type: Date }`

2. **Auth controller** — add `magicLogin` handler:
   - Route: `GET /api/auth/magic-login?token=`
   - Find user where `magicToken === token` AND `magicTokenExpire > now`
   - If not found → 400 "Magic link is invalid or has expired"
   - Clear both fields (one-time use), update `lastSeenAt`, save
   - Return same shape as login: `{ _id, name, email, phone, role, token: generateToken(user._id) }`

3. **Auth routes** — register it:
   ```js
   router.get('/magic-login', magicLogin);
   ```

4. **WhatsApp webhook controller** — replace any temp-password logic with a
   `generateMagicLink` helper:
   ```js
   const generateMagicLink = async (user) => {
     const crypto = require('crypto');
     const token = crypto.randomBytes(32).toString('hex');
     user.magicToken = token;
     user.magicTokenExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 min
     await user.save();
     const clientUrl = process.env.CLIENT_URL || 'https://yourapp.com';
     return `${clientUrl}/magic-login?token=${token}`;
   };
   ```

   Use it in two bot triggers:

   **REGISTER trigger** (user already exists):
   ```
   👋 Welcome back, *{name}*!
   You already have an account.
   📱 Phone: {phone}
   👤 Role: {role}

   🔗 Click to login & change password:
   {magicLink}

   ⚠️ Link expires in 30 minutes.
   ```

   **RESET trigger** (forgot password):
   ```
   🔑 Password Reset
   Click the link below to login and set a new password:

   🔗 {magicLink}

   ⚠️ Link expires in 30 minutes.
   Go to Profile → Change Password after logging in.
   ```

5. **Login phone lookup fix** — if users register via WhatsApp their phone is stored
   as `+919370195000` but they type `9370195000` in the login form. Fix the lookup
   to use a last-10-digit regex:
   ```js
   const normalizedPhone = phone.replace(/\D/g, '');
   const last10 = normalizedPhone.slice(-10);
   user = await User.findOne({ phone: { $regex: last10 } });
   ```

---

### Frontend

1. **`api.js`** — add to your auth API object:
   ```js
   magicLogin: (token) => api.get(`/auth/magic-login?token=${token}`),
   ```

2. **`MagicLoginPage.jsx`** — create this page:
   - On mount, read `token` from `useSearchParams()`
   - Call `authAPI.magicLogin(token)`
   - On success: store JWT + user in localStorage, call `updateUser(data)`,
     navigate to `/dashboard/profile` (or wherever your password change page is)
   - While loading: show a spinner "Logging you in..."
   - On error: show "Link Expired" card with link to login page and link to
     request a new link

3. **Router** — add the route:
   ```jsx
   <Route path="/magic-login" element={<MagicLoginPage />} />
   ```

---

## Environment variable needed
- `CLIENT_URL` on the backend (e.g. `https://yourapp.com`) — used to build the magic link URL

---

## Reference files in Print-Mart repo (mesanjusk/Print-Mart, branch: main)
- `backend/src/models/User.js` — magicToken fields
- `backend/src/controllers/authController.js` — magicLogin handler at bottom
- `backend/src/routes/authRoutes.js` — route registration
- `backend/src/controllers/whatsappController.js` — generateMagicLink helper + REGISTER/RESET handlers (~line 770)
- `frontend/src/pages/MagicLoginPage.jsx` — complete page component
- `frontend/src/App.jsx` — route wiring
- `frontend/src/services/api.js` — magicLogin API call

Adapt field names, route paths, and redirect targets to match this project's conventions.
