import os
import time
from .extract_audio import extract_audio_single
from .extract_audio import extract_audio_multiple
from .extract_audio import get_audio_metadata

def generate_sample_video_filename(input_filepath, fps, width, extension) -> str:
    base_name = os.path.splitext(os.path.basename(input_filepath))[0]
    date_str = time.strftime('%Y%m%d')
    filename = f"{date_str}-{fps}fps-{width}w-{base_name}"
    return filename + extension


__all__ = ["get_audio_metadata","extract_audio_single", 'extract_audio_multiple', "generate_sample_video_filename"]
