const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Determine output directory based on platform
const platform = process.platform;
let appDir;

if (platform === 'darwin') {
  appDir = path.join(__dirname, '../out/robotics-contributors-darwin-x64/robotics-contributors.app/Contents/Resources/app');
} else if (platform === 'win32') {
  appDir = path.join(__dirname, '../out/robotics-contributors-win32-x64/resources/app');
} else {
  appDir = path.join(__dirname, '../out/robotics-contributors-linux-x64/resources/app');
}

// Create python directory in the packaged app
const pythonDir = path.join(appDir, 'python-env');
if (!fs.existsSync(pythonDir)) {
  fs.mkdirSync(pythonDir, { recursive: true });
}

// Create a virtual environment and install dependencies
console.log('Creating Python virtual environment and installing dependencies...');
execSync(`python -m venv "${pythonDir}"`);

// Install dependencies in the virtual environment
const pipCmd = platform === 'win32' 
  ? `"${pythonDir}/Scripts/pip"` 
  : `"${pythonDir}/bin/pip"`;

execSync(`${pipCmd} install moviepy opencv-python numpy`, { stdio: 'inherit' });

console.log('Python dependencies bundled successfully!');
