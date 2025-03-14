# !/bin/bash

# Actualizar Homebrew
brew update

# Instalar Python 3.9
brew install python@3.9

# Enlazar Python 3.9 a /usr/local/bin para usarlo fácilmente
brew link --overwrite --force python@3.9

brew install portaudio

# Verificar la instalación
python3.9 --version

# Create venv in the expected location
python3.9 -m venv venv
source venv/bin/activate

# install libraries
pip install -r requirements.txt