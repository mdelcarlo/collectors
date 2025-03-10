import os
from typing import List, Tuple
import cv2
import numpy as np
from PIL import Image
from .base import BaseThumbnailGenerator, Frame

class CV2ThumbnailGenerator(BaseThumbnailGenerator):
    def _get_video_metadata(self, video_path: str) -> Tuple[float, float]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file {video_path}")
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        cap.release()
        
        return duration, fps

    def _generate_frame_data(self, video_path: str, duration: float, output_dir: str, base_name: str) -> List[Tuple[Frame, str, int]]:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        num_thumbnails = int(duration * self.output_fps)
        timestamps = np.linspace(0, duration, num=num_thumbnails, endpoint=False)
        
        frame_data = []
        for i, t in enumerate(timestamps):
            frame_number = int(t * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            if not ret:
                continue
                
            output_path = os.path.join(output_dir, f"{base_name}-{i:03d}.png")
            frame_data.append((frame, output_path, self.target_width))
            
        cap.release()
        return frame_data

    def _process_single_frame(self, frame_data: Tuple[Frame, str, int]) -> str:
        frame, output_path, target_width = frame_data
        img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        img.thumbnail((target_width, img.height * target_width // img.width))
        img.save(output_path, optimize=True)
        return output_path
