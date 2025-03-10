// scripts/bundle-python.js
// This script is used to create a Python virtual environment in the packaged app and install dependencies.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Determine output directory based on platform
const platform = process.platform;
console.log(`Current platform: ${platform}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Script directory: ${__dirname}`);

// List all files in the out directory for debugging
try {
  console.log('Listing out directory contents:');
  const outDir = path.join(__dirname, '../out');
  if (fs.existsSync(outDir)) {
    const files = execSync(`find ${outDir} -type d | sort`).toString();
    console.log(files);
  } else {
    console.log('out directory does not exist');
  }
} catch (error) {
  console.log('Error listing out directory:', error.message);
}

// Look for all possible app directories
let appDirs = [];
try {
  // Use a more general approach to find app directories
  const outDir = path.join(__dirname, '../out');
  
  // Pattern for app resources directory
  const resourceDirs = glob.sync(`${outDir}/**/resources/app`);
  const macResourceDirs = glob.sync(`${outDir}/**/*.app/Contents/Resources/app`);
  
  appDirs = [...resourceDirs, ...macResourceDirs];
  
  console.log('Found app directories:', appDirs);

  if (appDirs.length === 0) {
    console.log('No app directories found with standard patterns. Trying alternative paths...');
    // Try to find any directories that might contain our app
    const possibleAppDirs = glob.sync(`${outDir}/**/app`);
    const possibleResourceDirs = glob.sync(`${outDir}/**/resources`);
    
    console.log('Possible app directories:', possibleAppDirs);
    console.log('Possible resource directories:', possibleResourceDirs);
    
    // If we found some possible candidates, add them
    if (possibleAppDirs.length > 0) {
      appDirs = possibleAppDirs;
    } else if (possibleResourceDirs.length > 0) {
      // For each resources dir, check if it has a subdirectory called app
      for (const resourceDir of possibleResourceDirs) {
        const appDir = path.join(resourceDir, 'app');
        if (fs.existsSync(appDir)) {
          appDirs.push(appDir);
        }
      }
    }
  }

  if (appDirs.length === 0) {
    console.log('Still no app directories found. Creating fallback directories...');
    
    // Create fallback directories based on platform
    let fallbackDirs = [];
    if (platform === 'darwin' || process.env.FORCE_PLATFORM === 'darwin') {
      fallbackDirs.push(path.join(__dirname, '../out/robotics-contributors-darwin-x64/robotics-contributors.app/Contents/Resources/app'));
    } 
    if (platform === 'win32' || process.env.FORCE_PLATFORM === 'win32') {
      fallbackDirs.push(path.join(__dirname, '../out/robotics-contributors-win32-x64/resources/app'));
    }
    if (platform === 'linux' || process.env.FORCE_PLATFORM === 'linux' || true) {
      // Always include Linux as a fallback in Docker
      fallbackDirs.push(path.join(__dirname, '../out/robotics-contributors-linux-x64/resources/app'));
    }
    
    // Ensure directories exist
    for (const dir of fallbackDirs) {
      if (!fs.existsSync(dir)) {
        console.log(`Creating fallback directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      appDirs.push(dir);
    }
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
      // Use python3 explicitly instead of python
      execSync(`python3 -m venv "${pythonDir}"`, { stdio: 'inherit' });

      // Install dependencies in the virtual environment
      const pipCmd = platform === 'win32' 
        ? `"${pythonDir}/Scripts/pip"` 
        : `"${pythonDir}/bin/pip"`;

      execSync(`${pipCmd} install --upgrade pip`, { stdio: 'inherit' });
      execSync(`${pipCmd} install moviepy opencv-python numpy`, { stdio: 'inherit' });
      
      console.log(`Python dependencies bundled successfully for ${appDir}!`);
    } catch (error) {
      console.error(`Error installing Python dependencies for ${appDir}:`, error);
      console.log('Trying alternative Python approach...');
      
      try {
        // Alternative approach using system Python directly
        execSync(`python3 -m pip install --target="${pythonDir}" moviepy opencv-python numpy`, { stdio: 'inherit' });
        console.log(`Python dependencies installed using alternative method for ${appDir}`);
      } catch (altError) {
        console.error(`Alternative Python approach also failed:`, altError);
      }
    }
  }
} catch (error) {
  console.error('Error in bundle-python.js:', error);
  // Don't exit with error to prevent build failure
  console.log('Continuing despite error...');
}