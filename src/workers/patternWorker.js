// Pattern Generation Web Worker
// This worker handles CPU-intensive pattern generation tasks

// Import pattern generation utilities
import {
  loadImage,
  tintImage,
  seededRandom,
  drawOverlayRect,
  drawBookGradientOverlay,
  wrapText,
  getContrastRatio,
  hexToRgb
} from '../utils/patternUtils';

// Worker message handler
self.onmessage = async function(e) {
  const { type, payload, id } = e.data;
  
  try {
    let result;
    switch (type) {
      case 'GENERATE_BACKGROUND':
        result = await generateBackgroundPattern(
          payload.images,
          payload.objectColors,
          payload.backgroundColor,
          payload.size,
          payload.seed
        );
        self.postMessage({
          type: 'BACKGROUND_GENERATED',
          payload: result,
          id
        });
        break;
        
      case 'COMPOSITE_OVERLAY':
        result = await compositeOverlayOnBackground(payload);
        self.postMessage({
          type: 'OVERLAY_COMPOSITED',
          payload: result,
          id
        });
        break;
        
      case 'GENERATE_PATTERN_BATCH':
        result = await generatePatternBatch(payload);
        self.postMessage({
          type: 'BATCH_COMPLETED',
          payload: result,
          id
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('Worker error details:', error);
    self.postMessage({
      type: 'ERROR',
      payload: {
        message: error.message,
        stack: error.stack,
        type: type,
        payloadKeys: payload ? Object.keys(payload) : 'no payload'
      },
      id
    });
  }
};

// Generate background pattern (moved from patternGenerator.jsx)
async function generateBackgroundPattern(uploadedImages, objectColors, backgroundColor, size, seed = Math.random()) {
  const MASTER_SIZE = 2400;
  
  // Use seeded random for consistent patterns
  let currentSeed = seed;
  const nextRandom = () => {
    currentSeed = seededRandom(currentSeed * 9999);
    return currentSeed;
  };

  const OBJECT_COUNT = 3 + Math.floor(nextRandom() * 118); // Random between 3 and 120

  // Load all uploaded images (use blob if available, fallback to source)
  const sourceImages = await Promise.all((uploadedImages || []).map(img => loadImage(img.blob || img.source)));

  // Create the master canvas
  const masterCanvas = new OffscreenCanvas(MASTER_SIZE, MASTER_SIZE);
  const masterCtx = masterCanvas.getContext('2d');

  // Draw background
  masterCtx.fillStyle = backgroundColor;
  masterCtx.fillRect(0, 0, MASTER_SIZE, MASTER_SIZE);

  // Draw patterns
  for (let i = 0; i < OBJECT_COUNT; i++) {
    const sourceImage = sourceImages[Math.floor(nextRandom() * sourceImages.length)];
    const color = objectColors[Math.floor(nextRandom() * objectColors.length)];
    const scale = 0.02 + nextRandom() * 0.48;
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

  // Crop to target size
  const cropCanvas = new OffscreenCanvas(size.width, size.height);
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

  // Convert to blob and return
  const blob = await cropCanvas.convertToBlob({ type: 'image/png' });
  return URL.createObjectURL(blob);
}

// Composite overlay on background (moved from patternGenerator.jsx)
async function compositeOverlayOnBackground({
  backgroundDataUrl,
  size,
  overlayStyle,
  objectColors,
  backgroundColor,
  books = [],
  emailVariant = 'text',
  fontSize = 80,
  lineHeight = 96,
  overlayText = '',
  batchOverlayColor = null,
  overlayAlpha = 1,
}) {
  // Load background image
  const backgroundImg = await loadImage(backgroundDataUrl);
  
  // Create canvas
  const canvas = new OffscreenCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.drawImage(backgroundImg, 0, 0, size.width, size.height);
  
  // Add overlays based on size and style
  if (size.width === 1200 && size.height === 628) {
    // Draw overlay FIRST (behind books)
    if (overlayStyle !== 'none') {
      const margin = 24;
      const rectX = margin;
      const rectY = margin;
      const rectWidth = size.width - margin * 2;
      const rectHeight = size.height - margin * 2;
      const cornerRadius = 24;
      
      if (overlayStyle === 'solid') {
        drawOverlayRect(ctx, {
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
      } else {
        drawOverlayRect(ctx, {
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
    if ((books || []).length > 0) {
      const bookImages = await Promise.all((books || []).map(book => loadImage(book.blob || book.source)));
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
        
        // Create offscreen canvas for book processing
        const offscreenCanvas = new OffscreenCanvas(bookWidth, BOOK_HEIGHT);
        const offscreenCtx = offscreenCanvas.getContext('2d');
        
        // Create rounded rectangle clipping path
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
        
        // Add gradient overlay
        drawBookGradientOverlay(offscreenCtx, bookWidth, BOOK_HEIGHT);
        
        // Draw with shadow
        ctx.save();
        ctx.filter = 'drop-shadow(-8px 12px 16px rgba(10, 10, 10, 0.36))';
        ctx.drawImage(offscreenCanvas, currentX, TOP_MARGIN);
        ctx.restore();
        
        currentX += bookWidth + BOOK_SPACING;
      });
    }
  }
  
  // Add overlay for Email size (1080x1080)
  if (size.width === 1080 && size.height === 1080) {
    // Draw overlay FIRST (behind any potential books)
    if (overlayStyle !== 'none') {
      const margin = 48;
      const rectX = margin;
      const rectY = margin;
      const rectWidth = size.width - margin * 2;
      const rectHeight = size.height - margin * 2;
      const cornerRadius = 24;
      
      if (overlayStyle === 'solid') {
        drawOverlayRect(ctx, {
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
      } else {
        drawOverlayRect(ctx, {
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
      
      // Add text overlay
      if (emailVariant === 'text' && overlayText) {
        ctx.save();
        ctx.font = `${fontSize}px "Shift Medium", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let overlayBg;
        if (overlayStyle === 'solid') {
          overlayBg = batchOverlayColor;
        } else {
          overlayBg = '#e5dfd6';
        }
        
        // Find best text color with contrast >= 4.5
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
        
        if (bestContrast < 4.5) {
          const blackContrast = getContrastRatio(0, (bgRgb.r * 0.2126 + bgRgb.g * 0.7152 + bgRgb.b * 0.0722) / 255);
          const whiteContrast = getContrastRatio(1, (bgRgb.r * 0.2126 + bgRgb.g * 0.7152 + bgRgb.b * 0.0722) / 255);
          bestColor = blackContrast > whiteContrast ? '#000000' : '#FFFFFF';
        }
        
        ctx.fillStyle = bestColor;
        
        const textCenterX = rectX + rectWidth / 2;
        const textCenterY = rectY + rectHeight / 2;
        const textMaxWidth = rectWidth - 192;
        
        wrapText(ctx, overlayText || '', textCenterX, textCenterY, textMaxWidth, lineHeight || 96, -2);
        ctx.restore();
      }
    }
  }
  
  // Convert to blob and return
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return URL.createObjectURL(blob);
}

// Generate pattern batch (multiple sizes)
async function generatePatternBatch(payload) {
  try {
    const { images, objectColors, backgroundColor, sizes, seed, overlayStyle, books, emailVariant, fontSize, lineHeight, overlayText, overlayAlpha, batchOverlayColor } = payload;
    
    const results = {};
    // Use the passed batchOverlayColor or fallback to random selection
    const overlayColor = batchOverlayColor || (overlayStyle === 'solid' ? 
      objectColors[Math.floor(Math.random() * objectColors.length)] : null);
  
    for (const size of sizes) {
      // Generate background
      const backgroundDataUrl = await generateBackgroundPattern(
        images, objectColors, backgroundColor, size, seed
      );
      
      // Handle 'both' variant for email size (1080x1080)
      if (emailVariant === 'both' && size.width === 1080 && size.height === 1080) {
        console.log('Worker: Generating both variants for 1080x1080');
        
        // Generate text variant
        const textVariant = await compositeOverlayOnBackground({
          backgroundDataUrl,
          size,
          overlayStyle,
          objectColors,
          backgroundColor,
          books,
          emailVariant: 'text',
          fontSize,
          lineHeight,
          overlayText,
          batchOverlayColor: overlayColor,
          overlayAlpha,
        });
        
        // Generate books variant
        const booksVariant = await compositeOverlayOnBackground({
          backgroundDataUrl,
          size,
          overlayStyle,
          objectColors,
          backgroundColor,
          books,
          emailVariant: 'books',
          fontSize,
          lineHeight,
          overlayText,
          batchOverlayColor: overlayColor,
          overlayAlpha,
        });
        
        console.log('Worker: Generated textVariant =', !!textVariant, 'booksVariant =', !!booksVariant);
        
        // Store both variants with different keys
        results[`${size.width}x${size.height}-text`] = textVariant;
        results[`${size.width}x${size.height}-books`] = booksVariant;
        
        console.log('Worker: Stored patterns with keys:', `${size.width}x${size.height}-text`, `${size.width}x${size.height}-books`);
      } else {
        // Composite overlay normally
        const compositedDataUrl = await compositeOverlayOnBackground({
          backgroundDataUrl,
          size,
          overlayStyle,
          objectColors,
          backgroundColor,
          books,
          emailVariant,
          fontSize,
          lineHeight,
          overlayText,
          batchOverlayColor: overlayColor,
          overlayAlpha,
        });
        
        results[`${size.width}x${size.height}`] = compositedDataUrl;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in generatePatternBatch:', error);
    throw error;
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
    const result = `rgba(${r},${g},${b},${alpha})`;
    return result;
  }
  return color;
} 