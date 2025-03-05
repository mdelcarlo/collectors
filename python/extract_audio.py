#!/usr/bin/env python
"""
Python script to extract audio from video files using moviepy.
"""
import sys
import os
import time
import json
from moviepy.video.io.VideoFileClip import VideoFileClip
import argparse

parser = argparse.ArgumentParser(description="Niftier running.")
parser.add_argument(
    "-i",
    "--input",
    type=str,
    help="Path to the input video file",
    required=True,
)
parser.add_argument(
    "-o",
    "--output_path",
    type=str,
    help="Path to the output audio file",
    required=True,
)

def extract_audio(video_path, output_path):
    """Extract audio from video file using moviepy."""
    print(f"Starting audio extraction from {video_path} to {output_path}")
    start_time = time.time()
    
    # Make sure the output directory exists
    os.makedirs(output_path, exist_ok=True)
    
    try:
        # Load the video file
        video_clip = VideoFileClip(video_path)
        
        # Extract the audio
        audio_clip = video_clip.audio
        
        # Write the audio to a file
        audio_clip.write_audiofile(output_path + "/audio.mp3")
        
        # Close the clips
        video_clip.close()
        audio_clip.close()
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to ms
        
        print(f"Audio extraction completed in {processing_time:.2f}ms")
        return output_path
        
    except Exception as e:
        print(f"Error extracting audio: {str(e)}", file=sys.stderr)
        sys.exit(1)

args = parser.parse_args()
if __name__ == "__main__":
    video_path = args.input
    output_path = args.output_path
    
    extract_audio(video_path, output_path)