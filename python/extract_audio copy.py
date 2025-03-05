#!/usr/bin/env python
"""
Python script to extract audio from video files.
"""
import sys
import os
import time
import json
import subprocess

def extract_audio(video_path, output_path):
    """Extract audio from video file using ffmpeg."""
    print(f"Starting audio extraction from {video_path} to {output_path}")
    start_time = time.time()
    
    # Make sure the output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    try:
        # Configure ffmpeg command for audio extraction
        ffmpeg_command = [
            'ffmpeg',
            '-y',                 # Overwrite output files without asking
            '-hwaccel', 'auto',   # Hardware acceleration
            '-i', video_path,     # Input file
            '-vn',                # No video
            '-acodec', 'libmp3lame',  # Audio codec
            '-ab', '128k',        # Audio bitrate
            '-threads', '8',      # Use multiple threads
            output_path           # Output file
        ]
        
        # Run ffmpeg command
        process = subprocess.Popen(
            ffmpeg_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Get output and error information
        _, stderr = process.communicate()
        
        # Check if process was successful
        if process.returncode != 0:
            print(f"Error in ffmpeg process: {stderr}", file=sys.stderr)
            sys.exit(1)
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to ms
        
        print(f"Audio extraction completed in {processing_time:.2f}ms")
        print(output_path)  # Output the path to the extracted audio file
        return output_path
        
    except Exception as e:
        print(f"Error extracting audio: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python extract_audio.py <video_path> <output_path>", file=sys.stderr)
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_path = sys.argv[2]
    
    extract_audio(video_path, output_path)