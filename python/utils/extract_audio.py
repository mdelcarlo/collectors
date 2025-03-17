#!/usr/bin/env python
"""
Python script to extract audio from video files using moviepy.
"""
import contextlib
import io
import sys
import os
import time
from typing import TypedDict
from moviepy.video.io.VideoFileClip import VideoFileClip
import subprocess
from pydub.utils import mediainfo

# Types #
class ExtractAudioResults(TypedDict):
    elapsed_time: float
    output_path: str

# Local Helpers #

def _get_codec(output_path, specified_codec=None):
    """
    Determine the appropriate audio codec based on the output file extension.

    Args:
        output_path (str): Path where the audio will be saved
        specified_codec (str, optional): Codec explicitly specified by the user

    Returns:
        str: Appropriate audio codec for the output format
    """
    if specified_codec:
        return specified_codec

    # Get file extension
    _, ext = os.path.splitext(output_path)
    ext = ext.lower()

    # Map extensions to codecs
    codec_map = {
        '.mp3': 'libmp3lame',
        '.aac': 'aac',
        '.ogg': 'libvorbis',
        '.m4a': 'aac',
        '.flac': 'flac',
        '.wav': 'pcm_s16le',
        '.opus': 'libopus'
    }

    # Default to 'copy' which streams audio without re-encoding
    return codec_map.get(ext, 'copy')

def _extract_audio(video_path, output_path, audio_codec=None, audio_bitrate="320k", verbose=True):
    """
    Extract audio from a video file using FFmpeg and save it to the specified path.

    Args:
        video_path (str): Path to the input video file
        output_path (str): Path where the extracted audio will be saved
        audio_codec (str, optional): Audio codec to use (default: auto-detect from extension)
        audio_bitrate (str): Bitrate for the output audio (default: 320k)
        verbose (bool): Whether to print progress messages

    Returns:
        bool: True if extraction was successful, False otherwise
    """
    try:
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Determine codec if not specified
        if not audio_codec:
            audio_codec = _get_codec(output_path)

        # Build the FFmpeg command
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-vn",  # No video
            "-acodec", audio_codec,
            "-ab", audio_bitrate,
            "-y",  # Overwrite output file if it exists
            output_path
        ]

        if verbose:
            print(f"Extracting audio from {video_path} to {output_path}")
            print(f"Using codec: {audio_codec}, bitrate: {audio_bitrate}")

        # Execute FFmpeg command
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        # Capture output for debugging
        _stdout, stderr = process.communicate()

        if process.returncode != 0:
            if verbose:
                print(f"Error running FFmpeg: {stderr}")
            return False

        if verbose:
            print(f"Audio extraction complete: {output_path}")
        return True

    except Exception as e:
        if verbose:
            print(f"Error extracting audio: {e}")
        return False

def _extract_audio_batch(video_paths, output_dir, audio_format='wav', audio_codec=None, audio_bitrate="320k"):
    """
    Extract audio from multiple video files and save to the specified directory.

    Args:
        video_paths (list): List of paths to input video files
        output_dir (str): Directory where extracted audio files will be saved
        audio_format (str): Output audio format (default: wav)
        audio_codec (str, optional): Audio codec to use (if None, will be chosen based on format)
        audio_bitrate (str): Bitrate for the output audio (default: 320k)

    Returns:
        dict: Dictionary mapping input paths to output paths and success status
    """
    results = {}

    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for video_path in video_paths:
        # Generate output filename
        video_filename = os.path.basename(video_path)
        audio_filename = os.path.splitext(video_filename)[
            0] + f".{audio_format}"
        output_path = os.path.join(output_dir, audio_filename)

        # Extract audio
        success = _extract_audio(
            video_path,
            output_path,
            audio_codec,
            audio_bitrate
        )

        results[video_path] = {
            'output_path': output_path,
            'success': success
        }

    return results

# Functions #
def extract_audio_multiple(files):
    files = [f.strip() for f in files]

    results = _extract_audio_batch(
        video_paths=files,
        output_dir='./extracted_audio',
        audio_format='wav'
    )

    for video_path, result in results.items():
        if result['success']:
            print(
                f"Successfully extracted audio from {video_path} to {result['output_path']}")
        else:
            print(f"Failed to extract audio from {video_path}")

def extract_audio_single(video_path, output_path) -> ExtractAudioResults:
    """Extract audio from a single video file using moviepy."""
    print(f"Starting audio extraction from {video_path} to {output_path}")
    start_time = time.time()
    
    # Make sure the output directory exists
    os.makedirs(output_path, exist_ok=True)
    
    try:
        # Load the video file
        # Hack: prevent clip.get_frame to print to stdout :/
        with contextlib.redirect_stdout(io.StringIO()):
            video_clip = VideoFileClip(video_path)
        
        # Extract the audio
        audio_clip = video_clip.audio
        
        # Write the audio to a file
        audio_clip.write_audiofile(output_path + "/audio.mp3")
        
        # Close the clips
        video_clip.close()
        audio_clip.close()
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to ms
        
        print(f"Audio extraction completed in {processing_time:.2f}ms")
        return { "output_path": output_path, "elapsed_time": processing_time }
        
    except Exception as e:
        print(f"Error extracting audio: {str(e)}", file=sys.stderr)
        sys.exit(1)

def get_audio_metadata(file_path):
    """Get comprehensive audio metadata using mediainfo"""
    info = mediainfo(file_path)

    # Extract bit rate information
    bit_rate = info.get('bit_rate')
    if bit_rate:
        # Convert to integer if it's a string with units (e.g., "320000 bps")
        bit_rate = int(bit_rate.split()[0]
                       ) if ' ' in bit_rate else int(bit_rate)

    # Extract bits per sample
    bits_per_sample = info.get('bits_per_sample')
    if bits_per_sample:
        bits_per_sample = int(bits_per_sample)
    else:
        # Calculate from sample format if available
        bits_per_raw_sample = info.get('bits_per_raw_sample')
        if bits_per_raw_sample:
            bits_per_sample = int(bits_per_raw_sample)

    return {
        "duration_seconds": float(info.get('duration', 0)),
        "sample_rate": int(info.get('sample_rate', 0)),
        "channels": int(info.get('channels', 0)),
        "bits_per_sample": bits_per_sample,
        "bit_rate": bit_rate,
        "format": info.get('format_name'),
    }

