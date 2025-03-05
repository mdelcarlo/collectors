#!/usr/bin/env python
"""
Python script to generate thumbnails from video files using OpenCV with multiprocessing.
"""

import sys
import os
import time
import json
import cv2
import numpy as np
import concurrent.futures
from PIL import Image

def process_frame(frame_data):
    """Process a single frame to create a thumbnail."""
    frame, output_path, target_width = frame_data

    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    img.thumbnail((target_width, img.height * target_width // img.width))  # Maintain aspect ratio
    img.save(output_path, optimize=True)

    return output_path

def generate_thumbnails(video_path, output_dir, base_name='video_', target_width=320, max_workers=None):
    """Generate thumbnails from a video file using OpenCV."""
    print(f"Starting thumbnail generation from {video_path}")
    start_time = time.time()

    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video file {video_path}", file=sys.stderr)
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    print(f"Video duration: {duration:.2f} seconds, FPS: {fps:.2f}, Total Frames: {total_frames}")

    num_thumbnails = int(duration)
    timestamps = np.linspace(0, total_frames - 1, num=num_thumbnails, dtype=int)

    frame_data = []
    for i, frame_idx in enumerate(timestamps):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            print(f"Warning: Failed to read frame at index {frame_idx}", file=sys.stderr)
            continue

        output_path = os.path.join(output_dir, f"{base_name}-{i:03d}.png")
        frame_data.append((frame, output_path, target_width))

    cap.release()

    thumbnail_files = []
    with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
        future_to_frame = {executor.submit(process_frame, data): i for i, data in enumerate(frame_data)}

        for i, future in enumerate(concurrent.futures.as_completed(future_to_frame)):
            thumbnail_path = future.result()
            thumbnail_files.append(thumbnail_path)

            progress = (i + 1) / num_thumbnails * 100
            print(f"\rProgress: {i+1}/{num_thumbnails} ({progress:.1f}%)", end="")

    thumbnail_files.sort()

    end_time = time.time()
    processing_time = (end_time - start_time) * 1000  # Convert to ms

    print(f"\nThumbnail generation completed in {processing_time:.2f}ms")
    print(f"Generated {len(thumbnail_files)} thumbnails")

    print(json.dumps(thumbnail_files))
    return thumbnail_files

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generate_thumbnails.py <video_path> <output_dir> <base_name> [target_width] [num_processes]", file=sys.stderr)
        sys.exit(1)

    video_path = sys.argv[1]
    output_dir = sys.argv[2]
    base_name = sys.argv[3]

    target_width = int(sys.argv[4]) if len(sys.argv) > 4 else 320
    max_workers = int(sys.argv[5]) if len(sys.argv) > 5 else None

    generate_thumbnails(video_path, output_dir, base_name, target_width, max_workers)
