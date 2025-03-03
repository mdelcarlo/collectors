#!/usr/bin/env python
"""
Python script to extract audio from video files using moviepy.
"""
import sys
import os
import time
import json
from moviepy.video.io.VideoFileClip import VideoFileClip

def extract_audio(video_path, output_path):
    """Extract audio from video file using moviepy."""
    print(f"Starting audio extraction from {video_path} to {output_path}")
    start_time = time.time()
    
    # Make sure the output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    try:
        # Load the video file
        video_clip = VideoFileClip(video_path)
        
        # Extract the audio
        audio_clip = video_clip.audio
        
        # Write the audio to a file
        audio_clip.write_audiofile(output_path)
        
        # Close the clips
        video_clip.close()
        audio_clip.close()
        
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