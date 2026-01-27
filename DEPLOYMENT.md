# Deployment Guide

## Quick Deployment to Vercel

### Prerequisites
- Supabase project set up (see [DATABASE_SETUP.md](./DATABASE_SETUP.md))
- GitHub repository with your code
- Vercel account ([vercel.com](https://vercel.com))

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Add early access database integration"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click **"Deploy"**

### Step 3: Add Environment Variables

After the initial deployment:

1. Go to your project on Vercel
2. Click **"Settings"** → **"Environment Variables"**
3. Add these three variables:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vicubfjkhjwwunndaymo.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key from Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key from Supabase | Production, Preview, Development |

⚠️ **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is a SECRET. Make sure:
- You paste the correct key from Supabase Settings → API → Legacy keys → service_role
- It's marked as "Sensitive" in Vercel (Vercel does this automatically)
- You never commit it to git

### Step 4: Redeploy

1. Go to **"Deployments"** tab
2. Click the three dots on the latest deployment
3. Click **"Redeploy"**

This ensures the new environment variables are loaded.

### Step 5: Test Your Live Site

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Click "Request Early Access"
3. Submit a test email
4. Check your Supabase Table Editor to see if it was saved

## Custom Domain Setup

If you have a custom domain (like `aluminatai.com`):

1. In Vercel, go to **"Settings"** → **"Domains"**
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions
4. Wait for DNS propagation (5-30 minutes)
5. Your site will be live at your custom domain!

## Environment Variables Reference

```env
# Public variables (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://vicubfjkhjwwunndaymo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret variables (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting Deployment

### "Failed to save email" error in production

**Solution**: Make sure you added the `SUPABASE_SERVICE_ROLE_KEY` environment variable and redeployed.

### Environment variables not loading

**Solution**:
1. Verify all three variables are set in Vercel
2. Trigger a new deployment (don't just redeploy)
3. Check the Vercel deployment logs for any errors

### Database connection timeout

**Solution**:
1. Check that your Supabase project is active (not paused)
2. Verify the `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Check Supabase status page for any outages

## Monitoring

After deployment, monitor:
- **Vercel Analytics**: See page views and performance
- **Supabase Table Editor**: View all early access signups
- **Vercel Logs**: Check for any API errors

## Next Steps

- Set up a custom domain
- Add email notifications when someone signs up
- Create an admin dashboard to view signups
- Export emails to a mailing list service
