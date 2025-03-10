#!/bin/bash
set -e

# Create output directory if it doesn't exist
mkdir -p out

echo "Building Docker images for all platforms..."

# Build Windows image
echo "Building Windows Docker image..."
docker build -t robotics-contributors-win -f Dockerfile.windows .

# Build macOS image
echo "Building macOS Docker image..."
docker build -t robotics-contributors-mac -f Dockerfile.macos .

# Build Linux image
echo "Building Linux Docker image..."
docker build -t robotics-contributors-linux -f Dockerfile.linux .

# Run builds
echo "Building Windows app..."
docker run --rm -v "$(pwd)/out:/app/out" robotics-contributors-win

echo "Building macOS app..."
docker run --rm -v "$(pwd)/out:/app/out" robotics-contributors-mac

echo "Building Linux app..."
docker run --rm -v "$(pwd)/out:/app/out" robotics-contributors-linux

echo "All builds completed! Check the 'out' directory for results."