
import sys
print("Python version:", sys.version)
print("Python executable:", sys.executable)
print("Testing imports:")
try:
    import pip
    print(f"✓ {pkgName} imported successfully")
except ImportError as e:
    print(f"✗ {pkgName} import failed: {e}")
try:
    import opencv_python
    print(f"✓ {pkgName} imported successfully")
except ImportError as e:
    print(f"✗ {pkgName} import failed: {e}")
try:
    import moviepy
    print(f"✓ {pkgName} imported successfully")
except ImportError as e:
    print(f"✗ {pkgName} import failed: {e}")
try:
    import audalign
    print(f"✓ {pkgName} imported successfully")
except ImportError as e:
    print(f"✗ {pkgName} import failed: {e}")
try:
    import pydub
    print(f"✓ {pkgName} imported successfully")
except ImportError as e:
    print(f"✗ {pkgName} import failed: {e}")
try:
    import numpy
    print(f"✓ {pkgName} imported successfully")
except ImportError as e:
    print(f"✗ {pkgName} import failed: {e}")
