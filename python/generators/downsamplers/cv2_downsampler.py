import cv2
import os
import time
import subprocess
import tempfile
import concurrent.futures
import shutil
from pathlib import Path
from generators.downsamplers.base import BaseVideoDownsampler
from utils.ENUMS import DEFAULT_OUTPUT_FPS, DEFAULT_OUTPUT_WIDTH
from utils.ffmpeg_utils import get_ffmpeg_path

class CV2Downsampler(BaseVideoDownsampler):
    # This function needs to be at the module level (not nested) for multiprocessing
    def _process_frame_chunk(self, input_file, chunk_indices, output_width, new_height,
                            use_cuda=True):
        """Process a chunk of frames from the video file."""
        processed_frames = []
        
        # Open a separate capture for this process
        chunk_cap = cv2.VideoCapture(input_file)
        
        for frame_idx in chunk_indices:
            # Set position
            chunk_cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = chunk_cap.read()
            if not ret:
                continue
            
            # Process frame
            if use_cuda:
                # GPU-accelerated resizing
                gpu_frame = cv2.cuda_GpuMat()
                gpu_frame.upload(frame)
                gpu_resized = cv2.cuda.resize(gpu_frame, (output_width, new_height))
                resized_frame = gpu_resized.download()
            else:
                # CPU resizing with optimized algorithm
                if frame.shape[1] > output_width * 2:
                    # For significant downsizing, AREA gives better results
                    resized_frame = cv2.resize(frame, (output_width, new_height), 
                                             interpolation=cv2.INTER_AREA)
                else:
                    # For minor resizing, LINEAR is faster
                    resized_frame = cv2.resize(frame, (output_width, new_height), 
                                             interpolation=cv2.INTER_LINEAR)
            
            processed_frames.append(resized_frame)
            
        chunk_cap.release()
        return processed_frames

    def process(self, input_file, output_dir, output_filename, output_width=DEFAULT_OUTPUT_WIDTH, 
                                   output_fps=DEFAULT_OUTPUT_FPS, max_workers=None, chunk_size=24):
        """
        High-performance video downsampling using OpenCV with optimizations:
        - Multi-processing for frame processing
        - Batch processing of frames
        - Memory optimization
        - GPU acceleration when available
        - Efficient frame skipping
        """
        if not os.path.exists(input_file):
            print(f"❌ Error: Input file '{input_file}' does not exist")
            return {"error": "Input file does not exist"}

        start_time = time.time()
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, output_filename)
        
        # Create a temp directory for processed frame chunks
        temp_dir = tempfile.mkdtemp()
        temp_video_path = os.path.join(temp_dir, "temp_video.mp4")
        
        try:
            print(f"🎬 Starting video processing: {Path(input_file).name}")
            # Check if CUDA is available for GPU acceleration
            use_cuda = cv2.cuda.getCudaEnabledDeviceCount() > 0
            if use_cuda:
                print("🚀 CUDA acceleration enabled!")
            else:
                print("💻 Using CPU processing")
            
            # Get video properties
            cap = cv2.VideoCapture(input_file)
            if not cap.isOpened():
                raise ValueError(f"❌ Could not open video file {input_file}")
                
            orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            orig_fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Calculate new dimensions
            new_height = int(output_width * orig_height / orig_width)
            
            print(f"📊 Input video: {orig_width}x{orig_height} @ {orig_fps:.2f} FPS, {total_frames} frames")
            print(f"🔄 Output video: {output_width}x{new_height} @ {output_fps} FPS")
            
            # Calculate frame indices to keep based on output FPS
            frame_indices = []
            if output_fps >= orig_fps:
                # Keep all frames
                frame_indices = list(range(total_frames))
            else:
                # Calculate which frames to keep
                step = orig_fps / output_fps
                frame_indices = [int(i * step) for i in range(int(total_frames / step))]
            
            expected_output_frames = len(frame_indices)
            print(f"🖼️  Will extract {expected_output_frames} frames")
            
            # Set up video writer
            fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264 codec
            out = cv2.VideoWriter(temp_video_path, fourcc, output_fps, (output_width, new_height))
            
            # Divide frames into chunks for parallel processing
            chunks = [frame_indices[i:i+chunk_size] for i in range(0, len(frame_indices), chunk_size)]
            
            print(f"⚙️  Initializing processing with {max_workers or 'auto'} workers")
            # Process chunks in parallel
            with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
                # Create a list of futures
                futures = []
                for chunk in chunks:
                    future = executor.submit(
                        self._process_frame_chunk, 
                        input_file, 
                        chunk, 
                        output_width, 
                        new_height,
                        use_cuda
                    )
                    futures.append(future)
                
                # Track progress
                completed = 0
                total_chunks = len(chunks)
                print(f"🧩 Total chunks to process: {total_chunks}")
                
                # Process results as they complete
                for future in concurrent.futures.as_completed(futures):
                    try:
                        # Write processed frames to video
                        frames = future.result()
                        for frame in frames:
                            out.write(frame)
                            
                        # Update progress
                        completed += 1
                        progress = (completed / total_chunks) * 100
                        
                        # Create progress bar with emojis
                        bar_length = 20
                        filled_length = int(bar_length * completed // total_chunks)
                        bar = '▓' * filled_length + '░' * (bar_length - filled_length)
                        
                        # Add emojis based on progress
                        emoji = "🐢" if progress < 25 else "🚶" if progress < 50 else "🏃" if progress < 75 else "🚀"
                        
                        print(f"\r{emoji} Progress: [{bar}] {completed}/{total_chunks} chunks ({progress:.1f}%) ", end="")
                        
                    except Exception as e:
                        print(f"\n❌ Error processing chunk: {e}")
            
            print("\n✅ Frame processing complete!")
            
            # Release video writer
            out.release()
            cap.release()
            
            # Extract audio from original file (OpenCV can't handle audio)
            temp_audio = os.path.join(temp_dir, "audio.aac")
            ffmpeg_path = get_ffmpeg_path()
            if not ffmpeg_path.exists():
                raise FileNotFoundError(f"❌ FFmpeg binary not found at {ffmpeg_path}")

            if not os.access(ffmpeg_path, os.X_OK):
                raise PermissionError(f"❌ FFmpeg is not executable: {ffmpeg_path}")

            print("🔊 Extracting audio...")
            audio_cmd = [
                str(ffmpeg_path),
                '-i', input_file,
                '-vn',                   # No video
                '-acodec', 'copy',       # Copy audio codec 
                '-y',                    # Overwrite without asking
                temp_audio
            ]
            
            subprocess.run(audio_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Check if audio extraction succeeded
            has_audio = os.path.exists(temp_audio) and os.path.getsize(temp_audio) > 0
            
            # Merge video and audio (if audio exists)
            if has_audio:
                print("🔄 Merging audio and video...")
                merge_cmd = [
                    str(ffmpeg_path),
                    '-i', temp_video_path,    # Video file
                    '-i', temp_audio,         # Audio file
                    '-c:v', 'copy',           # Copy video
                    '-c:a', 'aac',            # AAC audio codec
                    '-b:a', '128k',           # Audio bitrate
                    '-shortest',              # Match shortest stream
                    '-y',                     # Overwrite without asking
                    output_path
                ]
                subprocess.run(merge_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                # Just copy the video if no audio
                print("ℹ️ No audio stream found, creating video-only output...")
                shutil.copy(temp_video_path, output_path)
            
            elapsed_time = (time.time() - start_time)
            
            # Format time nicely
            if elapsed_time < 60:
                time_str = f"{elapsed_time:.2f} seconds"
            else:
                minutes = int(elapsed_time // 60)
                seconds = elapsed_time % 60
                time_str = f"{minutes} min {seconds:.2f} sec"
            
            print(f"✨ Processing complete! Output saved to: {output_path}")
            print(f"⏱️  Total processing time: {time_str}")
            
            # Add file size info
            output_size_mb = os.path.getsize(output_path) / (1024 * 1024)
            if os.path.exists(input_file):
                input_size_mb = os.path.getsize(input_file) / (1024 * 1024)
                compression_ratio = input_size_mb / output_size_mb if output_size_mb > 0 else 0
                print(f"📦 File size: {output_size_mb:.2f} MB (Compression ratio: {compression_ratio:.2f}x)")
            else:
                print(f"📦 Output file size: {output_size_mb:.2f} MB")

            return output_path
            
        except Exception as e:
            print(f"❌ Error processing video: {str(e)}")
            return {"error": str(e)}
            
        finally:
            # Clean up temporary files
            try:
                print("🧹 Cleaning up temporary files...")
                shutil.rmtree(temp_dir)
            except Exception as e:
                print(f"⚠️ Warning: Could not clean up temp files: {str(e)}")