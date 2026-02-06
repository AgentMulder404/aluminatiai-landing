# Configure Email Confirmation Redirect

After users confirm their email, they should be redirected to the login page with a success message.

## Steps to Configure in Supabase

### 1. Update Email Template Redirect URL

1. Go to: **https://supabase.com/dashboard/project/vicubfjkhjwwunndaymo/auth/templates**

2. Click on **"Confirm signup"** template

3. Find the confirmation URL in the template (looks like `{{ .ConfirmationURL }}`)

4. The template should look something like:
   ```html
   <h2>Confirm your signup</h2>
   <p>Follow this link to confirm your user:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
   ```

5. **Don't change the template** - Supabase will handle the redirect

### 2. Set Site URL and Redirect URLs

1. Go to: **https://supabase.com/dashboard/project/vicubfjkhjwwunndaymo/auth/url-configuration**

2. Set these values:

   **Site URL:**
   ```
   https://aluminatiai-landing.vercel.app
   ```

   **Redirect URLs (add all of these):**
   ```
   https://aluminatiai-landing.vercel.app/login?confirmed=true
   https://aluminatiai-landing.vercel.app/dashboard
   https://aluminatiai-landing.vercel.app/dashboard/setup
   http://localhost:3000/login?confirmed=true
   http://localhost:3000/dashboard
   ```

3. Click **Save**

### 3. Update Auth Settings (Optional but Recommended)

1. Go to: **https://supabase.com/dashboard/project/vicubfjkhjwwunndaymo/settings/auth**

2. Find **"Email Auth"** section

3. Enable these settings:
   - ✅ **Enable email confirmations** (for production security)
   - ✅ **Enable email change confirmations**
   - ⚠️ **Disable for testing:** Turn OFF email confirmations for faster testing

## How It Works

### With Email Confirmation ENABLED:

1. User signs up → sees "Check your email" message
2. User clicks confirmation link in email
3. Supabase confirms email and redirects to: `/login?confirmed=true`
4. Login page shows green success message: "Email confirmed! Please sign in to continue."
5. User enters credentials and signs in
6. Redirected to `/dashboard`

### With Email Confirmation DISABLED:

1. User signs up → automatically signed in
2. Immediately redirected to `/dashboard/setup`
3. Sees API key and installation instructions

## Testing Both Flows

### Test with Email Confirmation OFF (Faster):
```bash
# Good for development
1. Disable email confirmations in Supabase
2. Sign up → auto signed in → dashboard
```

### Test with Email Confirmation ON (Production-like):
```bash
# Good for testing the full flow
1. Enable email confirmations in Supabase
2. Sign up → check email → click link → login page → sign in → dashboard
```

## Current Setup

Your app now supports **both flows automatically**:

- **TrialSignupModal** detects if email confirmation is required
- **Login page** shows success message after email confirmation
- **Navigation** has "Sign In" link for returning users

## Troubleshooting

**Users redirected to wrong URL after confirmation?**
- Check Site URL in Supabase auth settings
- Make sure redirect URLs are whitelisted

**Users see "Invalid redirect URL" error?**
- Add the redirect URL to the allowed list in Supabase

**Users confirmed email but can't sign in?**
- Check if their email is verified in Supabase → Auth → Users
- Look for green checkmark next to email

**Want to test without email?**
- Disable email confirmations in Supabase temporarily
- Users will be auto-signed in immediately after signup
