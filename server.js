const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure temp directory exists
const TEMP_DIR = path.join(__dirname, 'temp');
fs.ensureDirSync(TEMP_DIR);

// Google Drive setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set credentials if refresh token is available
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
}

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Function to download file from Baidu Pan
async function downloadFromBaiduPan(url, downloadPath) {
  try {
    console.log(`Downloading from Baidu Pan: ${url}`);

    // Extract file info from URL if possible
    // Note: Baidu Pan URLs often require authentication and special handling
    // This is a simplified version that works with direct download links

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      maxRedirects: 5,
      timeout: 300000 // 5 minutes timeout
    });

    // Get filename from content-disposition or URL
    let filename = 'downloaded_file';
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    } else {
      // Try to get filename from URL
      const urlPath = new URL(url).pathname;
      const urlFilename = path.basename(urlPath);
      if (urlFilename && urlFilename !== '/') {
        filename = urlFilename;
      }
    }

    const filePath = path.join(downloadPath, filename);
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve({ filePath, filename }));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading from Baidu Pan:', error.message);
    throw new Error(`Failed to download from Baidu Pan: ${error.message}`);
  }
}

// Function to upload file to Google Drive
async function uploadToGoogleDrive(filePath, filename) {
  try {
    console.log(`Uploading to Google Drive: ${filename}`);

    const fileMetadata = {
      name: filename,
      // Optional: Set parent folder ID if you want to upload to a specific folder
      // parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
    };

    const media = {
      body: fs.createReadStream(filePath)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    });

    // Make the file publicly accessible (optional)
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    console.log('File uploaded successfully:', file.data.id);
    return {
      id: file.data.id,
      name: file.data.name,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error.message);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
}

// Main transfer endpoint
app.post('/api/transfer', async (req, res) => {
  const { baiduUrl } = req.body;

  if (!baiduUrl) {
    return res.status(400).json({ error: 'Baidu Pan URL is required' });
  }

  const tempFilePath = path.join(TEMP_DIR, `transfer_${Date.now()}`);

  try {
    // Create temp directory for this transfer
    await fs.ensureDir(tempFilePath);

    // Step 1: Download from Baidu Pan
    const { filePath, filename } = await downloadFromBaiduPan(baiduUrl, tempFilePath);

    // Step 2: Upload to Google Drive
    const driveFile = await uploadToGoogleDrive(filePath, filename);

    // Step 3: Clean up temp files
    await fs.remove(tempFilePath);

    // Return success response
    res.json({
      success: true,
      message: 'File transferred successfully',
      file: {
        name: driveFile.name,
        id: driveFile.id,
        viewLink: driveFile.webViewLink,
        downloadLink: driveFile.webContentLink
      }
    });
  } catch (error) {
    console.error('Transfer error:', error);

    // Clean up on error
    try {
      await fs.remove(tempFilePath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Google OAuth callback (for initial setup)
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    res.send(`
      <h1>Authorization Successful!</h1>
      <p>Add this refresh token to your .env file:</p>
      <pre>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
    `);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Access the app at http://localhost:${PORT}`);
});
