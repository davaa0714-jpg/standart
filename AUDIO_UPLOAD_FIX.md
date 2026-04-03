# Audio Upload Fix - Standard Website

## Problem
The "Save All to Database" button was failing with "Failed to upload file" error when trying to save audio files.

## Root Causes Found
1. **File Extension Issue**: Files were being saved with hardcoded `.webm` extension regardless of original format
2. **Poor Error Handling**: API errors were not specific enough to diagnose issues
3. **Missing Storage Bucket**: The `audio-files` bucket might not exist in Supabase Storage
4. **File Validation**: No validation for corrupted/invalid audio files

## Fixes Applied

### 1. Fixed File Extension Handling (`app/recorder/page.tsx`)
- Added proper file extension detection based on MIME type
- Maps audio types to correct extensions (webm, mp3, wav, ogg)
- Preserves original file format during upload

### 2. Enhanced Error Handling (`app/api/audio-files/route.ts`)
- Added detailed logging for upload process
- More specific error messages with actual error details
- Better cleanup on upload failure
- Added try-catch for storage cleanup

### 3. Improved File Validation (`app/recorder/page.tsx`)
- Added comprehensive list of supported audio formats
- Added file corruption detection using Audio API
- Skips corrupted files with specific error message
- Only validates files larger than 1KB to avoid false positives

### 4. Storage Bucket Setup (`create-audio-bucket.sql`)
- Created SQL script to set up the required storage bucket
- Added proper Row Level Security (RLS) policies
- Included verification queries

## Setup Instructions

### 1. Create Storage Bucket
Run the SQL script in Supabase Dashboard:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste contents of `create-audio-bucket.sql`
3. Run the script

Or manually create the bucket:
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `audio-files`
4. Public: No (private bucket)
5. Then run the policy creation statements from the SQL file

### 2. Verify Environment Variables
Make sure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Test the Fix
1. Restart your development server
2. Go to the recorder page
3. Import or record an audio file
4. Click "Save All to Database"
5. Check browser console for detailed logs

## Supported Audio Formats
- WebM (.webm)
- MP3 (.mp3, .mpeg)
- WAV (.wav)
- OGG (.ogg)
- M4A (.m4a)
- FLAC (.flac)
- AAC (.aac)

## Troubleshooting

### If still getting "Failed to upload file":
1. Check browser console for detailed error logs
2. Verify the `audio-files` bucket exists in Supabase Storage
3. Check if user is authenticated (look at network tab for auth headers)
4. Verify RLS policies are correctly set up

### Common Issues:
- **Bucket not found**: Run the SQL script to create the bucket
- **Permission denied**: Check RLS policies in Supabase
- **File too large**: Check Supabase Storage limits (default 50MB)
- **CORS error**: Make sure Supabase URL is correct in env vars

### Debug Steps:
1. Open browser DevTools → Network tab
2. Try uploading a file
3. Look for the `/api/audio-files` request
4. Check the response for detailed error messages
5. Check console logs for upload progress

## File Changes Summary

### Modified Files:
- `app/recorder/page.tsx`: Fixed file extension handling, added validation
- `app/api/audio-files/route.ts`: Enhanced error handling and logging

### New Files:
- `create-audio-bucket.sql`: Storage bucket setup script
- `AUDIO_UPLOAD_FIX.md`: This documentation file

## Testing Recommendations

1. Test with different audio formats (MP3, WAV, WebM)
2. Test with corrupted files (should be skipped)
3. Test with non-audio files (should be rejected)
4. Test batch upload of multiple files
5. Test upload after page refresh

## Future Improvements

- Add progress bar for file uploads
- Add file size validation before upload
- Add retry mechanism for failed uploads
- Add audio preview before upload
- Add compression for large files
