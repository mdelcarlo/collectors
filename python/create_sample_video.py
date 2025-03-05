#!/usr/bin/env python
"""
Python script to create a sample video by:
1. Extracting audio from input video
2. Generating thumbnails from input video
3. Creating a new video from thumbnails and extracted audio
"""
import argparse
import sys
import os
import time
import json
from extract_audio import extract_audio
from generate_thumbnails import generate_thumbnails
from create_video_from_thumbs import create_video
import os
import shutil

# Helpers
def remove_directory(path):
    if os.path.exists(path):
        shutil.rmtree(path)

def parse_args():
    parser = argparse.ArgumentParser(description="Create a sample video from thumbnails.")
    parser.add_argument(
        "-i",
        "--input",
        type=str,
        help="Path to the input video file",
        required=True,
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        help="Path to the output video file",
        required=True,
    )
    parser.add_argument(
        "-w",
        "--width",
        type=int,
        default=320,
        help="Target width for the generated thumbnails",
    )
    parser.add_argument(
        "--max_workers",
        type=int,
        help="Number of worker processes for thumbnail generation",
        default=None
    )
    parser.add_argument(
        "--temp-dir",
        type=str,
        default="temp",
        help="Temp directory for working files",
        required=False,
    )
    parser.add_argument(
        "--codec",
        type=str,
        default="libx264",
        help="Video codec for output",
    )
    return parser.parse_args()

def main():
    args = parse_args()
    
    start_time = time.time()

    # Create working directory
    os.makedirs(args.temp_dir, exist_ok=True)
    
    try:
        # Extract audio
        audio_dir = os.path.join(args.temp_dir, "audio")
        os.makedirs(audio_dir, exist_ok=True)
        extract_audio(args.input, audio_dir)
        
        # Generate thumbnails
        thumbs_dir = os.path.join(args.temp_dir, "thumbs")
        os.makedirs(thumbs_dir, exist_ok=True)
        thumbnail_files = generate_thumbnails(
            args.input,
            thumbs_dir,
        )
        
        # Convert thumbnail_files list to JSON string for create_video
        # thumbnail_files_json = json.dumps(thumbnail_files)
        
        # Create sample video from thumbnails
        create_video(thumbs_dir,
                     audio_dir + "/audio.mp3", args.output, args.codec)

        # Remove temp directory
        remove_directory(args.temp_dir)
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to ms
        print(f"Sample video created successfully: {args.output}")
        print("Processing time: {:.2f} ms".format(processing_time))
        
    except Exception as e:
        print(f"Error creating sample video: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()