import os
import sys
from pathlib import Path

def get_ffmpeg_path():
    """
    Returns the appropriate FFmpeg executable path based on platform and environment.
    
    Returns:
        Path: The path to the FFmpeg executable
    """
    # Check if we're in development or production
    is_packaged = getattr(sys, 'frozen', False)
    platform = sys.platform
    
    # Base directory is different in dev vs production
    if is_packaged:
        # For packaged app
        if platform == 'darwin':  # macOS
            # In macOS app bundle: YourApp.app/Contents/Resources/ffmpeg-mac
            base_dir = Path(sys.executable).parent.parent / "Resources"
            return base_dir / "ffmpeg-mac"
        elif platform == 'win32':  # Windows
            # In Windows: app directory/ffmpeg/ffmpeg.exe
            base_dir = Path(sys.executable).parent / "resources"
            return base_dir / "ffmpeg" / "ffmpeg.exe"
        else:  # Linux
            base_dir = Path(sys.executable).parent / "resources"
            return base_dir / "ffmpeg" / "ffmpeg-linux"
    else:
        # For development environment
        # Find project root (where the python folder is)
        project_root = Path(__file__).resolve().parent.parent.parent
        
        if platform == 'darwin':  # macOS
            return project_root / "ffmpeg" / "ffmpeg-mac"
        elif platform == 'win32':  # Windows
            return project_root / "ffmpeg" / "ffmpeg.exe"
        else:  # Linux
            return project_root / "ffmpeg" / "ffmpeg-linux"