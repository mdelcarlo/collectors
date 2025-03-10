
from abc import ABC, abstractmethod
from typing import NewType
from utils.ENUMS import DEFAULT_OUTPUT_FPS, DEFAULT_OUTPUT_WIDTH

# Types #
OutputPath = NewType('OutputPath', str)

class BaseVideoDownsampler (ABC):
    def __init__(self):
        self.result_path = None

    @abstractmethod
    def process(self, input_file, output_dir, output_filename,
                output_width=DEFAULT_OUTPUT_WIDTH,
                output_fps=DEFAULT_OUTPUT_FPS) -> OutputPath | None:
        pass


