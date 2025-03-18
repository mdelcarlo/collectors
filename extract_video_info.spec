# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['python/extract_video_info.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['moviepy.audio.fx.all', 'cv2', 'numpy', 'audalign', 'pydub', 'moviepy', 'pip', 'test_env', 'utils', 'utils.__init__', 'utils.ENUMS', 'utils.extract_audio', 'utils.generate_thumbnails', 'utils.create_video_from_thumbs', 'utils.ffmpeg_utils', 'generators', 'generators.downsamplers.__init__', 'generators.downsamplers.base', 'generators.downsamplers.cv2_downsampler', 'generators.downsamplers.ffmpeg_downsampler'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='extract_video_info',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
