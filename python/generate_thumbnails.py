#!/usr/bin/env python
"""
Python script to generate thumbnails from video files using MoviePy with performance optimizations.
"""
import sys
import os
import time
import json
import concurrent.futures
from moviepy.video.io.VideoFileClip import VideoFileClip
import numpy as np
from PIL import Image

def process_frame(frame_data):
    """Process a single frame to create a thumbnail."""
    frame, output_path, target_width = frame_data
    
    img = Image.fromarray(frame)
    img.thumbnail((target_width, img.height * target_width // img.width))  # Maintain aspect ratio
    img.save(output_path, optimize=True)
    
    return output_path

def generate_thumbnails(video_path, output_dir, base_name, target_width=320, max_workers=None):
    """Generate thumbnails from video file using MoviePy with multiprocessing."""
    print(f"Starting thumbnail generation from {video_path}")
    start_time = time.time()
    
    # Make sure the output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Load video file with reduced resolution for faster processing
        # Only load video without audio to save memory and processing time
        clip = VideoFileClip(video_path, audio=False, resize_algorithm="fast_bilinear")
        duration = clip.duration  # Duration in seconds
        
        print(f"Video duration: {duration:.2f} seconds")
        
        # Aim for about 10 thumbnails for every minute of video, with a minimum of 5
        num_thumbnails = max(5, int(duration / 6))
        
        # Precalculate all timestamps for frames to extract
        timestamps = np.linspace(0, duration, num=num_thumbnails, endpoint=False)
        
        # Prepare all frame data for processing
        frame_data = []
        for i, t in enumerate(timestamps):
            frame = clip.get_frame(t)
            output_path = os.path.join(output_dir, f"{base_name}-{i:03d}.png")
            frame_data.append((frame, output_path, target_width))
        
        # Close the clip as early as possible to free memory
        clip.close()
        
        thumbnail_files = []
        
        # Process frames in parallel
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            future_to_frame = {executor.submit(process_frame, data): i for i, data in enumerate(frame_data)}
            
            for i, future in enumerate(concurrent.futures.as_completed(future_to_frame)):
                thumbnail_path = future.result()
                thumbnail_files.append(thumbnail_path)
                
                # Progress reporting
                progress = (i + 1) / num_thumbnails * 100
                print(f"\rProgress: {i+1}/{num_thumbnails} ({progress:.1f}%)", end="")
        
        thumbnail_files.sort()  # Ensure consistent order
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to ms
        
        print(f"\nThumbnail generation completed in {processing_time:.2f}ms")
        print(f"Generated {len(thumbnail_files)} thumbnails")
        
        print(json.dumps(thumbnail_files))
        return thumbnail_files
        
    except Exception as e:
        print(f"Error generating thumbnails: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generate_thumbnails.py <video_path> <output_dir> <base_name> [target_width] [num_processes]", file=sys.stderr)
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_dir = sys.argv[2]
    base_name = sys.argv[3]
    
    # Optional parameters
    target_width = int(sys.argv[4]) if len(sys.argv) > 4 else 320
    max_workers = int(sys.argv[5]) if len(sys.argv) > 5 else None  # Default to CPU count
    
    generate_thumbnails(video_path, output_dir, base_name, target_width, max_workers)

