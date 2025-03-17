# build_python_executables.py
import os
import subprocess
import platform
import shutil
import sys

def build_executables(force_universal2=False):
    """Build PyInstaller executables for the current platform
    
    Args:
        force_universal2 (bool): If True, attempt to build universal2 binaries on macOS
                                 even though it may fail with non-universal Python
    """
    system = platform.system().lower()
    
    # Define scripts to be packaged
    scripts = [
        "python/extract_video_info.py",
        "python/create_sample_video.py"
    ]
    
    # Create platform-specific output directory
    output_dir = os.path.join("packaged_python", system)
    os.makedirs(output_dir, exist_ok=True)
    
    # Clean previous builds
    for item in os.listdir(output_dir):
        path = os.path.join(output_dir, item)
        if os.path.isfile(path):
            os.remove(path)
    
    # Make sure spec files don't interfere with builds
    for script in scripts:
        script_name = os.path.basename(script).split('.')[0]
        spec_file = f"{script_name}.spec"
        if os.path.exists(spec_file):
            os.remove(spec_file)
    
    # Clean build directories
    build_dir = os.path.abspath("build")
    if os.path.exists(build_dir):
        try:
            shutil.rmtree(build_dir)
            print(f"Cleaned build directory: {build_dir}")
        except (OSError, PermissionError) as e:
            print(f"Warning: Could not clean build directory: {e}")
            # Try to continue anyway
    
    # Define common hidden imports based on requirements.txt
    common_imports = [
        "--hidden-import", "moviepy.audio.fx.all",
        "--hidden-import", "cv2",
        "--hidden-import", "numpy",
        "--hidden-import", "audalign",
        "--hidden-import", "pydub",
        "--hidden-import", "moviepy",
        "--hidden-import", "pip",
        # project-specific modules
        "--hidden-import", "test_env",
        "--hidden-import", "utils",
        "--hidden-import", "utils.__init__",
        "--hidden-import", "utils.ENUMS",
        "--hidden-import", "utils.extract_audio",
        "--hidden-import", "utils.generate_thumbnails",
        "--hidden-import", "utils.create_video_from_thumbs",
        "--hidden-import", "utils.ffmpeg_utils",
        "--hidden-import", "generators",
        "--hidden-import", "generators.downsamplers.__init__",
        "--hidden-import", "generators.downsamplers.base",
        "--hidden-import", "generators.downsamplers.cv2_downsampler",
        "--hidden-import", "generators.downsamplers.ffmpeg_downsampler",
    ]


    for script in scripts:
        script_name = os.path.basename(script).split('.')[0]
        
        # Command line options for PyInstaller
        cmd = [
            "pyinstaller",
            "--onefile",  # Create a single executable
            "--distpath", output_dir,  # Output directory
            "--name", script_name,  # Name of the output executable
            "--noconfirm",  # Don't ask for confirmation
        ]
        
        # Add common hidden imports
        cmd.extend(common_imports)
        
        # Add platform-specific options
        if system == "darwin":
    # Set minimum macOS version (e.g., 10.15 for Catalina)
            os.environ['MACOSX_DEPLOYMENT_TARGET'] = '10.15'
            print(f"Setting MACOSX_DEPLOYMENT_TARGET to {os.environ['MACOSX_DEPLOYMENT_TARGET']}")

            # Check if we're using Homebrew Python on Apple Silicon
            is_homebrew_arm = "/opt/homebrew/" in sys.executable
            
            # Only add universal2 flag if specifically requested
            if force_universal2:
                if is_homebrew_arm:
                    print("WARNING: Building universal2 with Homebrew Python on Apple Silicon may fail.")
                    print("         Homebrew Python is typically arm64-only, not a universal binary.")
                cmd.append("--target-architecture")
                cmd.append("universal2")
            else:
                print(f"Building for native architecture on {platform.machine()}")
                
        elif system == "win32" or system == "windows":
            system = "win32"  # Normalize Windows naming
        
        cmd.append(script)
        
        print(f"Building {script_name} for {system}...")
        try:
            subprocess.run(cmd, check=True)
            print(f"Successfully built {script_name}")
        except subprocess.CalledProcessError as e:
            print(f"Error building {script_name}: {e}")
            if system == "darwin" and "--target-architecture" in cmd:
                print("\nERROR: Failed to build universal2 binary.")
                print("This is likely because your Python installation is not a universal2/fat binary.")
                print("Solutions:")
                print("1. Run again without the universal2 flag to build for your native architecture only.")
                print("2. Use a universal2 Python installation (not from Homebrew).")
                print("   The official Python.org installer provides universal2 builds.")
            raise

if __name__ == "__main__":
    # Set to True only if you need universal2 binaries and have the right Python setup
    build_executables(force_universal2=False)