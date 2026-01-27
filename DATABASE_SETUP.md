# Database Setup Guide - Supabase

This guide will help you set up Supabase for the early access request feature.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js installed on your machine

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - **Name**: AluminatiAI (or your preferred name)
   - **Database Password**: Choose a strong password (save this)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is sufficient to start
4. Click "Create new project" and wait for it to initialize (takes ~2 minutes)

## Step 2: Create the Database Table

1. In your Supabase project dashboard, click on the **SQL Editor** in the left sidebar
2. Click "New Query"
3. Copy and paste the contents of `database/schema.sql` into the editor
4. Click "Run" to execute the SQL

This will create:
- An `early_access_requests` table with proper indexes
- Row Level Security (RLS) policies for secure access
- Unique constraint on email to prevent duplicates

## Step 3: Get Your API Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear) in the left sidebar
2. Click on **API** under "Configuration"
3. Click on **"Legacy anon, service_role API keys"** tab (important!)
4. You'll see three important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role secret** key (click "Reveal" to see it)

⚠️ **Important**: The service_role key is a SECRET key - never expose it in client-side code or commit it to version control!

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the `aluminatai-landing` directory if it doesn't exist
2. Add the following environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Server-side only key (bypasses RLS) - KEEP THIS SECRET!
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Replace the placeholder values with the actual values from Step 3.

**Important Notes**:
- `NEXT_PUBLIC_*` keys are safe to expose in the frontend
- `SUPABASE_SERVICE_ROLE_KEY` is SECRET and only used server-side for API routes
- The service role key bypasses RLS, which is necessary for the signup API route to work

## Step 5: Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:3000`
3. Click "Request Early Access" and submit an email
4. Check your Supabase dashboard:
   - Go to **Table Editor** in the left sidebar
   - Select the `early_access_requests` table
   - You should see your test email entry

## Deployment (Vercel or Production)

When deploying to production (Vercel, Netlify, etc.):

1. Go to your hosting platform's project settings
2. Navigate to "Environment Variables"
3. Add **all three** environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://vicubfjkhjwwunndaymo.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (SECRET!)
4. Save and redeploy your application

⚠️ **Security Note**: The `SUPABASE_SERVICE_ROLE_KEY` is a secret key. Make sure it's:
- Only used in server-side code (API routes)
- Never exposed to the client-side
- Kept secure in your hosting platform's environment variables
- Not committed to git (already protected by .gitignore)

## Viewing Your Data

To view all early access requests:

1. Go to your Supabase project dashboard
2. Click on **Table Editor** in the left sidebar
3. Select `early_access_requests`
4. You'll see all submissions with:
   - Email address
   - Source (where they signed up from)
   - Timestamp

## Optional: Export Data

You can export your early access list:

1. Go to **Table Editor** > `early_access_requests`
2. Click the three dots menu in the top right
3. Select "Export as CSV"

## Troubleshooting

### "Database operations will fail" warning
- Check that your environment variables are set correctly
- Restart your development server after adding `.env.local`

### "Failed to save email" error
- Verify your Supabase project is active
- Check that the RLS policies are set up correctly
- Look at the browser console and server logs for detailed error messages

### Duplicate email submissions
- The database has a unique constraint on email addresses
- Duplicate submissions will return a friendly message instead of an error

## Security Notes

- Row Level Security (RLS) is enabled on the table
- The public can only INSERT new records (submit emails)
- Reading the data requires authentication (for future admin dashboard)
- Email validation happens both client-side and server-side
- The anon key is safe to expose because RLS protects your data

## Next Steps

Consider adding:
- An admin dashboard to view and manage early access requests
- Email verification/confirmation
- Export functionality
- Analytics on signup sources
- Automated welcome emails using Supabase Edge Functions
