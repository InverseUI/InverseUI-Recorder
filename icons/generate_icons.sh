#!/bin/bash

# Icon generation script
# Usage: ./generate_icons.sh <source_image>

if [ -z "$1" ]; then
    echo "Usage: $0 <source_image>"
    exit 1
fi

SOURCE_IMAGE="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image '$SOURCE_IMAGE' not found"
    exit 1
fi

# Icon sizes for Chrome extensions
SIZES=(16 32 48 64 128)

echo "Generating icons from: $SOURCE_IMAGE"
echo "Output directory: $SCRIPT_DIR"

for size in "${SIZES[@]}"; do
    output_file="$SCRIPT_DIR/icon-${size}.png"
    echo "Creating ${size}x${size} icon..."
    sips -z $size $size "$SOURCE_IMAGE" --out "$output_file" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo "✓ Created: icon-${size}.png"
    else
        echo "✗ Failed to create: icon-${size}.png"
    fi
done

echo "Done!"
