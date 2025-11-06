#!/bin/bash
# Asset Generation Script for Noteece
# Converts SVG source files to PNG assets at various sizes

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../assets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🎨 Noteece Asset Generator"
echo "=========================="
echo ""

# Check for required tools
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 not found${NC}"
        echo "   Install with: $2"
        return 1
    else
        echo -e "${GREEN}✅ $1 found${NC}"
        return 0
    fi
}

echo "Checking for required tools..."
HAS_TOOLS=true

# Check for ImageMagick or Inkscape (prefer Inkscape for SVG)
if check_tool "inkscape" "sudo apt-get install inkscape"; then
    CONVERTER="inkscape"
elif check_tool "convert" "sudo apt-get install imagemagick"; then
    CONVERTER="imagemagick"
    echo -e "${YELLOW}⚠️  Using ImageMagick. Inkscape recommended for better SVG rendering${NC}"
else
    HAS_TOOLS=false
fi

if [ "$HAS_TOOLS" = false ]; then
    echo ""
    echo -e "${RED}Missing required tools. Please install one of:${NC}"
    echo "  - Inkscape: https://inkscape.org/release/"
    echo "  - ImageMagick: https://imagemagick.org/"
    exit 1
fi

echo ""

# Function to convert SVG to PNG using available tool
convert_svg() {
    local input=$1
    local output=$2
    local size=$3

    echo "Converting $input to $output at ${size}x${size}..."

    if [ "$CONVERTER" = "inkscape" ]; then
        inkscape "$input" \
            --export-filename="$output" \
            --export-width=$size \
            --export-height=$size \
            --export-background-opacity=1.0 \
            2>/dev/null || {
                echo -e "${RED}Failed to convert $input${NC}"
                return 1
            }
    else
        # ImageMagick
        convert -background none \
            -density 300 \
            -resize ${size}x${size} \
            "$input" "$output" || {
                echo -e "${RED}Failed to convert $input${NC}"
                return 1
            }
    fi

    echo -e "${GREEN}✓ Generated $output${NC}"
}

# Generate app icon at 1024x1024
echo "📱 Generating app icon..."
convert_svg "$ASSETS_DIR/icon-source.svg" "$ASSETS_DIR/icon.png" 1024
echo ""

# Generate splash screen at 2048x2048 (or try lower if memory limited)
echo "🖼️  Generating splash screen..."
if convert_svg "$ASSETS_DIR/splash-source.svg" "$ASSETS_DIR/splash.png" 2048; then
    echo ""
else
    echo "Trying smaller size due to memory constraints..."
    convert_svg "$ASSETS_DIR/splash-source.svg" "$ASSETS_DIR/splash.png" 1536
    echo ""
fi

# Generate adaptive icon foreground
echo "🤖 Generating Android adaptive icon..."
convert_svg "$ASSETS_DIR/adaptive-icon-foreground.svg" "$ASSETS_DIR/adaptive-icon.png" 1024
echo ""

# Generate favicon for web (48x48)
echo "🌐 Generating favicon..."
convert_svg "$ASSETS_DIR/icon-source.svg" "$ASSETS_DIR/favicon.png" 48
echo ""

# Optional: Generate additional sizes for different platforms
echo "📦 Generating platform-specific sizes..."

# iOS App Icon sizes (for manual use if needed)
mkdir -p "$ASSETS_DIR/ios-sizes"
for size in 20 29 40 58 60 76 80 87 120 152 167 180 1024; do
    convert_svg "$ASSETS_DIR/icon-source.svg" "$ASSETS_DIR/ios-sizes/icon-${size}.png" $size
done
echo -e "${GREEN}✓ Generated iOS sizes${NC}"

# Android launcher icon sizes
mkdir -p "$ASSETS_DIR/android-sizes"
for size in 48 72 96 144 192; do
    convert_svg "$ASSETS_DIR/icon-source.svg" "$ASSETS_DIR/android-sizes/icon-${size}.png" $size
done
echo -e "${GREEN}✓ Generated Android sizes${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}✅ Asset generation complete!${NC}"
echo ""
echo "Generated assets:"
echo "  - icon.png (1024x1024) - Main app icon"
echo "  - splash.png - Splash screen"
echo "  - adaptive-icon.png (1024x1024) - Android adaptive icon"
echo "  - favicon.png (48x48) - Web favicon"
echo "  - ios-sizes/ - Various iOS icon sizes"
echo "  - android-sizes/ - Various Android icon sizes"
echo ""
echo "Next steps:"
echo "  1. Review generated assets visually"
echo "  2. Test on device: npx expo start"
echo "  3. Update app.json if needed"
echo "  4. Build for production: eas build"
echo ""
