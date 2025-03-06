import cv2
import argparse
import json

def extract_fps(video_path):
    """Extract FPS from video using OpenCV"""
    # Open the video file
    video = cv2.VideoCapture(video_path)
    
    # Check if video opened successfully
    if not video.isOpened():
        raise Exception(f"Error: Could not open video file {video_path}")
    
    # Get FPS
    fps = video.get(cv2.CAP_PROP_FPS)
    
    # Release the video capture object
    video.release()
    
    return fps

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract FPS from a video using OpenCV")
    parser.add_argument("-i", "--input", required=True, help="Input video file path")
    
    args = parser.parse_args()
    
    try:
        fps = extract_fps(args.input)
        # Output as JSON for easy parsing
        print(json.dumps({"fps": fps}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        exit(1)