# Baidu Pan to Google Drive Transfer

A web application that allows you to transfer files directly from Baidu Pan (Baidu Netdisk) to Google Drive without downloading to your local machine.

## Features

- Simple web interface for URL input
- Direct file transfer from Baidu Pan to Google Drive
- Progress tracking and status updates
- Automatic cleanup of temporary files
- Returns shareable Google Drive links

## Prerequisites

- Node.js (v14 or higher)
- Google Cloud Platform account with Drive API enabled
- Baidu Pan account (for accessing files)

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Google Drive API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
   - Save the Client ID and Client Secret

5. Get your refresh token:
   - Copy `.env.example` to `.env`
   - Fill in your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Run the server: `npm start`
   - Visit: `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent`
   - Replace `YOUR_CLIENT_ID` with your actual client ID
   - Authorize the application
   - Copy the refresh token and add it to your `.env` file

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### 4. Run the Application

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Paste your Baidu Pan download URL in the input field
3. Click "Transfer to Google Drive"
4. Wait for the transfer to complete
5. Copy the returned Google Drive link

## Important Notes

### Baidu Pan Download Limitations

- Baidu Pan URLs often require authentication and may have download restrictions
- Direct download links work best
- For share links with passwords, you may need to modify the code to handle authentication
- Large files may take considerable time to transfer

### Google Drive Permissions

- Uploaded files are set to "anyone with the link can view" by default
- You can modify the permissions in the code (server.js:102-108) to make files private

### File Size Considerations

- Large files will consume significant bandwidth and time
- The server needs sufficient disk space for temporary storage
- Consider implementing streaming for very large files to avoid disk space issues

## API Endpoints

### POST /api/transfer

Transfer a file from Baidu Pan to Google Drive.

**Request Body:**
```json
{
  "baiduUrl": "https://pan.baidu.com/s/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "File transferred successfully",
  "file": {
    "name": "filename.ext",
    "id": "google_drive_file_id",
    "viewLink": "https://drive.google.com/file/d/.../view",
    "downloadLink": "https://drive.google.com/uc?id=..."
  }
}
```

### GET /api/health

Check server status.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Troubleshooting

### "Failed to download from Baidu Pan"

- Ensure the URL is a valid direct download link
- Check if the file requires authentication
- Verify network connectivity

### "Failed to upload to Google Drive"

- Verify your Google API credentials are correct
- Ensure the refresh token is valid
- Check if you have sufficient Google Drive storage space
- Confirm the Drive API is enabled in your Google Cloud Console

### Server won't start

- Check if port 3000 is already in use
- Verify all dependencies are installed (`npm install`)
- Ensure `.env` file exists and contains valid credentials

## Security Considerations

- Never commit your `.env` file to version control
- Keep your Google API credentials secure
- Consider implementing rate limiting for production use
- Add authentication if deploying publicly

## Future Enhancements

- Support for Baidu Pan authentication
- Progress bars for large file transfers
- Batch file transfers
- Support for additional cloud storage providers
- File preview before transfer
- Custom folder selection in Google Drive

## License

MIT

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
