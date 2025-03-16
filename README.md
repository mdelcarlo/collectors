# 🤖 Robotics Contributors

*An Electron desktop application for processing, organizing, and managing robotics training videos with automated metadata extraction and matching.*

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

## 📚 Table of Contents

- Overview
- Features
- System Requirements
- Installation Guide
- Running the Application
- Testing Guide
- Architecture
- Technical Decisions
- Troubleshooting

## 🔎 Overview

Robotics Contributors is a cross-platform desktop application that helps robotics researchers and trainers process and organize video files. It provides automated metadata extraction, video matching, and processing features to create optimized sample videos.

## ✨ Features

- **🎥 Video Management**: Upload, organize, and pair related video files
- **🔍 Automated Metadata Extraction**: Extract video information like resolution, FPS, duration 
- **🧩 Video Matching**: Auto-match related videos based on metadata
- **📊 Video Processing**: Generate sample videos with optimized settings
- **🔄 Batch Processing**: Process multiple videos concurrently
- **🔒 Authentication**: Secure login through Remotasks integration

## 💻 System Requirements

### Required Software

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **Python**: v3.9.x (macOS) or v3.x (Windows/Linux)
- **Git**: For cloning the repository

## 🔧 Installation Guide

Follow these steps to set up the application from scratch:

### 1. Clone the Repository


### 2. Install Node Dependencies

```bash
npm install
```

### 3. Set Up Python Environment

#### For macOS (Automated Script):

We provide a convenience script for macOS users:

```bash
# Make the script executable
chmod +x install-python.sh

# Run the installation script
./install-python.sh
```

This script will:
- Install Python 3.9 via Homebrew
- Install portaudio (required for audio processing)
- Create a virtual environment
- Install all required Python packages

#### For macOS (Manual Setup):

```bash
# Install Python 3.9 if not already installed
brew install python@3.9
brew install portaudio

# Create and activate a virtual environment
python3.9 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

#### For Windows:

```bash
# Install Python 3 if not already installed (download from python.org)

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

#### For Linux:

```bash
# Install Python 3 if not already installed
sudo apt update
sudo apt install python3 python3-venv
sudo apt install portaudio19-dev python3-dev

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Set Up Environment Variables

Create a .env file in the project root:

```
VITE_PUBLIC_SCALE_URL="https://www.remotasks.com"
VITE_PUBLIC_SCALE_BACKEND_URL="https://dashboard.scale.com"
```

## 🚀 Running the Application

### Development Mode

Run the application in development mode with hot reloading:

```bash
# Make sure the Python virtual environment is active
source venv/bin/activate  # On macOS/Linux
# or
.\venv\Scripts\activate  # On Windows

# Start the application
npm start
```

This will:
1. Start the Electron application
2. Launch the development server for the renderer
3. Enable hot reloading for UI changes

### Production Build

To create a distributable package:

```bash
npm run make
```

This command:
1. Builds the application
2. Packages it for your platform
3. Runs the `bundle-python.js` script to include Python dependencies

The packaged application will be available in the out directory.

## 🧪 Testing Guide

Follow these steps to test the main features of the application:

### 1. Initial Launch Test

1. Run `npm start`
2. The application should launch with the login screen
3. **Expected**: Login interface should appear with the Remotasks logo

### 2. Video Upload Test

1. Click on "Sign in with Remotasks" (if in development mode, it will bypass authentication)
2. Navigate to the Videos section
3. Click the "Upload Videos" button
4. Select 2-4 video files from your system
5. **Expected**: Videos should appear in the "Unpaired Videos" tab

### 3. Video Processing Test

1. Select one or more videos from the "Unpaired Videos" tab
2. Click the "Process" button that appears in the video card
3. **Expected**: 
   - Videos should move to the "Processing Videos" tab
   - Progress indicators should appear
   - After processing completes, videos should move to "Processed Videos"
   - Log output should show processing steps with emojis

### 4. Video Pairing Test

1. In the "Unpaired Videos" tab, drag one video onto another
2. **Expected**: Videos should be paired and appear in the "Paired Videos" tab

### 5. Searching and Filtering Test

1. Use the search bar to search for a specific video by name
2. Try sorting videos using the dropdown (by date, size, etc.)
3. **Expected**: Videos should filter and sort correctly

### 6. Python Integration Test

1. Process a video to verify Python integration is working
2. Check the logs for emojis indicating successful Python script execution
3. **Expected**: You should see logs showing Python script execution and no errors

## 🏗 Architecture

Robotics Contributors follows a modular architecture:

- **Main Process** (`main.ts`): Core Electron process that manages application lifecycle
- **Renderer Process** (`App.tsx`): React frontend for user interface
- **Service Layer**: Handles video processing, metadata extraction, and file operations
  - `MetaGenerator`: Extracts metadata from videos using Python scripts
  - `MediaProcessor`: Processes videos to create samples using Python
  - `VideoMatcher`: Matches related videos based on metadata
- **Worker Threads**: Handle CPU-intensive tasks to keep the UI responsive
- **Python Integration**: Leverages Python scripts for advanced video processing with OpenCV

## 🧠 Technical Decisions

### Electron + React

We chose Electron with React for several reasons:
- **Cross-platform compatibility**: Works on Windows, macOS, and Linux
- **Rich UI capabilities**: React provides a powerful, component-based UI framework (using React 19.0)
- **Developer experience**: Hot reloading and modern JS tooling improve development speed
- **Vite-based bundling**: Using @electron-forge/plugin-vite for faster builds

### Python Integration for Video Processing

Rather than using Node.js for video processing:
- **Performance**: Python libraries like OpenCV provide optimized video processing
- **Feature richness**: Python's ecosystem offers more advanced video analysis capabilities
- **Worker Threads**: Offloaded Python processing to worker threads to keep UI responsive
- **Audio processing**: Using libraries like audalign and pydub for audio analysis and processing

### UI Framework Choices

- **Headless UI**: Using @headlessui/react for accessible UI components
- **Framer Motion**: For smooth animations and transitions
- **TailwindCSS**: For utility-first styling
- **React Query**: For efficient server state management and data fetching

### File-based Storage vs. Database

We opted for file-based storage using Electron Store:
- **Simplicity**: No database setup required for end users
- **Performance**: Faster for small to medium datasets
- **Portability**: Easier distribution and installation

## 🔍 Troubleshooting

### Common Issues

#### Python Not Found

**Symptom**: Error messages about Python executable not being found

**Solution**: 
1. Verify Python is installed: `python --version` or `python3 --version`
2. Check that the virtual environment is active: Run `source venv/bin/activate` (macOS/Linux) or `.\venv\Scripts\activate` (Windows)
3. For macOS users: Ensure you're using Python 3.9 (verify with `python3.9 --version`)
4. Check if the appropriate Python path is being detected in the logs

#### Python Dependencies Issues

**Symptom**: Errors about missing Python modules

**Solution**:
1. Verify all requirements are installed: `pip list`
2. Try reinstalling dependencies: `pip install -r requirements.txt`
3. For audio processing issues on macOS, ensure portaudio is installed: `brew install portaudio`
4. For Linux users, ensure you have the dev packages: `sudo apt install portaudio19-dev python3-dev`

#### Video Processing Fails

**Symptom**: Videos fail to process with OpenCV errors

**Solution**:
1. Check OpenCV is properly installed: `pip list | grep opencv`
2. Verify video files are in supported formats (MP4, AVI, MOV, MKV)
3. Check application logs for specific error messages
4. Try processing smaller video files first to isolate the issue

#### Authentication Issues

**Symptom**: Can't log in or authentication errors

**Solution**:
1. Verify internet connection
2. Check .env file has correct URL values
3. In development mode, authentication is simulated

#### Build or Packaging Issues

**Symptom**: Problems running `npm run make`

**Solution**:
1. Make sure all dependencies are installed: `npm install`
2. Remove the out directory and try again: `rm -rf out && npm run make`
3. Check the console for specific error messages during build
4. Verify the `bundle-python.js` script is working properly

### Getting Help

For additional help:
- Check the console logs (View > Toggle Developer Tools)
- Review the application logs in the user data directory
- Examine Python script output in the worker thread logs

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Authors  

- **Matias Del Carlo** - [matias.del@scale.com](mailto:matias.del@scale.com)  
- **Fran Espeche** - [fran.espeche@scale.com](mailto:fran.espeche@scale.com)  
