// scripts/bundle-python.js
// This script is used to create a Python virtual environment in the packaged app and install dependencies.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Determine output directory based on platform
const platform = process.platform;
let appDir;
let appDirs = [];

try {
  // Look for all possible app directories based on platform patterns
  if (platform === 'darwin') {
    // macOS
    const macAppPaths = glob.sync(path.join(__dirname, '../out/**/robotics-contributors.app/Contents/Resources/app'));
    if (macAppPaths.length > 0) {
      appDirs = macAppPaths;
    } else {
      console.log('Searching for alternative macOS app paths...');
      appDirs = glob.sync(path.join(__dirname, '../out/**/*.app/Contents/Resources/app'));
    }
  } else if (platform === 'win32') {
    // Windows
    appDirs = glob.sync(path.join(__dirname, '../out/**/resources/app'));
  } else {
    // Linux
    appDirs = glob.sync(path.join(__dirname, '../out/**/resources/app'));
  }

  console.log('Found app directories:', appDirs);

  if (appDirs.length === 0) {
    console.log('No app directories found. Falling back to standard paths.');
    if (platform === 'darwin') {
      appDir = path.join(__dirname, '../out/robotics-contributors-darwin-x64/robotics-contributors.app/Contents/Resources/app');
    } else if (platform === 'win32') {
      appDir = path.join(__dirname, '../out/robotics-contributors-win32-x64/resources/app');
    } else {
      appDir = path.join(__dirname, '../out/robotics-contributors-linux-x64/resources/app');
    }
    appDirs = [appDir];
  }

  // Process each app directory found
  for (const appDir of appDirs) {
    console.log(`Processing app directory: ${appDir}`);
    if (!fs.existsSync(appDir)) {
      console.log(`App directory doesn't exist, creating: ${appDir}`);
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Create python directory in the packaged app
    const pythonDir = path.join(appDir, 'python-env');
    if (!fs.existsSync(pythonDir)) {
      console.log(`Creating Python env directory: ${pythonDir}`);
      fs.mkdirSync(pythonDir, { recursive: true });
    }

    // Create a virtual environment and install dependencies
    console.log('Creating Python virtual environment and installing dependencies...');
    try {
      execSync(`python -m venv "${pythonDir}"`, { stdio: 'inherit' });

      // Install dependencies in the virtual environment
      const pipCmd = platform === 'win32' 
        ? `"${pythonDir}/Scripts/pip"` 
        : `"${pythonDir}/bin/pip"`;

      execSync(`${pipCmd} install --upgrade pip`, { stdio: 'inherit' });
      execSync(`${pipCmd} install moviepy opencv-python numpy`, { stdio: 'inherit' });
      
      console.log(`Python dependencies bundled successfully for ${appDir}!`);
    } catch (error) {
      console.error(`Error installing Python dependencies for ${appDir}:`, error);
    }
  }
} catch (error) {
  console.error('Error in bundle-python.js:', error);
  process.exit(1);
}