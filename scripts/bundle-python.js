// scripts/bundle-python.js
// This script creates a Python virtual environment and installs dependencies for the packaged app
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Determine platform
const platform = process.platform;
console.log(`Current platform: ${platform}`);
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
  const pythonCmd = platform === 'darwin' ? 'python3.9' : 'python3';
  execSync(`${pythonCmd} -m venv "${venvDir}"`, { stdio: 'inherit' });

  // Install dependencies
  const pipCmd = platform === 'win32' 
    ? `"${venvDir}\\Scripts\\pip"` 
    : `"${venvDir}/bin/pip"`;

  execSync(`${pipCmd} install --upgrade pip`, { stdio: 'inherit' });
  execSync(`${pipCmd} install ${dependencies.join(' ')}`, { stdio: 'inherit' });

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
    print(f"✓ {pkgName} imported successfully")
except ImportError as e:
    print(f"✗ {pkgName} import failed: {e}")`;
}).join('\n')}
`);
  
  console.log('Created test script at:', testScript);
  
} catch (error) {
  console.error('Error creating Python virtual environment:', error.message);
  process.exit(1);
}