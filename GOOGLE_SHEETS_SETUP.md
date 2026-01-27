# Google Sheets Setup Instructions

Follow these steps to connect your email signups to Google Sheets.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "AluminatiAI Email Signups" (or whatever you prefer)
4. In the first row, add these headers:
   - A1: `Email`
   - B1: `Timestamp`
   - C1: `Source`
5. **Copy the Spreadsheet ID** from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` part (the long string between `/d/` and `/edit`)

## Step 2: Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" → "Enable APIs and Services"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create a Service Account:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Name it "aluminatiai-signups" (or your preference)
   - Click "Create and Continue"
   - Skip the optional permissions
   - Click "Done"

5. Create a Service Account Key:
   - Click on the service account you just created
   - Go to the "Keys" tab
   - Click "Add Key" → "Create New Key"
   - Choose "JSON" format
   - Click "Create"
   - **A JSON file will download** - keep this safe!

## Step 3: Share the Google Sheet with the Service Account

1. Open the JSON file you just downloaded
2. Find the `client_email` field (looks like: `something@project-id.iam.gserviceaccount.com`)
3. Copy this email address
4. Go back to your Google Sheet
5. Click "Share" in the top right
6. Paste the service account email
7. Give it "Editor" permissions
8. Click "Send"

## Step 4: Add Environment Variables

1. Open the JSON file you downloaded
2. Copy the **entire contents** of the file
3. Create a file named `.env.local` in your project root
4. Add these variables:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_here
GOOGLE_PRIVATE_KEY="your_private_key_here"
```

**Important:** The private key should keep its `\n` newline characters and be wrapped in quotes.

Example:
```env
GOOGLE_SHEETS_SPREADSHEET_ID=1abc123xyz456
GOOGLE_SERVICE_ACCOUNT_EMAIL=aluminatiai-signups@project-123.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
```

## Step 5: Add to Vercel

When deploying to Vercel:
1. Go to your Vercel project → Settings → Environment Variables
2. Add the same three variables:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
3. Redeploy your site

## Done!

Now every email signup will automatically be added to your Google Sheet with a timestamp!
