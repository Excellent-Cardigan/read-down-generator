#!/bin/bash

# Create placeholder preview images using ImageMagick (if available) or simple solid colors
OUTPUT_DIR="public/images/ai-previews"
mkdir -p "$OUTPUT_DIR"

# If ImageMagick is available, use it to create gradient placeholders
if command -v convert &> /dev/null; then
  echo "Creating placeholder previews with ImageMagick..."
  
  # Diagonal Gradient
  convert -size 400x512 gradient:#707070-#909090 -rotate -45 "$OUTPUT_DIR/diagonal-gradient.jpg"
  
  # Blurred Mist
  convert -size 400x512 xc:#808080 -blur 0x50 "$OUTPUT_DIR/blurred-mist.jpg"
  
  # Atmospheric Haze
  convert -size 400x512 xc:#808080 -attenuate 0.3 +noise Gaussian -blur 0x20 "$OUTPUT_DIR/atmospheric-haze.jpg"
  
  # Center Glow
  convert -size 400x512 radial-gradient:#A0A0A0-#606060 "$OUTPUT_DIR/center-glow.jpg"
  
  # Corner Vignette
  convert -size 400x512 radial-gradient:#606060-#A0A0A0 -negate "$OUTPUT_DIR/corner-vignette.jpg"
  
  # Vertical Wavy
  convert -size 400x512 gradient:#707070-#909090 -rotate 90 "$OUTPUT_DIR/vertical-wavy.jpg"
  
  # Extreme Blur
  convert -size 400x512 xc:#808080 -blur 0x80 "$OUTPUT_DIR/extreme-blur.jpg"
  
  echo "✓ Created all placeholder previews"
else
  echo "ImageMagick not found. Creating simple gray placeholders..."
  
  # Use a simple approach with a gray pixel pattern
  for file in diagonal-gradient blurred-mist atmospheric-haze center-glow corner-vignette vertical-wavy extreme-blur; do
    convert -size 400x512 xc:#808080 "$OUTPUT_DIR/${file}.jpg" 2>/dev/null || echo "  - ${file}.jpg (needs ImageMagick)"
  done
fi

ls -lh "$OUTPUT_DIR"
