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
from typing import TypedDict

# Args #
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
parser.add_argument(
    "-m",
    "--metadata",
    type=json.loads,
    default=None,
    help="Metadata to add to the video file (JSON string)",
    required=False,
)

# Types #
class CreateVideoResults(TypedDict):
    elapsed_time: float
    output_path: str

# Functions #
def create_video_from_thumbs(thumbnails_input, audio_path, output_path, codec="libx264",
                 filename="sample_video.mp4", metadata=None) -> CreateVideoResults:
    """Create a video from thumbnails and audio."""

    print(f"Starting video creation with thumbnails and audio: {audio_path}")
    start_time = time.time()
    
    # Make sure output directory exists
    os.makedirs(output_path, exist_ok=True)
    try:
        # Get thumbnail files
        if os.path.isfile(thumbnails_input) and thumbnails_input.lower().endswith('.json'):
            # Load thumbnail paths from JSON file
            with open(thumbnails_input, 'r') as f:
                thumbnail_files = json.load(f)
        elif os.path.isdir(thumbnails_input):
            # Find all thumbnail files in directory
            thumbnail_files = sorted(glob.glob(os.path.join(thumbnails_input, '*.png')))
        else:
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
        thumbs_amount = len(thumbnail_files)
        fps = thumbs_amount / audio_duration
        
        print(f"Audio duration: {audio_duration:.2f}s, Using FPS: {fps:.2f}")

        
        # Create video clip from image sequence with specified durations for each frame
        print('Creating image sequence clip..')
        video_clip = ImageSequenceClip(thumbnail_files, fps)
        
        # Add audio to video clip
        video_clip.audio = audio_clip
        
        # Verify durations match
        print(f"Video duration: {video_clip.duration:.2f}s, Audio duration: {audio_duration:.2f}s")
        
        # Write the result to a file
        filepath = os.path.join(output_path, filename)
        print(f"Writing video to {filepath}...")

        checkpoint = time.time()

        print(f'Time taken so far: {(checkpoint - start_time) * 1000}')

        # add metadata
        ffmpeg_metadata = []
        if metadata is not None:
            for key, value in metadata.items():
                ffmpeg_metadata.extend(['-metadata', f'{key}={value}'])

        video_clip.write_videofile(
            filepath,
            codec=codec,
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True,
            ffmpeg_params=ffmpeg_metadata if ffmpeg_metadata else None
        )

        # Close the clips
        video_clip.close()
        audio_clip.close()
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to ms
        
        print(f"Video creation completed in {processing_time:.2f}ms")
        return { "elapsed_time": processing_time, "output_path": filepath}
        
    except Exception as e:
        print(f"Error creating video: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    args = parser.parse_args()
    
    thumbnails_input = args.thumbnails
    audio_path = args.audio
    output_path = args.output
    codec = args.codec
    metadata = args.metadata
    
    create_video_from_thumbs(thumbnails_input, audio_path, output_path, codec)
