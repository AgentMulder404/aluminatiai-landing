import { google } from 'googleapis';

export async function appendToSheet(email: string) {
  try {
    // Check if credentials are configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      console.warn('Google Sheets credentials not configured. Email will only be logged.');
      return false;
    }

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare the data
    const timestamp = new Date().toISOString();
    const values = [[email, timestamp, 'Landing Page']];

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: 'Sheet1!A:C', // Adjust if your sheet has a different name
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    console.log(`Added to Google Sheets: ${email} at ${timestamp}`);
    return true;
  } catch (error) {
    console.error('Error adding to Google Sheets:', error);
    return false;
  }
}
