from abc import ABC, abstractmethod
from typing import NewType, Optional
from utils.ENUMS import DEFAULT_OUTPUT_FPS, DEFAULT_OUTPUT_WIDTH

# Types #
OutputPath = NewType('OutputPath', str)

class BaseVideoDownsampler(ABC):
    def __init__(self):
        self.result_path: Optional[OutputPath] = None  # Type hint for result_path

    @abstractmethod
    def process(self, input_file, output_dir, output_filename,
                output_width=DEFAULT_OUTPUT_WIDTH,
                output_fps=DEFAULT_OUTPUT_FPS) -> Optional[OutputPath]:  # Using Optional instead of Union
        pass
