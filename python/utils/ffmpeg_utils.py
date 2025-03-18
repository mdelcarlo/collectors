import os
import sys
import logging
from pathlib import Path
import static_ffmpeg

static_ffmpeg.add_paths()

# Set up logger
logger = logging.getLogger("FFmpegUtils")
logger.setLevel(logging.INFO)

# Create console handler
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    formatter = logging.Formatter("%(message)s")
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

def is_running_in_packaged_app():
    """
    Determines if the Python code is running from a packaged Electron app.
    
    Returns:
        bool: True if running from packaged app, False if in development
    """
    # Check for environment variable (can be set by Electron when launching Python)
    if os.environ.get('ELECTRON_PACKAGED_APP') == '1':
        return True
    
    # Check executable path for patterns that indicate packaged app
    executable_path = Path(sys.executable)
    
    # For macOS, check if we're in a .app bundle structure
    if sys.platform == 'darwin' and '.app/Contents/Resources' in str(executable_path):
        return True
    
    # For Windows/Linux, check if we're in an Electron app structure
    if 'resources' in str(executable_path) and ('app.asar' in str(executable_path) or 'app' in str(executable_path)):
        return True
    
    # Another approach: check if running from a specific location in your packaged app
    app_folder = executable_path.parent
    if (app_folder / "resources").exists() or (app_folder / "Resources").exists():
        return True
    
    return False

def get_ffmpeg_path():
    """
    Returns the appropriate FFmpeg executable path based on platform and environment.
    
    Returns:
        Path: The path to the FFmpeg executable
    """
    # Check if we're in development or production
    is_packaged = is_running_in_packaged_app()
    platform = sys.platform
    
    logger.info(f"🔍 Detecting FFmpeg path for {platform} in {'📦 packaged' if is_packaged else '🛠️ development'} mode")
    logger.info(f"📍 Current executable: {sys.executable}")
    
    # Base directory is different in dev vs production
    if is_packaged:
        # For packaged app
        if platform == 'darwin':  # macOS
          # Start with the executable path
            exe_path = Path(sys.executable)
            
            # If 'venv' is in the path, we need to adjust accordingly
            if 'venv' in str(exe_path):
                # Go up until we find Contents/Resources
                current = exe_path.parent
                while current.name != 'Resources' or current.parent.name != 'Contents':
                    current = current.parent
                    # Safety check to prevent infinite loop
                    if str(current) == '/':
                        logger.error("❌ Could not find Contents/Resources in path")
                        break
                base_dir = current
            else:
                # Standard approach - go up two levels from executable to Contents
                base_dir = exe_path.parent.parent.parent
                
            ffmpeg_path = base_dir / "ffmpeg-mac"
            logger.info(f"🍎 macOS: Using bundled FFmpeg at {ffmpeg_path}")
        elif platform == 'win32':  # Windows
            # In Windows: app directory/ffmpeg/ffmpeg.exe
            base_dir = Path(sys.executable)
            while base_dir.name != 'resources':
                base_dir = base_dir.parent
                # Safety check to prevent infinite loop
                if str(base_dir) == '/':
                    logger.error("❌ Could not find resources in path")
                    break
            ffmpeg_path = base_dir / "ffmpeg.exe"
            logger.info(f"🪟 Windows: Using bundled FFmpeg at {ffmpeg_path}")
        else:  # Linux
            base_dir = Path(sys.executable).parent / "resources"
            ffmpeg_path = base_dir / "ffmpeg-linux"
            logger.info(f"🐧 Linux: Using bundled FFmpeg at {ffmpeg_path}")
    else:
        # For development environment
        # Find project root (where the python folder is)
        project_root = Path(__file__).resolve().parent.parent.parent
        
        if platform == 'darwin':  # macOS
            ffmpeg_path = project_root / "ffmpeg" / "ffmpeg-mac"
            logger.info(f"🍎 macOS: Looking for FFmpeg at {ffmpeg_path}")
        elif platform == 'win32':  # Windows
            ffmpeg_path = project_root / "ffmpeg" / "ffmpeg.exe"
            logger.info(f"🪟 Windows: Looking for FFmpeg at {ffmpeg_path}")
        else:  # Linux
            ffmpeg_path = project_root / "ffmpeg" / "ffmpeg-linux"
            logger.info(f"🐧 Linux: Looking for FFmpeg at {ffmpeg_path}")
    
    # Verify FFmpeg exists
    if ffmpeg_path.exists():
        logger.info(f"✅ FFmpeg found at {ffmpeg_path}")
    else:
        logger.error(f"❌ FFmpeg not found at {ffmpeg_path}")
        logger.warning(f"⚠️ Please install FFmpeg or check the path configuration")
    
    return ffmpeg_path
