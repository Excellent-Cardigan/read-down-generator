// Utility to asynchronously load a File object or URL into an Image element, with caching
const MAX_CACHE_SIZE = 50;
const imageCache = new Map();

// Helper: create a canvas (OffscreenCanvas in worker, HTMLCanvasElement in main thread)
export function createCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Helper: load image (ImageBitmap in worker, HTMLImageElement in main thread)
export async function loadImage(source) {
  if (typeof createImageBitmap !== 'undefined') {
    // Worker context
    if (source instanceof Blob) {
      return await createImageBitmap(source);
    }
    // If source is a File, convert to blob
    if (source instanceof File) {
      return await createImageBitmap(source);
    }
    // If source is a URL or DataURL, fetch and convert to blob
    const response = await fetch(source);
    const blob = await response.blob();
    return await createImageBitmap(blob);
  } else {
    // Main thread
    if (imageCache.has(source)) {
      return imageCache.get(source);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Implement LRU cache with size limit
        if (imageCache.size >= MAX_CACHE_SIZE) {
          const firstKey = imageCache.keys().next().value;
          imageCache.delete(firstKey);
        }
        imageCache.set(source, img);
        resolve(img);
      };
      img.onerror = reject;
      if (source instanceof File) {
        img.src = URL.createObjectURL(source);
      } else {
        img.src = source;
      }
    });
  }
}

// Creates a tinted version of an image on a canvas (worker and main thread compatible)
export function tintImage(originalImage, color) {
  const canvas = createCanvas(originalImage.width, originalImage.height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(originalImage, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

// Wraps and centers text within a specified bounding box on a canvas
export function wrapText(context, text, x, y, maxWidth, lineHeight, letterSpacing = 0) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width + (testLine.length - 1) * letterSpacing;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  // Center the block of text vertically
  const totalHeight = lines.length * lineHeight;
  let currentY = y - totalHeight / 2 + lineHeight / 2;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    drawTextWithLetterSpacing(context, lines[i], x, currentY, letterSpacing);
    currentY += lineHeight;
  }
}

function drawTextWithLetterSpacing(context, text, x, y, letterSpacing) {
  if (!text || typeof text !== 'string' || text.length === 0) return;
  // Calculate total width for centering
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    totalWidth += context.measureText(text[i]).width;
    if (i < text.length - 1) totalWidth += letterSpacing;
  }
  let currentX = x - totalWidth / 2;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    context.fillText(char, currentX + context.measureText(char).width / 2, y);
    currentX += context.measureText(char).width + letterSpacing;
  }
}

// Seeded random number generator
export function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Color and contrast utility functions
export function hexToRgb(hex) {
  if (!hex || hex.length < 4) return null;
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function getLuminance(rgb) {
  if (!rgb) return 0;
  const a = [rgb.r, rgb.g, rgb.b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function findBestColorCombo(palette, backgroundHex) {
  const bgRgb = hexToRgb(backgroundHex);
  if (!bgRgb) return { overlay: '#ffffff', text: '#000000' };
  const bgLuminance = getLuminance(bgRgb);
  let bestOverlay = { color: null, contrast: -1, luminance: 0 };
  let candidateOverlayColors = palette.filter(c => c.toLowerCase() !== backgroundHex.toLowerCase());
  if (candidateOverlayColors.length === 0 && palette.length > 0) {
    candidateOverlayColors = [palette[0]];
  } else if (candidateOverlayColors.length === 0) {
    candidateOverlayColors = ['#cccccc'];
  }
  for (const colorHex of candidateOverlayColors) {
    const rgb = hexToRgb(colorHex);
    if (rgb) {
      const lum = getLuminance(rgb);
      const contrast = getContrastRatio(lum, bgLuminance);
      if (contrast > bestOverlay.contrast) {
        bestOverlay = { color: colorHex, contrast: contrast, luminance: lum };
      }
    }
  }
  const overlayColor = bestOverlay.color || '#ffffff';
  const overlayLuminance = bestOverlay.luminance;
  let bestText = { color: null, contrast: -1 };
  for (const colorHex of palette) {
    const rgb = hexToRgb(colorHex);
    if (rgb) {
      const lum = getLuminance(rgb);
      const contrast = getContrastRatio(lum, overlayLuminance);
      if (contrast >= 4.5 && contrast > bestText.contrast) {
        bestText = { color: colorHex, contrast: contrast };
      }
    }
  }
  if (!bestText.color) {
    bestText.color = overlayLuminance > 0.5 ? '#000000' : '#FFFFFF';
  }
  return { overlay: overlayColor, text: bestText.color };
}

// Draws a rounded rectangle overlay (solid or transparent) on a canvas context
export function drawOverlayRect(ctx, { x, y, width, height, radius, style, fillColor, strokeColor, lineWidth }) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    // Fallback for older browsers
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
  if (style === 'solid') {
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth || 2;
      ctx.stroke();
    }
  } else if (style === 'transparent') {
    ctx.fillStyle = fillColor || 'rgba(229, 223, 214, 0.45)';
    ctx.fill();
    ctx.strokeStyle = strokeColor || 'rgba(229, 223, 214, 1)';
    ctx.lineWidth = lineWidth || 2;
    ctx.stroke();
  }
  ctx.restore();
}

// Draws a book gradient overlay on a given context and rect
export function drawBookGradientOverlay(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0.01, 'rgba(110, 110, 110, 0.40)');
  gradient.addColorStop(0.02, 'rgba(255, 255, 255, 0.40)');
  gradient.addColorStop(0.99, 'rgba(255, 255, 255, 0.40)');
  gradient.addColorStop(1.0, 'rgba(162, 162, 162, 0.40)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
} 