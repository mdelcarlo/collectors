#! /usr/bin/env python3
import argparse
import json
import numpy as np
import utils
import time
import audalign as ad
import os
import tempfile


def is_video_file(file_path):
    """Checks if a file is a video file based on its extension

    Args:
        file_path (str): Path to the file

    Returns:
        bool: True if the file is a video file, False otherwise
    """
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm']
    _, ext = os.path.splitext(file_path.lower())
    return ext in video_extensions


def parse_results(results):
    """Parses the results of the alignment process to a structured dictionary

    Args:
        results: Dictionary containing alignment results

    Returns:
        Dictionary with metadata, target file, offset and ranking information
    """
    output = {}

    for filename, _path in results['names_and_paths'].items():
        # Save metadata
        # file_metadata = utils.get_audio_metadata(path)
        # output["_metadata"][filename] = file_metadata

        file_offset = results[filename]
        if file_offset > 0:
            output['target'] = filename
            output['offset'] = file_offset * 1000  # Convert to milliseconds
            # Note that "confidence" to us is what the library calls "ranking"
            output['confidence'] = list(results['rankings']['match_info']
                                     [filename].values())[0]
    return output


class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return super(NpEncoder, self).default(obj)


def get_audio_offset(
    file1,
    file2,
    results_filepath=None,
    destination=None,
    technique="correlation_spectrogram",
    filter_matches=10,
    locality=None,
    write_results=False,
    min_duration=None,
    write_silence=False,
    print_metrics=False,
    save_fingerprints=False,
    fine_align=False,
    write_extension=None,
    write_multi_channel=False,
    write_multi_channel_fine=False,
    sample_rate=44100,
    accuracy=3,
    hash_style="panako_mod",
    threshold=100,
    num_processors=6,
    img_width=0.5,
    volume_threshold=215,
    fine_technique="correlation",
    fine_locality=None,
    fine_sample_rate=8000,
    fine_img_width=0.5,
    fine_volume_threshold=215,
):
    """Gets the offset between two audio or video files using fingerprints, correlation, or
    visual techniques. The algorithm determines which file is the target (the one 
    with a positive offset). If video files are provided, their audio will be extracted first.
    
    Args:
        file1 (str): Path to the first audio or video file
        file2 (str): Path to the second audio or video file
        result_dir (str, optional): Path to the directory where the result file
        will be saved. Defaults to None.
        destination (str, optional): Destination directory. Defaults to None.
        technique (str, optional): Alignment technique. Defaults to "correlation_spectrogram".
        filter_matches (int, optional): Only process on match counts greater than filter-matches. Defaults to 10.
        locality (float, optional): Chunk amount in seconds to evaluate alignments. Defaults to None.
        write_results (bool, optional): If True, writes results to "last_results.json". Defaults to False.
        min_duration (float, optional): Minimum duration in seconds for considering a successful alignment. Defaults to None.
        write_silence (bool, optional): If True, writes a new file with prepended silence. Defaults to False.
        print_metrics (bool, optional): If True, print metrics. Defaults to False.
        save_fingerprints (bool, optional): If True, cache fingerprints to a file. Defaults to False.
        fine_align (bool, optional): If True, runs a fine alignment. Defaults to False.
        write_extension (str, optional): Extension for output files. Defaults to None.
        write_multi_channel (bool, optional): If True, only writes a multi-channel file as output. Defaults to False.
        write_multi_channel_fine (bool, optional): If True, only writes a multi-channel file as output for fine align. Defaults to False.
        sample_rate (int, optional): Sample rate to read the file in. Defaults to 44100.
        accuracy (int, optional): Accuracy for fingerprints. Defaults to 3.
        hash_style (str, optional): Hash style for fingerprints. Defaults to "panako_mod".
        threshold (int, optional): Frequency threshold. Defaults to 100.
        num_processors (int, optional): Number of processors to use. Defaults to 6.
        img_width (float, optional): Image width for visual. Defaults to 0.5.
        volume_threshold (float, optional): Volume threshold for visual. Defaults to 215.
        fine_technique (str, optional): Fine alignment technique. Defaults to "correlation".
        fine_locality (float, optional): Fine alignment locality. Defaults to None.
        fine_sample_rate (int, optional): Fine alignment sample rate. Defaults to 8000.
        fine_img_width (float, optional): Fine alignment image width. Defaults to 0.5.
        fine_volume_threshold (float, optional): Fine alignment volume threshold. Defaults to 215.
    
    Returns:
        dict: Dictionary with offset results and metadata
    """
    recognizer = None
    results = None
    multiprocessing = True

    # Create a temporary directory to store the files
    temp_dir = tempfile.mkdtemp()
    
    # Process the input files (extract audio if they are video files)
    temp_files_to_cleanup = []
    
    # Extract audio from videos if needed
    if is_video_file(file1):
        # Create a temporary file with .wav extension
        temp_file1 = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        audio_file1 = temp_file1.name
        temp_file1.close()
        
        # Extract audio using utils function
        temp_dir1 = os.path.dirname(audio_file1)
        temp_output_path = utils.extract_audio_single(file1, temp_dir1)
        # Get the actual path from the result
        audio_file1 = os.path.join(temp_dir1, "audio.mp3")
        temp_files_to_cleanup.append(audio_file1)
    else:
        audio_file1 = file1
        
    if is_video_file(file2):
        # Create a temporary file with .wav extension
        temp_file2 = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        audio_file2 = temp_file2.name
        temp_file2.close()
        
        # Extract audio using utils function
        temp_dir2 = os.path.dirname(audio_file2)
        temp_output_path = utils.extract_audio_single(file2, temp_dir2)
        # Get the actual path from the result
        audio_file2 = os.path.join(temp_dir2, "audio.mp3")
        temp_files_to_cleanup.append(audio_file2)
    else:
        audio_file2 = file2
    
    # Copy the audio files to the temporary directory
    import shutil
    file1_name = os.path.basename(audio_file1)
    file2_name = os.path.basename(audio_file2)
    
    shutil.copy(audio_file1, os.path.join(temp_dir, file1_name))
    shutil.copy(audio_file2, os.path.join(temp_dir, file2_name))

    if num_processors == 1:
        multiprocessing = False
    elif num_processors == 0:
        num_processors = None
    if locality == 0:
        locality = None

    if technique == "fingerprints":
        recognizer = ad.FingerprintRecognizer()
        recognizer.config.filter_matches = filter_matches
        recognizer.config.set_accuracy(accuracy)
        recognizer.config.set_hash_style(hash_style)
    elif technique == "correlation":
        recognizer = ad.CorrelationRecognizer()
    elif technique == "correlation_spectrogram":
        recognizer = ad.CorrelationSpectrogramRecognizer()
    elif technique == "visual":
        recognizer = ad.VisualRecognizer()
        recognizer.config.volume_threshold = volume_threshold
        recognizer.config.img_width = img_width
    else:
        # Clean up temp directory and files
        shutil.rmtree(temp_dir)
        for temp_file in temp_files_to_cleanup:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        raise ValueError(
            f"technique '{technique}' must be 'fingerprints', 'correlation', 'correlation_spectrogram', or 'visual'"
        )
    
    if not recognizer:
        # Clean up temp directory and files
        shutil.rmtree(temp_dir)
        for temp_file in temp_files_to_cleanup:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        raise ValueError("No recognizer was created")

    recognizer.config.freq_threshold = threshold
    recognizer.config.num_processors = num_processors
    recognizer.config.multiprocessing = multiprocessing
    recognizer.config.sample_rate = sample_rate
    recognizer.config.locality = locality

    t = time.time()

    try:
        # Use the temporary directory for alignment
        results = ad.align(
            temp_dir,
            destination_path=destination,
            write_extension=write_extension,
            write_multi_channel=write_multi_channel,
            recognizer=recognizer,
        )

        if not results:
            print("No results found.")
            # Clean up temp directory and files
            shutil.rmtree(temp_dir)
            for temp_file in temp_files_to_cleanup:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            return None

        # cache fingerprints
        if save_fingerprints and isinstance(recognizer, ad.FingerprintRecognizer):
            recognizer.save_fingerprinted_files('fingerprints_cache.json')

        # save offset + write shifted file (if write_silence)
        for filename, path in results['names_and_paths'].items():
            offset = results[filename]
            if offset > 0:
                results['offset'] = (filename, offset)
                target_file = path

                if write_silence and results:
                    dest = destination or os.path.dirname(path)
                    ad.write_shifted_file(
                        path,
                        os.path.join(dest, 'shifted_' + os.path.basename(path)),
                        offset_seconds=offset,
                        normalize=False,
                    )

        t = time.time() - t

    except KeyboardInterrupt:
        t = time.time() - t
        print(f"\nRan for {ad.seconds_to_min_hrs(t)}.")
        # Clean up temp directory and files
        shutil.rmtree(temp_dir)
        for temp_file in temp_files_to_cleanup:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        return None
    finally:
        # Clean up temp directory and files
        shutil.rmtree(temp_dir)
        for temp_file in temp_files_to_cleanup:
            if os.path.exists(temp_file):
                os.remove(temp_file)


    # --------------------------------------------------------------------------

    if print_metrics:
        ad.pretty_print_results(results)
        print()
        sum_, count, max_, min_ = 0, 0, 0, 9999999999
        if results is not None:
            for target in results["rankings"]["match_info"].keys():
                temp_results = results["rankings"]["match_info"][target]
                if temp_results == 0:
                    max_ = max(max_, 0)
                    min_ = min(min_, 0)
                    sum_ += 0
                    count += 1
                    continue
                for rank in temp_results.values():
                    max_ = max(max_, rank)
                    min_ = min(min_, rank)
                    sum_ += rank
                    count += 1
            print()
            print(
                f"Rankings -- Count: {count}, Sum: {sum_}, Min: {min_}, Average: {sum_ / count}, Max: {max_}"
            )

    output = parse_results(results)
    output['elapsed_time_seconds'] = t
    
    if output is not None and results_filepath:
        with open(results_filepath, "w") as f:
            json.dump(output, f, cls=NpEncoder)

    if print_metrics:
        print('Results:')
        print(output)

    return output


def main(args):
    """Main function to be called from command line"""
    if len(args.files) != 2:
        raise ValueError("Exactly two files must be provided")
    
    return get_audio_offset(
        file1=args.files[0],
        file2=args.files[1],
        results_filepath=args.results_filepath,
        destination=args.destination,
        technique=args.technique,
        filter_matches=args.filter_matches,
        locality=args.locality,
        min_duration=args.min_duration,
        write_silence=args.write_silence,
        print_metrics=args.print_metrics,
        save_fingerprints=args.save_fingerprints,
        fine_align=args.fine_align,
        write_extension=args.write_extension,
        write_multi_channel=args.write_multi_channel,
        write_multi_channel_fine=args.write_multi_channel_fine,
        sample_rate=args.sample_rate,
        accuracy=args.accuracy,
        hash_style=args.hash_style,
        threshold=args.freq_threshold,
        num_processors=args.num_processors,
        img_width=args.img_width,
        volume_threshold=args.volume_threshold,
        fine_technique=args.fine_technique,
        fine_locality=args.fine_locality,
        fine_sample_rate=args.fine_sample_rate,
        fine_img_width=args.fine_img_width,
        fine_volume_threshold=args.fine_volume_threshold
    )


"""Command line argument parser"""
parser = argparse.ArgumentParser(description="Get the offset between two audio or video files.")
parser.add_argument(
    "-f",
    "--files",
    type=str,
    nargs=2,
    help="paths to the two audio or video files to compare",
    required=True,
)
parser.add_argument(
    "-d",
    "--destination",
    help="destination directory",
    type=str,
    required=False,
    default=None,
)
parser.add_argument(
    "--results-filepath",
    help="path to the directory where the result file will be saved",
    type=str,
    required=False,
    default=None,
)
parser.add_argument(
    "--technique",
    type=str,
    help="alignment technique",
    required=False,
    default="correlation_spectrogram",  # seems to be the best
)
parser.add_argument(
    "--filter-matches",
    type=int,
    help="only process on match counts greater than filter-matches",
    required=False,
    # TODO: check this
    default=10
)
parser.add_argument(
    "-l",
    "--locality",
    type=float,
    help="chunk amount in seconds to evaluate alignments",
    required=False,
    default=None,
)
parser.add_argument(
    "--write-results",
    action="store_true",
    help='if present, writes results to "last_results.json"',
)
parser.add_argument(
    "--min-duration",
    type=float,
    help="## Not Yet Supported: ## Minimum duration in seconds for considering a successful alignment",
    required=False,
    default=None,
)
parser.add_argument(
    "--write-silence",
    action="store_true",
    help="If present, writes a new file with prepended silence to the offseted audio file",
)
parser.add_argument(
    "--print-metrics",
    help="If present, print some metrics",
    action='store_true',
    required=False,
    default=False,
)
parser.add_argument(
    "--save_fingerprints",
    type=float,
    help="If present, cache fingerprints to a file",
    required=False,
    default=False,
)

# UNTESTED:
parser.add_argument(
    "--fine-align", action="store_true", help="if present, runs a fine alignment"
)
parser.add_argument("-w", "--write-extension", type=str,
                    required=False, default=None)
parser.add_argument(
    "--write-multi-channel",
    help="If present, only writes a multi-channel file as output",
    action="store_true",
)
parser.add_argument(
    "--write-multi-channel-fine",
    help="If present, only writes a multi-channel file as output for fine align",
    action="store_true",
)
parser.add_argument(
    "-m",
    "--sample-rate",
    type=int,
    help="sample rate to read the file in",
    required=False,
    default=44100,
)
parser.add_argument(
    "-a",
    "--accuracy",
    type=int,
    help="accuracy for fingerprints",
    required=False,
    default=3,
)
parser.add_argument(
    "-s",
    "--hash-style",
    type=str,
    help="hash style for fingerprints",
    required=False,
    default="panako_mod",
)
parser.add_argument(
    "--freq-threshold",
    type=int,
    help="frequency threshold",
    required=False,
    default=100,
)
parser.add_argument(
    "-n",
    "--num-processors",
    type=int,
    help="number of processors to use",
    required=False,
    default=6,
)
parser.add_argument(
    "-i",
    "--img-width",
    type=float,
    help="image width for visual",
    required=False,
    default=0.5,
)
parser.add_argument(
    "-v",
    "--volume-threshold",
    type=float,
    help="volume threshold for visual",
    required=False,
    default=215,
)
parser.add_argument(
    "--fine-technique",
    type=str,
    help="fine alignment technique",
    required=False,
    default="correlation",
)
parser.add_argument(
    "--fine-locality",
    type=float,
    help="fine alignment locality",
    required=False,
    default=None,
)
parser.add_argument(
    "--fine-sample-rate",
    type=int,
    help="fine alignment sample rate to convert the files to",
    required=False,
    default=8000,
)
parser.add_argument(
    "--fine-img-width",
    type=float,
    help="fine alingment image width for visual",
    required=False,
    default=0.5,
)
parser.add_argument(
    "--fine-volume-threshold",
    type=float,
    help="fine alignment volume threshold for visual",
    required=False,
    default=215,
)

args = parser.parse_args()


if __name__ == "__main__":
    main(args=args)
