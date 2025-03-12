#! /usr/bin/env python3
import argparse
import json
import numpy as np
from audalign.config.fingerprint import FingerprintConfig
import utils
import time
import audalign as ad


def parse_results(results):
    """Parses the results of the alignment process to a structured dictionary

    Args:
        results: Dictionary containing alignment results

    Returns:
        Dictionary with metadata, target file, offset and ranking information
    """
    output = {"_metadata": {}}

    for filename, path in results['names_and_paths'].items():
        # Save metadata
        file_metadata = utils.get_audio_metadata(path)
        output["_metadata"][filename] = file_metadata

        file_offset = results[filename]
        if file_offset > 0:
            output['target'] = filename
            output['offset'] = file_offset
            output['ranking'] = list(results['rankings']['match_info']
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
    files,
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
    fine_volume_threshold=215
):
    """Gets the offset of two audio files using fingerprints, correlation, or
    visual techniques.
    
    Args:
        files (str): Path to directory with audio files to process
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
        raise ValueError(
            f"technique '{technique}' must be 'fingerprints', 'correlation', 'correlation_spectrogram', or 'visual'"
        )
    
    if not recognizer:
        raise ValueError("No recognizer was created")

    recognizer.config.freq_threshold = threshold
    recognizer.config.num_processors = num_processors
    recognizer.config.multiprocessing = multiprocessing
    recognizer.config.sample_rate = sample_rate
    recognizer.config.locality = locality

    t = time.time()

    try:
        results = ad.align(
            files,
            destination_path=destination,
            write_extension=write_extension,
            write_multi_channel=write_multi_channel,
            recognizer=recognizer,
        )

        if not results:
            print("No results found.")
            return None

        # cache fingerprints
        if save_fingerprints and isinstance(recognizer, ad.FingerprintRecognizer):
            recognizer.save_fingerprinted_files('fingerprints_cache.json')

        # save offset + write shifted file (if write_silence)
        for filename, path in results['names_and_paths'].items():
            offset = results[filename]
            if offset > 0:
                results['offset'] = (filename, offset)

                if write_silence and results:
                    dest = destination or files
                    ad.write_shifted_file(
                        path,
                        dest + '/shifted_' + filename,
                        offset_seconds=offset,
                        normalize=False,
                    )

        t = time.time() - t

    except KeyboardInterrupt:
        t = time.time() - t
        print(f"\nRan for {ad.seconds_to_min_hrs(t)}.")
        return None

    if results is not None and write_results:
        with open("last_results.json", "w") as f:
            json.dump(results, f, cls=NpEncoder)

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
    output['elapsed_time_seconds'] = ad.seconds_to_min_hrs(t)

    if print_metrics:
        print()
        print('Results:')
        print(output)

    return output


def main(args):
    """Main function to be called from command line"""
    return get_audio_offset(
        files=args.files,
        destination=args.destination,
        technique=args.technique,
        filter_matches=args.filter_matches,
        locality=args.locality,
        write_results=args.write_results,
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
        threshold=args.threshold,
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
parser = argparse.ArgumentParser(description="Get the offset of an audio file respect to another.")
parser.add_argument(
    "-f",
    "--files",
    type=str,
    help="directory to process",
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
    "-t",
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
    type=bool,
    help="If present, print some metrics",
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
    "-r",
    "--threshold",
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
