#!/usr/bin/env python
"""
Python script to create a video from thumbnails and audio using MoviePy.
"""
import argparse
import sys
import os
import time
import json
from moviepy.video.io.ImageSequenceClip import ImageSequenceClip
from moviepy.audio.io.AudioFileClip import AudioFileClip
import glob
import numpy as np

parser = argparse.ArgumentParser(description="Video creation from thumbnails and audio.")
parser.add_argument(
    "-t",
    "--thumbnails",
    type=str,
    help="Path to the thumbnails directory or JSON file containing thumbnail paths",
    required=True,
)
parser.add_argument(
    "-a",
    "--audio",
    type=str,
    help="Path to the audio file",
    required=True,
)
parser.add_argument(
    "-o",
    "--output",
    type=str,
    help="Path to the output video file (include extension, e.g., .mp4)",
    required=True,
)
parser.add_argument(
    "-c",
    "--codec",
    type=str,
    default="libx264",
    help="Video codec (default: libx264)",
    required=False,
)

def create_video(thumbnails_input, audio_path, output_path, codec="libx264"):
    """Create a video from thumbnails and audio."""
    print(f"Starting video creation with thumbnails and audio: {audio_path}")
    start_time = time.time()
    
    try:
        # Get thumbnail files
        if isinstance(thumbnails_input, str):
            if os.path.isfile(thumbnails_input) and thumbnails_input.lower().endswith('.json'):
                # Load thumbnail paths from JSON file
                with open(thumbnails_input, 'r') as f:
                    thumbnail_files = json.load(f)
            elif os.path.isdir(thumbnails_input):
                # Find all thumbnail files in directory
                thumbnail_files = sorted(glob.glob(os.path.join(thumbnails_input, '*.png')))
            else:
                # Parse JSON string
                try:
                    thumbnail_files = json.loads(thumbnails_input)
                    print(f"Successfully parsed JSON: {len(thumbnail_files)} thumbnails found")
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON string for thumbnails: {e}")
        else:
            # Already a list of thumbnails
            thumbnail_files = thumbnails_input

        if not thumbnail_files:
            raise ValueError("No thumbnail files found")

        print(f"Found {len(thumbnail_files)} thumbnail files")
        
        # Verify thumbnails exist and are readable
        for i, thumb in enumerate(thumbnail_files):
            if not os.path.isfile(thumb):
                raise ValueError(f"Thumbnail file not found: {thumb}")
            if i < 5:  # Print first few for debugging
                print(f"Thumbnail {i}: {thumb}")
        
        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        # Load audio
        audio_clip = AudioFileClip(audio_path)
        audio_duration = audio_clip.duration
        
        # Calculate frame durations
        num_frames = len(thumbnail_files)
        frame_durations = np.full(num_frames, audio_duration / num_frames)
        
        print(f"Audio duration: {audio_duration:.2f}s, Each frame will display for {frame_durations[0]:.2f}s")
        
        # Create video clip from image sequence
        video_clip = ImageSequenceClip(thumbnail_files, durations=frame_durations.tolist())
        video_clip.audio = audio_clip
        
        # Write the result to a file
        print(f"Writing video to {output_path}...")
        video_clip.write_videofile(
            output_path,
            codec=codec,
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True,
            logger=None  # Less verbose output
        )
        
        # Close the clips
        video_clip.close()
        audio_clip.close()
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000
        
        print(f"Video creation completed in {processing_time:.2f}ms")
        print(output_path)
        return output_path
        
    except Exception as e:
        print(f"Error creating video: {str(e)}", file=sys.stderr)
        raise

if __name__ == "__main__":
    args = parser.parse_args()
    
    thumbnails_input = args.thumbnails
    audio_path = args.audio
    output_path = args.output
    codec = args.codec
    
    create_video(thumbnails_input, audio_path, output_path, codec)