// scripts/bundle-python.js
// This script creates a Python virtual environment and installs dependencies for the packaged app
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Determine platform (support FORCE_PLATFORM from CI)
const platform = process.env.FORCE_PLATFORM || process.platform;
console.log(`Current platform: ${platform}`);
console.log(`Force platform env: ${process.env.FORCE_PLATFORM || 'not set'}`);
console.log(`Current directory: ${process.cwd()}`);

// Paths
const pythonDir = path.join(process.cwd(), 'python');
const venvDir = path.join(process.cwd(), 'venv');
const requirementsPath = path.join(process.cwd(), 'requirements.txt');

// Read requirements.txt file
let dependencies = [];
if (fs.existsSync(requirementsPath)) {
  dependencies = fs.readFileSync(requirementsPath, 'utf8')
    .split('\n')
    .filter(line => line.trim() !== '' && !line.trim().startsWith('#'))
    .map(dep => dep.trim());
  console.log('Dependencies from requirements.txt:', dependencies);
} else {
  console.log('requirements.txt file not found, using default dependencies');
  dependencies = ['pip', 'opencv-python', 'moviepy', 'audalign', 'pydub', 'numpy'];
}

// Ensure python directory exists
if (!fs.existsSync(pythonDir)) {
  console.log(`Creating Python scripts directory: ${pythonDir}`);
  fs.mkdirSync(pythonDir, { recursive: true });
}

// Determine correct Python command based on platform
const getPythonCommand = () => {
  if (platform === 'darwin') return 'python3.9';
  if (platform === 'win32') return 'python';
  return 'python3'; // Linux/other
};

// Create virtual environment
console.log(`Creating Python virtual environment at: ${venvDir}`);
try {
  // Remove existing venv if it exists
  if (fs.existsSync(venvDir)) {
    console.log('Removing existing virtual environment...');
    if (platform === 'win32') {
      execSync(`rmdir /s /q "${venvDir}"`, { stdio: 'inherit' });
    } else {
      execSync(`rm -rf "${venvDir}"`, { stdio: 'inherit' });
    }
  }

  // Create new virtual environment
  const pythonCmd = getPythonCommand();
  console.log(`Using Python command: ${pythonCmd}`);
  execSync(`${pythonCmd} -m venv "${venvDir}"`, { stdio: 'inherit' });

  // Get path to Python executable in the virtual environment
  const pythonExe = platform === 'win32' 
    ? `"${venvDir}\\Scripts\\python"` 
    : `"${venvDir}/bin/python"`;
  
  // Get path to pip in the virtual environment
  const pipCmd = platform === 'win32' 
    ? `"${venvDir}\\Scripts\\pip"` 
    : `"${venvDir}/bin/pip"`;

  // Upgrade pip the correct way for each platform
  console.log('Upgrading pip...');
  if (platform === 'win32') {
    // On Windows, use Python to execute pip as a module
    execSync(`${pythonExe} -m pip install --upgrade pip`, { stdio: 'inherit' });
  } else {
    // On other platforms, can use pip directly
    execSync(`${pipCmd} install --upgrade pip`, { stdio: 'inherit' });
  }
  
  // Install each dependency individually for better error handling
  for (const dep of dependencies) {
    try {
      console.log(`Installing ${dep}...`);
      // Skip pip as we've already upgraded it
      if (dep.trim().toLowerCase() === 'pip') continue;
      
      if (platform === 'win32') {
        execSync(`${pythonExe} -m pip install ${dep}`, { stdio: 'inherit' });
      } else {
        execSync(`${pipCmd} install ${dep}`, { stdio: 'inherit' });
      }
    } catch (error) {
      console.warn(`Warning: Failed to install ${dep}: ${error.message}`);
    }
  }

  console.log('Python virtual environment created successfully!');
  
  // Create a simple script to test the environment
  const testScript = path.join(pythonDir, 'test_env.py');
  fs.writeFileSync(testScript, `
import sys
print("Python version:", sys.version)
print("Python executable:", sys.executable)
print("Testing imports:")
${dependencies.map(dep => {
  const pkgName = dep.split('==')[0].split('>')[0].split('<')[0].trim();
  return `try:
    import ${pkgName.replace('-', '_')}
    print(f"✓ ${pkgName} imported successfully")
except ImportError as e:
    print(f"✗ ${pkgName} import failed: {e}")`;
}).join('\n')}
`);
  
  console.log('Created test script at:', testScript);
  
  // Test the environment
  try {
    console.log('Testing Python environment:');
    execSync(`${pythonExe} "${testScript}"`, { stdio: 'inherit' });
  } catch (error) {
    console.warn(`Warning: Environment test failed: ${error.message}`);
  }
  
} catch (error) {
  console.error('Error creating Python virtual environment:', error.message);
  process.exit(1);
}