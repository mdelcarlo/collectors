from abc import ABC, abstractmethod
import os
import time
import concurrent.futures
from typing import List, Dict, Tuple, Any

Frame = Any  # Type alias for frame data (could be numpy array or other format)

class BaseThumbnailGenerator(ABC):
    def __init__(self, output_fps: int, target_width: int):
        self.output_fps = output_fps
        self.target_width = target_width

    def generate_thumbnails(self, video_path: str, output_dir: str, base_name: str = "thumb", max_workers: int = None) -> Dict[str, float]:
        """Main thumbnail generation pipeline."""
        print(f"Starting thumbnail generation from {video_path}")
        start_time = time.time()
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Get video metadata
        duration, fps = self._get_video_metadata(video_path)
        print(f"Video duration: {duration:.2f} seconds, FPS: {fps:.2f}")
        
        # Generate frame data
        frame_data = self._generate_frame_data(video_path, duration, output_dir, base_name)
        
        # Process frames in parallel
        thumbnail_files = self._process_frames(frame_data, max_workers)
        
        elapsed_time = (time.time() - start_time) * 1000
        print(f"\nThumbnail generation completed in {elapsed_time:.2f}ms")
        print(f"Generated {len(thumbnail_files)} thumbnails")
        
        return {"elapsed_time": elapsed_time}

    def _process_frames(self, frame_data: List[Tuple[Frame, str, int]], max_workers: int) -> List[str]:
        """Process frames using a process pool."""
        thumbnail_files = []
        num_thumbnails = len(frame_data)
        
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            future_to_frame = {executor.submit(self._process_single_frame, data): i 
                             for i, data in enumerate(frame_data)}
            
            for i, future in enumerate(concurrent.futures.as_completed(future_to_frame)):
                thumbnail_path = future.result()
                thumbnail_files.append(thumbnail_path)
                
                progress = (i + 1) / num_thumbnails * 100
                print(f"\rProgress: {i+1}/{num_thumbnails} ({progress:.1f}%)", end="")
        
        return sorted(thumbnail_files)

    @abstractmethod
    def _get_video_metadata(self, video_path: str) -> Tuple[float, float]:
        """Return (duration, fps) for the video."""
        pass

    @abstractmethod
    def _generate_frame_data(self, video_path: str, duration: float, output_dir: str, base_name: str) -> List[Tuple[Frame, str, int]]:
        """Generate list of (frame, output_path, target_width) tuples."""
        pass

    @abstractmethod
    def _process_single_frame(self, frame_data: Tuple[Frame, str, int]) -> str:
        """Process a single frame and return the output path."""
        pass