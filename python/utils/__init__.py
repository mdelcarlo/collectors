import os
import time

def generate_sample_video_filename(input_filepath, fps, width, extension) -> str:
    base_name = os.path.splitext(os.path.basename(input_filepath))[0]
    date_str = time.strftime('%Y%m%d')
    filename = f"{date_str}-{fps}fps-{width}w-{base_name}"
    return filename + extension
