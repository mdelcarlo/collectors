import subprocess
import os
from generators.downsamplers.cv2_downsampler import BaseVideoDownsampler
from utils.ENUMS import DEFAULT_OUTPUT_FPS, DEFAULT_OUTPUT_WIDTH

class FFmpegDownsampler(BaseVideoDownsampler):
    def process(self, input_file, output_dir, output_filename, output_width=DEFAULT_OUTPUT_WIDTH, output_fps=DEFAULT_OUTPUT_FPS):
        """
        Downsample video to the given extension, fps and resolution width (maintaining aspect ratio)
        
        Args:
            input_file: Path to input video file
            output_dir: Path to output video file
            output_filename: Name of the output video file
            output_width: Width of output video
            output_fps: Frames per second of output video
        """
        if not os.path.exists(input_file):
            print(f"Error: Input file '{input_file}' does not exist")
            return

        os.makedirs(output_dir, exist_ok=True)

        # FFmpeg command to resize and downsample
        cmd = [
            str(ffmpeg_path),
            '-y',                         # Overwrite output file if it exists
            '-i', input_file,
            '-vf', f'fps={output_fps},scale={output_width}:-1',  # 1fps, width=320, height maintains aspect ratio
            '-c:v', 'libx264',            # Use H.264 codec
            '-crf', '23',                 # Reasonable quality
            '-preset', 'medium',          # Balance between encoding speed and compression
            '-c:a', 'aac',                # Audio codec
            '-b:a', '128k',               # Audio bitrate
            f'{output_dir}/{output_filename}'
        ]
        
        try:
            subprocess.run(cmd, check=True)
            print(f"Processing complete! Output saved to: {output_filename}")
            return output_filename

        except subprocess.CalledProcessError as e:
            print(f"Error during processing: {e}")
        except FileNotFoundError:
            print("Error: FFmpeg not found. Please install FFmpeg to use this script.")
