import cv2
import argparse
import json
import hashlib
import os

def extract_video_info(video_path):
    """Extract FPS, duration and generate checksum from video using OpenCV"""
    # Open the video file
    video = cv2.VideoCapture(video_path)
    
    # Check if video opened successfully
    if not video.isOpened():
        raise Exception(f"Error: Could not open video file {video_path}")
    
    # Get FPS
    fps = video.get(cv2.CAP_PROP_FPS)
    
    # Get total number of frames
    frame_count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Calculate duration in seconds
    duration = frame_count / fps if fps > 0 else 0
    
    # Get other metadata
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Release the video capture object
    video.release()
    
    # Generate checksum from video name and metadata
    filename = os.path.basename(video_path)
    checksum_data = f"{filename}:{width}:{height}:{fps}:{frame_count}"
    checksum = hashlib.md5(checksum_data.encode()).hexdigest()
    
    return {
        "fps": fps,
        "duration": duration,
        "frame_count": frame_count,
        "width": width,
        "height": height,
        "checksum": checksum
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract video information and generate checksum")
    parser.add_argument("-i", "--input", required=True, help="Input video file path")
    
    args = parser.parse_args()
    
    try:
        video_info = extract_video_info(args.input)
        # Output as JSON for easy parsing
        print(json.dumps(video_info))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        exit(1)