/*
 Script to check ffprobe availability and report version.
 Usage: node scripts/check_ffprobe.js
 */

const { exec } = require('child_process');
const path = require('path');
const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

exec(`"${ffprobePath}" -version`, (err, stdout, stderr) => {
  if (err) {
    console.error('ffprobe not found or failed to run.');
    console.error('Options:');
    console.error('- Install ffmpeg/ffprobe and add to PATH (e.g., with Chocolatey `choco install ffmpeg`).');
    console.error('- Or set FFPROBE_PATH in backend/.env to the full path of ffprobe.exe');
    console.error('Command error:', err.message);
    process.exit(1);
  }
  console.log('ffprobe found:');
  console.log((stdout || stderr).trim());
});
