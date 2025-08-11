
import {
  loadImage,
  tintImage,
  seededRandom,
  drawOverlayRect,
  drawBookGradientOverlay,
  wrapText,
  getContrastRatio,
  hexToRgb
} from '../../utils/patternUtils';

/**
 * Generates a master pattern and crops it to specified dimensions.
 * For Homepage size (1200x628), also overlays book covers.
 */
export async function generatePatternFromSettings(uploadedImages, objectColors, backgroundColor, targetSizes, books = [], emailVariant = 'text', overlayStyle = 'transparent', seed = Math.random(), fontSize = 80, lineHeight = 96, overlayText = '', blurAmount = 0, ditherAmount = 0, overlayAlpha = 0.8) {
  const MASTER_SIZE = 2400;
  const BOOK_SHADOW = 'drop-shadow(-8px 12px 16px rgba(10, 10, 10, 0.36))';
  
  // Use seeded random for consistent patterns
  let currentSeed = seed;
  const nextRandom = () => {
    currentSeed = seededRandom(currentSeed * 9999);
    return currentSeed;
  };

  // Pick overlay color ONCE for all sizes if overlayStyle is 'solid'
  let batchOverlayColor = null;
  if (overlayStyle === 'solid') {
    const availableColors = [...objectColors, backgroundColor];
    const randomColorIndex = Math.floor(nextRandom() * availableColors.length);
    batchOverlayColor = availableColors[randomColorIndex];
  }

  const OBJECT_COUNT = 3 + Math.floor(nextRandom() * 118); // Random between 3 and 120

  // 1. Load all uploaded images from their source (File or URL)
  const sourceImages = await Promise.all(uploadedImages.map(img => loadImage(img.source)));

  // 2. Create the master canvas
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = MASTER_SIZE;
  masterCanvas.height = MASTER_SIZE;
  const masterCtx = masterCanvas.getContext('2d');

  // 3. Draw background
  masterCtx.fillStyle = backgroundColor;
  masterCtx.fillRect(0, 0, MASTER_SIZE, MASTER_SIZE);

  // 4. Draw patterns - optimized loop with seeded randomness
  for (let i = 0; i < OBJECT_COUNT; i++) {
    const sourceImage = sourceImages[Math.floor(nextRandom() * sourceImages.length)];
    const color = objectColors[Math.floor(nextRandom() * objectColors.length)];
    const scale = 0.02 + nextRandom() * 0.48; // Increased range for more randomness
    const size = MASTER_SIZE * scale;
    const x = nextRandom() * MASTER_SIZE;
    const y = nextRandom() * MASTER_SIZE;
    const rotation = nextRandom() * 2 * Math.PI;

    const tintedImageCanvas = tintImage(sourceImage, color);
    
    masterCtx.save();
    masterCtx.translate(x, y);
    masterCtx.rotate(rotation);
    masterCtx.drawImage(tintedImageCanvas, -size / 2, -size / 2, size, size);
    masterCtx.restore();
  }

  // Reusable offscreen canvases for cropping and book overlays
  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d');
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d');

  const croppedPatterns = {};
  for (const size of targetSizes) {
    cropCanvas.width = size.width;
    cropCanvas.height = size.height;
    cropCtx.clearRect(0, 0, size.width, size.height);
    
    // Draw the center-cropped portion of the master canvas
    const sourceX = Math.max(0, (MASTER_SIZE - size.width) / 2);
    const sourceY = Math.max(0, (MASTER_SIZE - size.height) / 2);
    
    if (size.width > MASTER_SIZE || size.height > MASTER_SIZE) {
      const scale = Math.max(size.width / MASTER_SIZE, size.height / MASTER_SIZE);
      const scaledWidth = MASTER_SIZE * scale;
      const scaledHeight = MASTER_SIZE * scale;
      const offsetX = (size.width - scaledWidth) / 2;
      const offsetY = (size.height - scaledHeight) / 2;
      
      cropCtx.drawImage(masterCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
    } else {
      cropCtx.drawImage(
        masterCanvas,
        sourceX, sourceY, size.width, size.height,
        0, 0, size.width, size.height
      );
    }

    // 6. For Homepage size (1200x628), overlay book covers with effects
    if (size.width === 1200 && size.height === 628 && books.length > 0) {
      // Draw overlay FIRST (behind books)
      if (overlayStyle !== 'none') {
        const margin = 24;
        const rectX = margin;
        const rectY = margin;
        const rectWidth = size.width - margin * 2;
        const rectHeight = size.height - margin * 2;
        const cornerRadius = 24;
        if (overlayStyle === 'solid') {
          // Use the batchOverlayColor for all overlays in this batch
          drawOverlayRect(cropCtx, {
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            radius: cornerRadius,
            style: 'solid',
            fillColor: withAlpha(batchOverlayColor, overlayAlpha),
            strokeColor: 'rgba(229, 223, 214, 1)',
            lineWidth: 2
          });
        } else if (overlayStyle === 'transparent') {
          drawOverlayRect(cropCtx, {
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            radius: cornerRadius,
            style: 'transparent',
            fillColor: 'rgba(229, 223, 214, 0.45)',
            strokeColor: 'rgba(229, 223, 214, 1)',
            lineWidth: 2
          });
        }
      }

      // Draw books AFTER overlay (on top)
      const bookImages = await Promise.all((books || []).map(book => loadImage(book.source)));
      const BOOK_HEIGHT = 366;
      const BOOK_SPACING = 30;
      const TOP_MARGIN = (size.height - BOOK_HEIGHT) / 2; // Center vertically
      
      // Calculate total width needed for all books
      const bookWidths = bookImages.map(img => {
        const aspectRatio = img.width / img.height;
        return BOOK_HEIGHT * aspectRatio;
      });
      const totalWidth = bookWidths.reduce((sum, width) => sum + width, 0) + (BOOK_SPACING * (bookImages.length - 1));
      
      // Start X position to center all books horizontally
      let currentX = (size.width - totalWidth) / 2;
      
      // Create a reusable offscreen canvas for processing each book
      // offscreenCanvas.width = bookWidth; // This line is now redundant as offscreenCanvas is global
      // offscreenCanvas.height = BOOK_HEIGHT; // This line is now redundant as offscreenCanvas is global
      // offscreenCtx.clearRect(0, 0, bookWidth, BOOK_HEIGHT); // This line is now redundant as offscreenCtx is global

      // Draw each book
      bookImages.forEach((bookImg, index) => {
        const bookWidth = bookWidths[index];

        // Prepare the offscreen canvas with the rounded book image
        offscreenCanvas.width = bookWidth;
        offscreenCanvas.height = BOOK_HEIGHT;
        offscreenCtx.clearRect(0, 0, bookWidth, BOOK_HEIGHT);

        // Create a rounded rectangle clipping path
        offscreenCtx.beginPath();
        if (offscreenCtx.roundRect) {
            offscreenCtx.roundRect(0, 0, bookWidth, BOOK_HEIGHT, 4);
        } else {
            // Fallback for browsers that don't support roundRect
            offscreenCtx.moveTo(0 + 4, 0);
            offscreenCtx.lineTo(0 + bookWidth - 4, 0);
            offscreenCtx.arcTo(0 + bookWidth, 0, 0 + bookWidth, 0 + 4, 4);
            offscreenCtx.lineTo(0 + bookWidth, 0 + BOOK_HEIGHT - 4);
            offscreenCtx.arcTo(0 + bookWidth, 0 + BOOK_HEIGHT, 0 + bookWidth - 4, 0 + BOOK_HEIGHT, 4);
            offscreenCtx.lineTo(0 + 4, 0 + BOOK_HEIGHT);
            offscreenCtx.arcTo(0, 0 + BOOK_HEIGHT, 0, 0 + BOOK_HEIGHT - 4, 4);
            offscreenCtx.lineTo(0, 0 + 4);
            offscreenCtx.arcTo(0, 0, 0 + 4, 0, 4);
            offscreenCtx.closePath();
        }
        offscreenCtx.clip();
        offscreenCtx.drawImage(bookImg, 0, 0, bookWidth, BOOK_HEIGHT);

        // Add gradient overlay with multiply blend mode
        drawBookGradientOverlay(offscreenCtx, bookWidth, BOOK_HEIGHT);
        
        // Reset composite operation
        offscreenCtx.globalCompositeOperation = 'source-over';

        // Draw the processed book from offscreen canvas onto the main canvas
        // with the specified shadow effect
        cropCtx.save();
        cropCtx.filter = BOOK_SHADOW;
        cropCtx.drawImage(offscreenCanvas, currentX, TOP_MARGIN);
        cropCtx.restore();

        currentX += bookWidth + BOOK_SPACING;
      });
    }
    
    // Add overlay for Email size (1080x1080)
    if (size.width === 1080 && size.height === 1080) {
      // Draw overlay FIRST (behind books)
      if (overlayStyle !== 'none') {
        const margin = 48;
        const rectX = margin;
        const rectY = margin;
        const rectWidth = size.width - margin * 2;
        const rectHeight = size.height - margin * 2;
        const cornerRadius = 24;
        if (overlayStyle === 'solid') {
          drawOverlayRect(cropCtx, {
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            radius: cornerRadius,
            style: 'solid',
            fillColor: withAlpha(batchOverlayColor, overlayAlpha),
            strokeColor: 'rgba(229, 223, 214, 1)',
            lineWidth: 2
          });
        } else if (overlayStyle === 'transparent') {
          drawOverlayRect(cropCtx, {
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            radius: cornerRadius,
            style: 'transparent',
            fillColor: 'rgba(229, 223, 214, 0.45)',
            strokeColor: 'rgba(229, 223, 214, 1)',
            lineWidth: 2
          });
        }
        // Draw overlay text for emailVariant === 'text'
        if (emailVariant === 'text') {
          cropCtx.save();
          cropCtx.font = `${fontSize || 80}px 'Shift', Georgia, serif`;
          // Determine overlay background color
          let overlayBg;
          if (overlayStyle === 'solid') {
            overlayBg = batchOverlayColor;
          } else {
            overlayBg = '#e5dfd6'; // rgba(229, 223, 214, 0.45) fallback to solid for contrast calc
          }
          // Find best text color (black, white, or palette color) with contrast >= 4.5
          const bgRgb = hexToRgb(overlayBg);
          const candidates = ['#000000', '#FFFFFF', ...objectColors];
          let bestColor = '#000000';
          let bestContrast = 0;
          for (const color of candidates) {
            const rgb = hexToRgb(color);
            if (!rgb) continue;
            const contrast = getContrastRatio(
              (rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722) / 255,
              (bgRgb.r * 0.2126 + bgRgb.g * 0.7152 + bgRgb.b * 0.0722) / 255
            );
            if (contrast >= 4.5 && contrast > bestContrast) {
              bestContrast = contrast;
              bestColor = color;
            }
          }
          // If no palette color passes, fallback to black or white with best contrast
          if (bestContrast < 4.5) {
            const blackContrast = getContrastRatio(0, (bgRgb.r * 0.2126 + bgRgb.g * 0.7152 + bgRgb.b * 0.0722) / 255);
            const whiteContrast = getContrastRatio(1, (bgRgb.r * 0.2126 + bgRgb.g * 0.7152 + bgRgb.b * 0.0722) / 255);
            bestColor = blackContrast > whiteContrast ? '#000000' : '#FFFFFF';
          }
          cropCtx.fillStyle = bestColor;
          const textCenterX = rectX + rectWidth / 2;
          const textCenterY = rectY + rectHeight / 2;
          const textMaxWidth = rectWidth - 192; // 96px padding on each side
          wrapText(cropCtx, overlayText || '', textCenterX, textCenterY, textMaxWidth, lineHeight || 96, -2);
          cropCtx.restore();
        }
      }

      // Draw books AFTER overlay (on top)
      if (emailVariant === 'books' && (books || []).length > 0 && overlayStyle !== 'none') {
        const bookImages = await Promise.all((books || []).slice(0, 4).map(book => loadImage(book.source)));
        const gridGap = 30;
        const margin = 48; // Re-use margin from overlay calculation
        const rectX = margin;
        const rectY = margin;
        const rectWidth = size.width - margin * 2;
        const rectHeight = size.height - margin * 2;

        const contentAreaX = rectX + gridGap;
        const contentAreaY = rectY + gridGap;
        const contentAreaWidth = rectWidth - (gridGap * 2);
        const contentAreaHeight = rectHeight - (gridGap * 2);

        const cellWidth = (contentAreaWidth - gridGap) / 2;
        const cellHeight = (contentAreaHeight - gridGap) / 2;

        // offscreenCanvas.width = bookWidth; // This line is now redundant as offscreenCanvas is global
        // offscreenCanvas.height = bookHeight; // This line is now redundant as offscreenCanvas is global
        // offscreenCtx.clearRect(0, 0, bookWidth, bookHeight); // This line is now redundant as offscreenCtx is global

        bookImages.forEach((bookImg, index) => {
          if (index >= 4) return; // Only process up to 4 books
          const row = Math.floor(index / 2);
          const col = index % 2;

          let bookWidth, bookHeight;
          const bookAspectRatio = bookImg.width / bookImg.height;
          const cellAspectRatio = cellWidth / cellHeight;

          // Determine book dimensions to fit within cell while maintaining aspect ratio
          if (bookAspectRatio > cellAspectRatio) {
            bookWidth = cellWidth;
            bookHeight = bookWidth / bookAspectRatio;
          } else {
            bookHeight = cellHeight;
            bookWidth = bookHeight * bookAspectRatio;
          }
          
          const cellX = contentAreaX + col * (cellWidth + gridGap);
          const cellY = contentAreaY + row * (cellHeight + gridGap);

          // Align books towards the center to create a fixed 30px gap
          let bookX, bookY;

          // Horizontal alignment
          if (col === 0) { // Left column
            bookX = cellX + cellWidth - bookWidth; // Align right
          } else { // Right column
            bookX = cellX; // Align left
          }

          // Vertical alignment
          if (row === 0) { // Top row
            bookY = cellY + cellHeight - bookHeight; // Align bottom
          } else { // Bottom row
            bookY = cellY; // Align top
          }

          // Create a new offscreen canvas for each book
          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = bookWidth;
          offscreenCanvas.height = bookHeight;
          const offscreenCtx = offscreenCanvas.getContext('2d');

          // Create a rounded rectangle clipping path
          offscreenCtx.beginPath();
          if (offscreenCtx.roundRect) {
              offscreenCtx.roundRect(0, 0, bookWidth, bookHeight, 4);
          } else {
              // Fallback for browsers that don't support roundRect
              offscreenCtx.moveTo(0 + 4, 0);
              offscreenCtx.lineTo(0 + bookWidth - 4, 0);
              offscreenCtx.arcTo(0 + bookWidth, 0, 0 + bookWidth, 0 + 4, 4);
              offscreenCtx.lineTo(0 + bookWidth, 0 + bookHeight - 4);
              offscreenCtx.arcTo(0 + bookWidth, 0 + bookHeight, 0 + bookWidth - 4, 0 + bookHeight, 4);
              offscreenCtx.lineTo(0 + 4, 0 + bookHeight);
              offscreenCtx.arcTo(0, 0 + bookHeight, 0, 0 + bookHeight - 4, 4);
              offscreenCtx.lineTo(0, 0 + 4);
              offscreenCtx.arcTo(0, 0, 0 + 4, 0, 4);
              offscreenCtx.closePath();
          }
          offscreenCtx.clip();
          offscreenCtx.drawImage(bookImg, 0, 0, bookWidth, bookHeight);

          // Add gradient overlay with multiply blend mode
          drawBookGradientOverlay(offscreenCtx, bookWidth, bookHeight);
          
          // Reset composite operation
          offscreenCtx.globalCompositeOperation = 'source-over';

          // Draw the processed book from offscreen canvas onto the main canvas
          cropCtx.save();
          cropCtx.filter = BOOK_SHADOW; // Updated shadow for consistency
          cropCtx.drawImage(offscreenCanvas, bookX, bookY);
          cropCtx.restore();
        });
      }
    }
    
    // Apply global blur and dither
    if (blurAmount > 0) {
      cropCtx.save();
      cropCtx.filter = `blur(${blurAmount}px)`;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropCanvas.width;
      tempCanvas.height = cropCanvas.height;
      tempCanvas.getContext('2d').drawImage(cropCanvas, 0, 0);
      cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
      cropCtx.drawImage(tempCanvas, 0, 0);
      cropCtx.filter = 'none';
      cropCtx.restore();
    }
    if (ditherAmount > 0) {
      const imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
      applyDither(imageData, ditherAmount);
      cropCtx.putImageData(imageData, 0, 0);
    }

    const key = `${size.width}x${size.height}`;
    croppedPatterns[key] = cropCanvas.toDataURL('image/png');
  }

  return croppedPatterns;
}

// 1. Generate background pattern for a given size (no overlay)
export async function generateBackgroundPattern(uploadedImages, objectColors, backgroundColor, size, seed = Math.random(), blurAmount = 0, ditherAmount = 0) {
  const MASTER_SIZE = 2400;
  let currentSeed = seed;
  const nextRandom = () => {
    currentSeed = seededRandom(currentSeed * 9999);
    return currentSeed;
  };
  const OBJECT_COUNT = 3 + Math.floor(nextRandom() * 118);
  const sourceImages = await Promise.all(uploadedImages.map(img => loadImage(img.source)));
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = MASTER_SIZE;
  masterCanvas.height = MASTER_SIZE;
  const masterCtx = masterCanvas.getContext('2d');
  masterCtx.fillStyle = backgroundColor;
  masterCtx.fillRect(0, 0, MASTER_SIZE, MASTER_SIZE);
  for (let i = 0; i < OBJECT_COUNT; i++) {
    const sourceImage = sourceImages[Math.floor(nextRandom() * sourceImages.length)];
    const color = objectColors[Math.floor(nextRandom() * objectColors.length)];
    const scale = 0.02 + nextRandom() * 0.48;
    const sizePx = MASTER_SIZE * scale;
    const x = nextRandom() * MASTER_SIZE;
    const y = nextRandom() * MASTER_SIZE;
    const rotation = nextRandom() * 2 * Math.PI;
    const tintedImageCanvas = tintImage(sourceImage, color);
    masterCtx.save();
    masterCtx.translate(x, y);
    masterCtx.rotate(rotation);
    masterCtx.drawImage(tintedImageCanvas, -sizePx / 2, -sizePx / 2, sizePx, sizePx);
    masterCtx.restore();
  }
  // Crop to target size
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = size.width;
  cropCanvas.height = size.height;
  const cropCtx = cropCanvas.getContext('2d');
  const sourceX = Math.max(0, (MASTER_SIZE - size.width) / 2);
  const sourceY = Math.max(0, (MASTER_SIZE - size.height) / 2);
  if (size.width > MASTER_SIZE || size.height > MASTER_SIZE) {
    const scale = Math.max(size.width / MASTER_SIZE, size.height / MASTER_SIZE);
    const scaledWidth = MASTER_SIZE * scale;
    const scaledHeight = MASTER_SIZE * scale;
    const offsetX = (size.width - scaledWidth) / 2;
    const offsetY = (size.height - scaledHeight) / 2;
    cropCtx.drawImage(masterCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
  } else {
    cropCtx.drawImage(
      masterCanvas,
      sourceX, sourceY, size.width, size.height,
      0, 0, size.width, size.height
    );
  }
  // Apply blur/dither if needed
  if (blurAmount > 0) {
    cropCtx.save();
    cropCtx.filter = `blur(${blurAmount}px)`;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropCanvas.width;
    tempCanvas.height = cropCanvas.height;
    tempCanvas.getContext('2d').drawImage(cropCanvas, 0, 0);
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.drawImage(tempCanvas, 0, 0);
    cropCtx.filter = 'none';
    cropCtx.restore();
  }
  if (ditherAmount > 0) {
    const imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
    applyDither(imageData, ditherAmount);
    cropCtx.putImageData(imageData, 0, 0);
  }
  return cropCanvas.toDataURL('image/png');
}

// 2. Composite overlay (text/books) on a given background image/canvas
export async function compositeOverlayOnBackground({
  backgroundDataUrl,
  size,
  overlayStyle,
  objectColors = [],
  // backgroundColor = '#ffffff', // unused parameter
  books = [],
  emailVariant = 'text',
  fontSize = 80,
  lineHeight = 96,
  overlayText = '',
  batchOverlayColor = null,
  overlayAlpha = 1,
}) {
  const BOOK_SHADOW = 'drop-shadow(-8px 12px 16px rgba(10, 10, 10, 0.36))';
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = size.width;
  cropCanvas.height = size.height;
  const cropCtx = cropCanvas.getContext('2d');
  // Draw the background
  const bgImg = await loadImage(backgroundDataUrl);
  cropCtx.drawImage(bgImg, 0, 0, size.width, size.height);

  // --- Draw overlay rectangle FIRST (behind books) for all sizes ---
  if (overlayStyle !== 'none') {
    // Use same margin/corner logic as before, but draw first
    let margin = 24;
    let cornerRadius = 24;
    if (size.width === 1080 && size.height === 1080) margin = 48;
    const rectX = margin;
    const rectY = margin;
    const rectWidth = size.width - margin * 2;
    const rectHeight = size.height - margin * 2;
    if (overlayStyle === 'solid') {
      drawOverlayRect(cropCtx, {
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        radius: cornerRadius,
        style: 'solid',
        fillColor: withAlpha(batchOverlayColor, overlayAlpha),
        strokeColor: 'rgba(229, 223, 214, 1)',
        lineWidth: 2
      });
    } else if (overlayStyle === 'transparent') {
      drawOverlayRect(cropCtx, {
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        radius: cornerRadius,
        style: 'transparent',
        fillColor: 'rgba(229, 223, 214, 0.45)',
        strokeColor: 'rgba(229, 223, 214, 1)',
        lineWidth: 2
      });
    }
  }

  // --- Draw books AFTER overlay (on top) ---
  // Homepage (1200x628) - books overlay
  if (size.width === 1200 && size.height === 628 && books.length > 0) {
    // Book covers logic (same as before)
    const bookImages = await Promise.all((books || []).map(book => loadImage(book.source)));
    const BOOK_HEIGHT = 366;
    const BOOK_SPACING = 30;
    const TOP_MARGIN = (size.height - BOOK_HEIGHT) / 2;
    const bookWidths = bookImages.map(img => {
      const aspectRatio = img.width / img.height;
      return BOOK_HEIGHT * aspectRatio;
    });
    const totalWidth = bookWidths.reduce((sum, width) => sum + width, 0) + (BOOK_SPACING * (bookImages.length - 1));
    let currentX = (size.width - totalWidth) / 2;
    bookImages.forEach((bookImg, index) => {
      const bookWidth = bookWidths[index];
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = bookWidth;
      offscreenCanvas.height = BOOK_HEIGHT;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      offscreenCtx.beginPath();
      if (offscreenCtx.roundRect) {
        offscreenCtx.roundRect(0, 0, bookWidth, BOOK_HEIGHT, 4);
      } else {
        offscreenCtx.moveTo(0 + 4, 0);
        offscreenCtx.lineTo(0 + bookWidth - 4, 0);
        offscreenCtx.arcTo(0 + bookWidth, 0, 0 + bookWidth, 0 + 4, 4);
        offscreenCtx.lineTo(0 + bookWidth, 0 + BOOK_HEIGHT - 4);
        offscreenCtx.arcTo(0 + bookWidth, 0 + BOOK_HEIGHT, 0 + bookWidth - 4, 0 + BOOK_HEIGHT, 4);
        offscreenCtx.lineTo(0 + 4, 0 + BOOK_HEIGHT);
        offscreenCtx.arcTo(0, 0 + BOOK_HEIGHT, 0, 0 + BOOK_HEIGHT - 4, 4);
        offscreenCtx.lineTo(0, 0 + 4);
        offscreenCtx.arcTo(0, 0, 0 + 4, 0, 4);
        offscreenCtx.closePath();
      }
      offscreenCtx.clip();
      offscreenCtx.drawImage(bookImg, 0, 0, bookWidth, BOOK_HEIGHT);
      drawBookGradientOverlay(offscreenCtx, bookWidth, BOOK_HEIGHT);
      offscreenCtx.globalCompositeOperation = 'source-over';
      cropCtx.save();
      cropCtx.filter = BOOK_SHADOW;
      cropCtx.drawImage(offscreenCanvas, currentX, TOP_MARGIN);
      cropCtx.restore();
      currentX += bookWidth + BOOK_SPACING;
    });
  }

  // --- Email size (1080x1080) overlay handling ---
  if (size.width === 1080 && size.height === 1080 && overlayStyle !== 'none') {
    const margin = 48;
    const rectX = margin;
    const rectY = margin;
    const rectWidth = size.width - margin * 2;
    const rectHeight = size.height - margin * 2;
    
    // Draw overlay text for emailVariant === 'text'
    if (emailVariant === 'text') {
      cropCtx.save();
      cropCtx.font = `${fontSize || 80}px 'Shift', Georgia, serif`;
      // Determine overlay background color
      let overlayBg;
      if (overlayStyle === 'solid') {
        overlayBg = batchOverlayColor;
      } else {
        overlayBg = '#e5dfd6'; // rgba(229, 223, 214, 0.45) fallback to solid for contrast calc
      }
      // Find best text color (black, white, or palette color) with contrast >= 4.5
      const bgRgb = hexToRgb(overlayBg);
      const candidates = ['#000000', '#FFFFFF', ...objectColors];
      let bestColor = '#000000';
      let bestContrast = 0;
      for (const color of candidates) {
        const rgb = hexToRgb(color);
        if (!rgb) continue;
        const contrast = getContrastRatio(
          (rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722) / 255,
          (bgRgb.r * 0.2126 + bgRgb.g * 0.7152 + bgRgb.b * 0.0722) / 255
        );
        if (contrast >= 4.5 && contrast > bestContrast) {
          bestContrast = contrast;
          bestColor = color;
        }
      }
      // If no palette color passes, fallback to black or white with best contrast
      if (bestContrast < 4.5) {
        const blackContrast = getContrastRatio(0, (bgRgb.r * 0.2126 + bgRgb.g * 0.7152 + bgRgb.b * 0.0722) / 255);
        const whiteContrast = getContrastRatio(1, (bgRgb.r * 0.2126 + bgRgb.g * 0.7152 + bgRgb.b * 0.0722) / 255);
        bestColor = blackContrast > whiteContrast ? '#000000' : '#FFFFFF';
      }
      cropCtx.fillStyle = bestColor;
      const textCenterX = rectX + rectWidth / 2;
      const textCenterY = rectY + rectHeight / 2;
      const textMaxWidth = rectWidth - 192; // 96px padding on each side
      wrapText(cropCtx, overlayText || '', textCenterX, textCenterY, textMaxWidth, lineHeight || 96, -2);
      cropCtx.restore();
    }

    // Draw books AFTER overlay (on top) for emailVariant === 'books'
    if (emailVariant === 'books' && (books || []).length > 0) {
      const bookImages = await Promise.all((books || []).slice(0, 4).map(book => loadImage(book.source)));
      const gridGap = 30;
      const contentAreaX = rectX + gridGap;
      const contentAreaY = rectY + gridGap;
      const contentAreaWidth = rectWidth - (gridGap * 2);
      const contentAreaHeight = rectHeight - (gridGap * 2);

      const cellWidth = (contentAreaWidth - gridGap) / 2;
      const cellHeight = (contentAreaHeight - gridGap) / 2;

      bookImages.forEach((bookImg, index) => {
        if (index >= 4) return; // Only process up to 4 books
        const row = Math.floor(index / 2);
        const col = index % 2;

        let bookWidth, bookHeight;
        const bookAspectRatio = bookImg.width / bookImg.height;
        const cellAspectRatio = cellWidth / cellHeight;

        // Determine book dimensions to fit within cell while maintaining aspect ratio
        if (bookAspectRatio > cellAspectRatio) {
          bookWidth = cellWidth;
          bookHeight = bookWidth / bookAspectRatio;
        } else {
          bookHeight = cellHeight;
          bookWidth = bookHeight * bookAspectRatio;
        }
        
        const cellX = contentAreaX + col * (cellWidth + gridGap);
        const cellY = contentAreaY + row * (cellHeight + gridGap);

        // Align books towards the center to create a fixed 30px gap
        let bookX, bookY;

        // Horizontal alignment
        if (col === 0) { // Left column
          bookX = cellX + cellWidth - bookWidth; // Align right
        } else { // Right column
          bookX = cellX; // Align left
        }

        // Vertical alignment
        if (row === 0) { // Top row
          bookY = cellY + cellHeight - bookHeight; // Align bottom
        } else { // Bottom row
          bookY = cellY; // Align top
        }

        // Create a new offscreen canvas for each book
        const bookCanvas = document.createElement('canvas');
        bookCanvas.width = bookWidth;
        bookCanvas.height = bookHeight;
        const bookCtx = bookCanvas.getContext('2d');

        // Create a rounded rectangle clipping path
        bookCtx.beginPath();
        if (bookCtx.roundRect) {
            bookCtx.roundRect(0, 0, bookWidth, bookHeight, 4);
        } else {
            // Fallback for browsers that don't support roundRect
            bookCtx.moveTo(0 + 4, 0);
            bookCtx.lineTo(0 + bookWidth - 4, 0);
            bookCtx.arcTo(0 + bookWidth, 0, 0 + bookWidth, 0 + 4, 4);
            bookCtx.lineTo(0 + bookWidth, 0 + bookHeight - 4);
            bookCtx.arcTo(0 + bookWidth, 0 + bookHeight, 0 + bookWidth - 4, 0 + bookHeight, 4);
            bookCtx.lineTo(0 + 4, 0 + bookHeight);
            bookCtx.arcTo(0, 0 + bookHeight, 0, 0 + bookHeight - 4, 4);
            bookCtx.lineTo(0, 0 + 4);
            bookCtx.arcTo(0, 0, 0 + 4, 0, 4);
            bookCtx.closePath();
        }
        bookCtx.clip();
        bookCtx.drawImage(bookImg, 0, 0, bookWidth, bookHeight);

        // Add gradient overlay with multiply blend mode
        drawBookGradientOverlay(bookCtx, bookWidth, bookHeight);
        
        // Reset composite operation
        bookCtx.globalCompositeOperation = 'source-over';

        // Draw the processed book from offscreen canvas onto the main canvas
        cropCtx.save();
        cropCtx.filter = BOOK_SHADOW;
        cropCtx.drawImage(bookCanvas, bookX, bookY);
        cropCtx.restore();
      });
    }
  }

  return cropCanvas.toDataURL('image/png');
}

function applyDither(imageData, amount) {
  // Simple random threshold dithering
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const noise = (Math.random() - 0.5) * 255 * amount;
      let value = data[i + c] + noise;
      value = Math.round(value / 16) * 16; // Quantize to 16 levels
      data[i + c] = Math.max(0, Math.min(255, value));
    }
  }
}

// Bulletproof withAlpha helper for all color formats
function withAlpha(color, alpha) {
  if (!color) return color;
  if (color.startsWith('rgba')) {
    // Already has alpha, replace it
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
  }
  if (color.startsWith('rgb')) {
    // rgb(255, 0, 0) -> rgba(255, 0, 0, alpha)
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${alpha})`;
    }
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  if (color.startsWith('hsla')) {
    return color.replace(/hsla\(([^)]+),\s*[\d.]+\)/, `hsla($1, ${alpha})`);
  }
  if (color.startsWith('hsl')) {
    // hsl(24 100% 50%) or hsl(24, 100%, 50%) -> hsla(24, 100%, 50%, alpha)
    return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  }
  if (color.startsWith('#')) {
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}
