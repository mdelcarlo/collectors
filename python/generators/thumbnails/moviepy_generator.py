import os
import contextlib
import io
from typing import List, Tuple
from moviepy.video.io.VideoFileClip import VideoFileClip
import numpy as np
from PIL import Image
from .base import BaseThumbnailGenerator, Frame

class MoviePyThumbnailGenerator(BaseThumbnailGenerator):
    def _get_video_metadata(self, video_path: str) -> Tuple[float, float]:
        with contextlib.redirect_stdout(io.StringIO()):
            with VideoFileClip(video_path, audio=False) as clip:
                return clip.duration, clip.fps

    def _generate_frame_data(self, video_path: str, duration: float, output_dir: str, base_name: str) -> List[Tuple[Frame, str, int]]:
        num_thumbnails = int(duration * self.output_fps)
        timestamps = np.linspace(0, duration, num=num_thumbnails, endpoint=False)
        
        frame_data = []
        with contextlib.redirect_stdout(io.StringIO()):
            with VideoFileClip(video_path, audio=False, resize_algorithm="fast_bilinear") as clip:
                for i, t in enumerate(timestamps):
                    frame = clip.get_frame(t)
                    output_path = os.path.join(output_dir, f"{base_name}-{i:03d}.png")
                    frame_data.append((frame, output_path, self.target_width))
                    
        return frame_data

    def _process_single_frame(self, frame_data: Tuple[Frame, str, int]) -> str:
        frame, output_path, target_width = frame_data
        img = Image.fromarray(frame)
        img.thumbnail((target_width, img.height * target_width // img.width))
        img.save(output_path, optimize=True)
        return output_path
