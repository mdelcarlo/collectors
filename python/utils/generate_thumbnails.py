import argparse

from generators.thumbnails import CV2ThumbnailGenerator, MoviePyThumbnailGenerator
from generators.thumbnails.ffmpeg_generator import FFmpegThumbnailGenerator
from utils.ENUMS import DEFAULT_OUTPUT_FPS, DEFAULT_OUTPUT_WIDTH, DEFAULT_THUMBNAIL_PROCESSOR

# Args #
def parse_args():
    parser = argparse.ArgumentParser(description="Niftier running.")
    parser.add_argument(
        "-i",
        "--input",
        type=str,
        help="Path to the input video file",
        required=True,
    )
    parser.add_argument(
        "-o",
        "--output_dir",
        type=str,
        help="Path to the output directory",
        required=True,
    )
    parser.add_argument(
        "-n",
        "--base_name",
        type=str,
        help="Base name for the generated thumbnails",
        required=True,
    )
    parser.add_argument(
        "-w",
        "--width",
        type=int,
        default=DEFAULT_OUTPUT_WIDTH,
        help="Target width for the generated thumbnails",
        required=False,
    )
    parser.add_argument(
        "--max_workers",
        type=int,
        help="Number of worker processes to use for thumbnail generation",
        required=False,
        default=None
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
        "-p",
        "--processor",
        type=str,
        choices=['cv2', 'moviepy'],
        help="Processor to use for thumbnail generation",
        required=False,
        default=DEFAULT_THUMBNAIL_PROCESSOR
    )
    return parser.parse_args()


def generate_thumbnails(video_path, output_dir, base_name="thumb", output_width=DEFAULT_OUTPUT_WIDTH, 
                       max_workers=None, output_fps=DEFAULT_OUTPUT_FPS, processor=DEFAULT_THUMBNAIL_PROCESSOR):
    """Generate thumbnails from a video file using a specified processor."""
    
    generator = {
        'manual-cv2': CV2ThumbnailGenerator,
        'manual-moviepy': MoviePyThumbnailGenerator,
        'manual-ffmpeg': FFmpegThumbnailGenerator
    }.get(processor)
    
    if not generator:
        raise ValueError(f"Unknown processor: {processor}")
        
    generator = generator(output_fps=output_fps, target_width=output_width)
    return generator.generate_thumbnails(video_path, output_dir, base_name, max_workers)

if __name__ == "__main__":
    args = parse_args()
    video_path = args.input
    output_dir = args.output_dir
    base_name = args.base_name
    processor = args.processor
    output_fps = args.fps
    
    # Optional parameters
    output_width = args.width
    max_workers = args.max_workers
    
    generate_thumbnails(video_path, output_dir, base_name,
                        output_width, max_workers, output_fps, processor)
