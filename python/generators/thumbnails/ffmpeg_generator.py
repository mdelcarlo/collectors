import os
import subprocess
import json
import numpy as np
from typing import List, Tuple
import tempfile
import shutil
from .base import BaseThumbnailGenerator, Frame

class FFmpegThumbnailGenerator(BaseThumbnailGenerator):
    def _get_video_metadata(self, video_path: str) -> Tuple[float, float]:
        """Get video duration and fps using ffprobe."""
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=duration,r_frame_rate',
            '-of', 'json',
            video_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            data = json.loads(result.stdout)
            
            # Extract duration
            duration = float(data['streams'][0].get('duration', 0))
            
            # Extract fps (could be in fraction format like "30000/1001")
            fps_str = data['streams'][0].get('r_frame_rate', '0/0')
            if '/' in fps_str:
                num, den = map(float, fps_str.split('/'))
                fps = num / den if den else 0
            else:
                fps = float(fps_str)
                
            return duration, fps
        except Exception as e:
            raise ValueError(f"Could not extract metadata from {video_path}: {str(e)}")

    def _generate_frame_data(self, video_path: str, duration: float, output_dir: str, base_name: str) -> List[Tuple[Frame, str, int]]:
        temp_dir = tempfile.mkdtemp()
        temp_video = os.path.join(temp_dir, "temp_video.mp4")
        
        # Create a smaller, pre-scaled video file for faster processing
        cmd = [
            str(ffmpeg_path),
            '-i', video_path,
            '-vf', f'scale={self.target_width}:-1',  # Pre-scale to target width
            '-c:v', 'libx264',
            '-crf', '23',
            '-preset', 'ultrafast',  # Fastest encoding
            '-an',  # No audio
            '-y',   # Overwrite
            temp_video
        ]
        
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Calculate frame positions
        num_thumbnails = int(duration * self.output_fps)
        timestamps = np.linspace(0, duration, num=num_thumbnails, endpoint=False)
        
        frame_data = []
        
        # Use FFmpeg to extract all frames at once
        # This is much faster than extracting one by one
        for i, t in enumerate(timestamps):
            output_path = os.path.join(output_dir, f"{base_name}-{i:03d}.png")
            frame_data.append((temp_dir, temp_video, t, output_path, self.target_width))
            
        return frame_data

    def _process_single_frame(self, frame_data: Tuple[str, str, float, str, int]) -> str:
        """Process a single frame - extract it from the temp video."""
        temp_dir, temp_video, timestamp, output_path, target_width = frame_data
        
        try:
            # Extract single frame at timestamp
            cmd = [
                str(ffmpeg_path),
                '-ss', str(timestamp),
                '-i', temp_video,  # Use the pre-scaled temporary video!
                '-vframes', '1',
                '-q:v', '2',
                '-y',
                output_path
            ]
            
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Clean up the temp directory when the last frame is processed
            # We can't know for sure when that is, so we use a crude approach
            if timestamp == 0:
                try:
                    # Try to remove it, but it might fail if other processes are still using it
                    shutil.rmtree(temp_dir, ignore_errors=True)
                except:
                    pass
                    
            return output_path
        except Exception as e:
            print(f"Error processing frame: {e}")
            return None
