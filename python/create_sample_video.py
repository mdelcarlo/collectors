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
from utils import generate_sample_video_filename
from utils.ENUMS import DEFAULT_OUTPUT_EXTENSION, DEFAULT_OUTPUT_FPS, DEFAULT_OUTPUT_WIDTH
import os
import shutil
from urllib.parse import unquote


parser = argparse.ArgumentParser(description="create a sample video from thumbnails.")
parser.add_argument(
    "-i",
    "--input",
    type=str,
    help="path to the input video file",
    required=True,
)
parser.add_argument(
    "-o",
    "--output",
    type=str,
    help="path to the output video file",
    required=True,
)
parser.add_argument(
    "-f",
    "--fps",
    type=int,
    default=DEFAULT_OUTPUT_FPS,
    help="number of frames per second for the output video",
    required=False
)
parser.add_argument(
    "-w",
    "--width",
    type=int,
    default=DEFAULT_OUTPUT_WIDTH,
    help="target width for the generated thumbnails",
)
parser.add_argument(
    "--max_workers",
    type=int,
    help="number of worker processes for thumbnail generation",
    default=None
)
parser.add_argument(
    "--codec",
    type=str,
    default="libx264",
    help="video codec for output",
)
parser.add_argument(
    "-p",
    "--processor",
    default="auto-ffmpeg",
    type=str,
    choices=['manual-cv2', 'manual-moviepy', 'manual-ffmpeg', 'auto-ffmpeg',
             'auto-cv2'],
    help="processor to use for thumbnail generation. \n 'manual' processors use custom logic to extract audio + thumbs and end up creating the final video. \n 'auto' processor lets the library do its job.",
    required=False
)
parser.add_argument(
    "-k",
    "--keep-tmp-files",
    action="store_true",
    help="keep temporary files after processing",
    required=False
)
parser.add_argument(
        '-e', '--extension',
        type=str,
        default=DEFAULT_OUTPUT_EXTENSION,
        help='Output video file extension',
        required=False
)
parser.add_argument(
        '--output-filename',
        type=str,
        help='Output video file name',
        required=False
)

# Helpers
def remove_directory(path):
    if os.path.exists(path):
        shutil.rmtree(path)

def main(args):
    print(f"Creating sample video using processor: {args.processor}")

    TEMP_DIR = 'temp'
    start_time = time.time()
    OUTPUT_FILENAME = args.output_filename or generate_sample_video_filename(args.input, args.fps, args.width, args.extension)
    OUTPUT_FILENAME = unquote(OUTPUT_FILENAME)

    try:
        if args.processor == 'auto-cv2' or args.processor == 'auto-ffmpeg':
            generator = None

            # dynamically import the correct processor based on the argument
            if args.processor == 'auto-cv2':
                from generators.downsamplers.cv2_downsampler import CV2Downsampler
                generator = CV2Downsampler()
            elif args.processor == 'auto-ffmpeg':
                from generators.downsamplers.ffmpeg_downsampler import FFmpegDownsampler
                generator = FFmpegDownsampler()

            if not generator:
                print("Error: Processor not found. Please check if the processor is available.")
                sys.exit(1)

            return generator.process(input_file=args.input, output_dir=args.output, output_filename=OUTPUT_FILENAME, output_width=args.width, output_fps=args.fps)
            
        else:
            from utils.extract_audio import extract_audio
            from utils.generate_thumbnails import generate_thumbnails
            from utils.create_video_from_thumbs import create_video_from_thumbs

            # Create working directory
            os.makedirs(TEMP_DIR or "thumbs", exist_ok=True)
        
            # Extract audio
            audio_dir = os.path.join(TEMP_DIR, "audio")
            os.makedirs(audio_dir, exist_ok=True)
            audio_results = extract_audio(args.input, audio_dir)
            print(f"Audio extraction completed successfully: {audio_results}")
            
            # Generate thumbnails
            thumbs_dir = os.path.join(TEMP_DIR, "thumbs")
            os.makedirs(thumbs_dir, exist_ok=True)
            thumbs_results = generate_thumbnails(
                video_path=args.input,
                output_dir=thumbs_dir,
                base_name="thumb",
                output_width=args.width,
                max_workers=args.max_workers,
                output_fps=args.fps,
                processor=args.processor
            )


            print(f"Thumbnails generated successfully: {thumbs_results}")
            print()
            
            # Create sample video from thumbnails
            video_results = create_video_from_thumbs(thumbs_dir,
                         audio_dir + "/audio.mp3",
                         args.output, args.codec, OUTPUT_FILENAME)

            print(f"Sample video created successfully: {video_results.get('output_path')}")
            print()
            return video_results.get('output_path')
        
    except Exception as e:
        print(f"Error creating sample video: {str(e)}", file=sys.stderr)
        sys.exit(1)

    finally:
        # Clean up temp files
        if not args.keep_tmp_files:
            remove_directory(TEMP_DIR)
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to ms
        print("Processing time: {:.2f} ms".format(processing_time))

if __name__ == "__main__":
    args = parser.parse_args()
    main(args)
