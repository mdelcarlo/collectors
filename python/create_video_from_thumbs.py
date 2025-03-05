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
    print(thumbnails_input, audio_path, output_path, codec)
    
    # Make sure output directory exists
    os.makedirs(output_path, exist_ok=True)
    filepath = os.path.join(output_path, 'sample_video.mp4')
    try:
        print(output_path)
        # Get thumbnail files
        if os.path.isfile(thumbnails_input) and thumbnails_input.lower().endswith('.json'):
            print(1)
            # Load thumbnail paths from JSON file
            with open(thumbnails_input, 'r') as f:
                thumbnail_files = json.load(f)
        elif os.path.isdir(thumbnails_input):
            print(2)
            # Find all thumbnail files in directory
            thumbnail_files = sorted(glob.glob(os.path.join(thumbnails_input, '*.png')))
        else:
            print(3)
            # Assume it's a string containing JSON
            thumbnail_files = json.loads(thumbnails_input)

        if not thumbnail_files:
            raise ValueError("No thumbnail files found")

        print(f"Found {len(thumbnail_files)} thumbnail files")
        
        # Load audio
        audio_clip = AudioFileClip(audio_path)
        audio_duration = audio_clip.duration
        
        # Calculate how long each frame should be displayed
        # This ensures frames are distributed evenly across the entire audio duration
        num_frames = len(thumbnail_files)
        
        # Create an array of frame durations that will sum to audio_duration
        frame_durations = np.full(num_frames, audio_duration / num_frames)
        
        print(f"Audio duration: {audio_duration:.2f}s, Each frame will display for {frame_durations[0]:.2f}s")
        
        # Create video clip from image sequence with specified durations for each frame
        print('Creating image sequence clip..')
        video_clip = ImageSequenceClip(thumbnail_files, durations=frame_durations.tolist())
        
        # Add audio to video clip
        video_clip.audio = audio_clip
        
        # Verify durations match
        print(f"Video duration: {video_clip.duration:.2f}s, Audio duration: {audio_duration:.2f}s")
        
        # Write the result to a file
        print(f"Writing video to {filepath}...")
        video_clip.write_videofile(
            filepath,
            codec=codec,
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True
        )
        
        # Close the clips
        video_clip.close()
        audio_clip.close()
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to ms
        
        print(f"Video creation completed in {processing_time:.2f}ms")
        print(filepath)  # Output the path to the created video file
        return filepath
        
    except Exception as e:
        print(f"Error creating video: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    args = parser.parse_args()
    
    thumbnails_input = args.thumbnails
    audio_path = args.audio
    output_path = args.output
    codec = args.codec

    create_video(thumbnails_input, audio_path, output_path, codec)