import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePatternState } from '../hooks/usePatternState';
import Sidebar from '../components/pattern/Sidebar';
import PatternPreview from '../components/pattern/PatternPreview';
import CanvasErrorBoundary from '../components/CanvasErrorBoundary';
import { generateBackgroundPattern, compositeOverlayOnBackground } from '../components/pattern/patternGenerator';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePatternWorker } from '../hooks/usePatternWorker';
import ProgressIndicator from '../components/pattern/ProgressIndicator';

const SIZES_OBJ = {
  '1200x628': { width: 1200, height: 628, name: 'Homepage' },
  '2000x380': { width: 2000, height: 380, name: 'Landing Page' },
  '1080x1080': { width: 1080, height: 1080, name: 'Email' },
  '1080x1350': { width: 1080, height: 1350, name: 'Instagram Post (Portrait)' },
  '1080x1920': { width: 1080, height: 1920, name: 'Instagram Story' },
};

const COLLECTIONS_OBJ = {
  'all-sizes': {
    name: 'All Sizes',
    sizes: [
      SIZES_OBJ['1200x628'], 
      SIZES_OBJ['2000x380'], 
      SIZES_OBJ['1080x1080'],
      SIZES_OBJ['1080x1350'],
      SIZES_OBJ['1080x1920']
    ],
  },
  'read-down-suite': {
    name: 'Read-Down Suite',
    sizes: [SIZES_OBJ['1200x628'], SIZES_OBJ['2000x380'], SIZES_OBJ['1080x1080']],
  },
};

// Summer genre color palettes
const GENRE_COLORS_OBJ = {
  "Romance": ["#ED5F93", "#FFC636", "#FF602B", "#7CCFD4", "#FFE4BC"],
  "Sci-Fi & Fantasy": ["#573DE8", "#4091ED", "#098E9B", "#DBD000", "#9565DE"],
  "Fiction": ["#F24911", "#3AABB1", "#90BD11", "#BA9DEC", "#F7C57E"],
  "Kids & YA": ["#FF8FB8", "#FFC636", "#FCF56F", "#64ABFB", "#C8EC64"],
  "Mysteries & Thrillers": ["#CF202A", "#750029", "#230F66", "#005761", "#554F46"],
  "Historical Fiction": ["#FF9B0D", "#AD4900", "#D97E00", "#90BD11", "#755F66"],
  "Nonfiction": ["#C8EC64", "#64ABFB", "#FFD978", "#005D81", "#709900"],
  "Women's Fiction": ["#FF9B0D", "#FF8FB8", "#9565DE", "#90BD11", "#FFE4BC"],
  "Book Club": ["#BA9DEC", "#7CCFD4", "#FFE4BC", "#FFD978", "#B5AFA6"],
  "New Books": ["#F24911", "#ED5F93", "#FF8FB8", "#573DE8", "#3AABB1", "#64ABFB"],
  "Biographies & Memoirs": ["#D97E00", "#FFE4BC", "#D5CFC6", "#755F66", "#005D81"]
};

// Define default images using local files
const defaultImages = [
  { 
    source: '/images/image-1.png',
    preview: '/images/image-1.png',
    name: 'image-1.png'
  },
  { 
    source: '/images/image-2.png',
    preview: '/images/image-2.png',
    name: 'image-2.png'
  },
  { 
    source: '/images/image-3.png',
    preview: '/images/image-3.png',
    name: 'image-3.png'
  }
];

// Define default book covers using local files
const defaultBooks = [
  { 
    source: '/images/books/9780593548981.jpg',
    preview: '/images/books/9780593548981.jpg',
    name: '9780593548981.jpg'
  },
  { 
    source: '/images/books/9780593638927.jpg',
    preview: '/images/books/9780593638927.jpg',
    name: '9780593638927.jpg'
  },
  { 
    source: '/images/books/9780593655504.jpg',
    preview: '/images/books/9780593655504.jpg',
    name: '9780593655504.jpg'
  },
  { 
    source: '/images/books/9780593802724.jpg',
    preview: '/images/books/9780593802724.jpg',
    name: '9780593802724.jpg'
  }
];

// Helper to resolve a CSS variable color (e.g. hsl(var(--primary))) to an rgb string
function resolveCssColor(color) {
  if (typeof window === 'undefined') return color;
  // If it's a CSS variable, resolve it
  if (color.startsWith('hsl(var(')) {
    // Create a temp element to get the computed color
    const temp = document.createElement('div');
    temp.style.color = color;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    return computed; // e.g. 'rgb(255, 0, 0)'
  }
  return color;
}

export default function PatternGenerator() {
  const SIZES = useMemo(() => SIZES_OBJ, []);
  const COLLECTIONS = useMemo(() => COLLECTIONS_OBJ, []);
  const GENRE_COLORS = useMemo(() => GENRE_COLORS_OBJ, []);
  
  // Initialize worker - temporarily disabled
  const { generatePatternBatch, isWorkerAvailable } = usePatternWorker();
  // Override to force main thread processing
  const forceMainThread = true;
  
  // Use consolidated state management
  const { state, actions, selectors } = usePatternState(GENRE_COLORS_OBJ, defaultImages, defaultBooks);
  
  // Destructure commonly used state values for easier access
  const {
    selectedSizeKey, colors, selectedGenre, images: stateImages, books, isRendering, error,
    hasAutoRendered, emailVariant, overlayText, overlayStyle, patternSeed,
    fontSize, lineHeight, overlayAlpha, activeSizeKey, backgroundCache,
    compositedPatterns, overlayColor, progress, progressMessage
  } = state;
  
  // Ensure stateImages is always an array
  const safeImages = Array.isArray(stateImages) ? stateImages : [];
  
  
  const canvasRefs = useRef([]);
  const blobUrls = useRef([]);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup canvas elements
      canvasRefs.current.forEach(canvas => {
        if (canvas && canvas.getContext) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
      canvasRefs.current = [];
      
      // Cleanup blob URLs
      blobUrls.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('Failed to revoke blob URL:', e);
        }
      });
      blobUrls.current = [];
      
      // Clear background cache data URLs
      actions.clearCache();
    };
  }, [actions]);

  const handleGenreChange = useCallback((genre) => {
    actions.setSelectedGenre(genre);
    actions.setColors(GENRE_COLORS[genre]); // Re-enable automatic color updates on genre change
  }, [GENRE_COLORS, actions]);

  // Helper to get the overlay color (for solid overlays, match batch logic)
  const getBatchOverlayColor = useCallback((objectColors, backgroundColor, seed) => {
    let currentSeed = seed;
    const nextRandom = () => {
      currentSeed = Math.sin(currentSeed * 9999) * 10000;
      return currentSeed - Math.floor(currentSeed);
    };
    const availableColors = [...objectColors, backgroundColor];
    const randomColorIndex = Math.floor(nextRandom() * availableColors.length);
    return availableColors[randomColorIndex];
  }, []);

  // Render/caching logic
  const handleRender = useCallback(async (alphaOverride) => {
    actions.setError(null);
    if (safeImages.length === 0) {
      actions.setError('Please upload at least one image.');
      return;
    }
    if (colors.length < 2) {
      actions.setError('Please select at least two colors (one for background, one for objects).');
      return;
    }
    actions.resetForNewRender();
    
    try {
      // Initialize progress
      actions.setProgress(5);
      actions.setProgressMessage('Preparing pattern generation...');
      
      const backgroundColor = colors[0];
      const objectColors = colors.slice(1);
      if (objectColors.length === 0) objectColors.push(backgroundColor);
      const isCollection = COLLECTIONS[selectedSizeKey];
      const targetSizes = isCollection ? COLLECTIONS[selectedSizeKey].sizes : [SIZES[selectedSizeKey]];
      const alphaToUse = typeof alphaOverride === 'number' ? alphaOverride : overlayAlpha;
      // Ensure we have an overlay color if we need one
      let finalOverlayColor = overlayColor;
      if (overlayStyle === 'solid' && !finalOverlayColor) {
        const backgroundColor = colors[0];
        const objectColors = colors.slice(1);
        const availableColors = objectColors.length > 0 ? [...objectColors, backgroundColor] : [backgroundColor];
        finalOverlayColor = getBatchOverlayColor(availableColors, backgroundColor, patternSeed);
        actions.setOverlayColor(finalOverlayColor);
      }
      
      // Use worker if available, otherwise fallback to main thread
      // Temporarily disable worker due to fetch issues
      if (!forceMainThread && isWorkerAvailable()) {
        actions.setProgress(15);
        actions.setProgressMessage('Preloading images for worker...');
        
        // Pre-load images for worker (worker can't fetch external URLs)
        const preloadedImages = await Promise.all((safeImages || []).map(async (img) => {
          try {
            const response = await fetch(img.source);
            const blob = await response.blob();
            return { ...img, blob: URL.createObjectURL(blob) };
          } catch (error) {
            console.warn('Failed to preload image:', img.source, error);
            return img; // fallback to original
          }
        }));
        
        actions.setProgress(25);
        actions.setProgressMessage('Preloading book covers...');
        
        const preloadedBooks = await Promise.all((books || []).map(async (book) => {
          try {
            const response = await fetch(book.source);
            const blob = await response.blob();
            return { ...book, blob: URL.createObjectURL(blob) };
          } catch (error) {
            console.warn('Failed to preload book:', book.source, error);
            return book; // fallback to original
          }
        }));
        
        actions.setProgress(40);
        actions.setProgressMessage('Generating patterns with web worker...');
        
        // Use worker for batch generation
        const batchResult = await generatePatternBatch({
          images: preloadedImages,
          objectColors,
          backgroundColor,
          sizes: targetSizes,
          seed: patternSeed,
          overlayStyle,
          books: preloadedBooks,
          emailVariant,
          fontSize,
          lineHeight,
          overlayText,
          overlayAlpha: alphaToUse, // pass alpha
          batchOverlayColor: finalOverlayColor // pass the final overlay color
        });
        
        actions.setProgress(90);
        actions.setProgressMessage('Finalizing patterns...');
        actions.setCompositedPatterns(batchResult);
      } else {
        // Fallback to main thread processing
        actions.setProgress(30);
        actions.setProgressMessage('Processing on main thread...');
        
        const resolvedOverlayColor = finalOverlayColor ? resolveCssColor(finalOverlayColor) : null;
        
        // 1. Generate and cache backgrounds
        actions.setProgress(40);
        actions.setProgressMessage('Generating background patterns...');
        
        const newBackgroundCache = {};
        for (let i = 0; i < targetSizes.length; i++) {
          const size = targetSizes[i];
          const key = `${size.width}x${size.height}`;
          actions.setProgress(40 + (i / targetSizes.length) * 30);
          actions.setProgressMessage(`Generating ${size.name} background...`);
          newBackgroundCache[key] = await generateBackgroundPattern(safeImages, objectColors, backgroundColor, size, patternSeed);
        }
        actions.setBackgroundCache(newBackgroundCache);
        
        // 2. Composite overlays for all sizes
        actions.setProgress(70);
        actions.setProgressMessage('Adding overlays and text...');
        
        const newCompositedPatterns = {};
        for (let i = 0; i < targetSizes.length; i++) {
          const size = targetSizes[i];
          const key = `${size.width}x${size.height}`;
          actions.setProgress(70 + (i / targetSizes.length) * 20);
          actions.setProgressMessage(`Compositing ${size.name}...`);
          
          // Handle 'both' variant for email size (1080x1080)
          if (emailVariant === 'both' && size.width === 1080 && size.height === 1080) {
            console.log('Main thread: Generating both variants for 1080x1080');
            
            // Generate text variant
            const textVariant = await compositeOverlayOnBackground({
              backgroundDataUrl: newBackgroundCache[key],
              size,
              overlayStyle,
              objectColors,
              backgroundColor,
              books: books || [],
              emailVariant: 'text',
              fontSize,
              lineHeight,
              overlayText,
              batchOverlayColor: resolvedOverlayColor,
              overlayAlpha: alphaToUse,
            });
            
            // Generate books variant
            const booksVariant = await compositeOverlayOnBackground({
              backgroundDataUrl: newBackgroundCache[key],
              size,
              overlayStyle,
              objectColors,
              backgroundColor,
              books: books || [],
              emailVariant: 'books',
              fontSize,
              lineHeight,
              overlayText,
              batchOverlayColor: resolvedOverlayColor,
              overlayAlpha: alphaToUse,
            });
            
            console.log('Main thread: Generated textVariant =', !!textVariant, 'booksVariant =', !!booksVariant);
            
            // Store both variants with different keys
            newCompositedPatterns[`${size.width}x${size.height}-text`] = textVariant;
            newCompositedPatterns[`${size.width}x${size.height}-books`] = booksVariant;
            
            console.log('Main thread: Stored patterns with keys:', `${size.width}x${size.height}-text`, `${size.width}x${size.height}-books`);
          } else {
            newCompositedPatterns[key] = await compositeOverlayOnBackground({
              backgroundDataUrl: newBackgroundCache[key],
              size,
              overlayStyle,
              objectColors,
              backgroundColor,
              books: books || [],
              emailVariant,
              fontSize,
              lineHeight,
              overlayText,
              batchOverlayColor: resolvedOverlayColor,
              overlayAlpha: alphaToUse // pass alpha
            });
          }
        }
        
        actions.setProgress(95);
        actions.setProgressMessage('Finalizing patterns...');
        actions.setCompositedPatterns(newCompositedPatterns);
      }
      
      // Complete the progress
      actions.setProgress(100);
      actions.setProgressMessage('Pattern generation complete!');
      
      // Auto-hide progress after a short delay
      setTimeout(() => {
        actions.setProgress(0);
        actions.setProgressMessage('Ready to generate...');
      }, 1500);
    } catch (e) {
      console.error(e);
      actions.setError('An unexpected error occurred while rendering the pattern.');
      actions.setProgress(0);
      actions.setProgressMessage('Generation failed');
    } finally {
      actions.setIsRendering(false);
    }
  }, [safeImages, colors, selectedSizeKey, overlayAlpha, overlayStyle, overlayColor, patternSeed, getBatchOverlayColor, isWorkerAvailable, generatePatternBatch, COLLECTIONS, SIZES, books, emailVariant, fontSize, lineHeight, overlayText, forceMainThread, actions]);

  // Auto-render on first load
  useEffect(() => {
    if (!hasAutoRendered && safeImages.length > 0 && colors.length > 0) {
      actions.setHasAutoRendered(true);
      
      // Initialize overlay color on first load
      if (!overlayColor) {
        const backgroundColor = colors[0];
        const objectColors = colors.slice(1);
        const availableColors = objectColors.length > 0 ? [...objectColors, backgroundColor] : [backgroundColor];
        const initialOverlayColor = getBatchOverlayColor(availableColors, backgroundColor, patternSeed);
        actions.setOverlayColor(initialOverlayColor);
      }
      
      // Auto-render the first pattern
      setTimeout(() => {
        handleRender();
      }, 100); // Small delay to ensure all initialization is complete
    }
  }, [hasAutoRendered, safeImages.length, colors.length, overlayColor, colors, patternSeed, getBatchOverlayColor, actions, handleRender]);

  // Generate new seed and overlay color when images or colors change
  useEffect(() => {
    if (hasAutoRendered) {
      const newSeed = Math.random();
      actions.setPatternSeed(newSeed);
      
      // Generate a new overlay color when pattern changes
      if (colors.length > 0) {
        const backgroundColor = colors[0];
        const objectColors = colors.slice(1);
        const availableColors = objectColors.length > 0 ? [...objectColors, backgroundColor] : [backgroundColor];
        const newOverlayColor = getBatchOverlayColor(availableColors, backgroundColor, newSeed);
        actions.setOverlayColor(newOverlayColor);
      }
    }
  }, [safeImages, colors, getBatchOverlayColor, actions]); // Remove hasAutoRendered and handleRender from deps

  // Handle output size changes separately to preserve settings (no auto render)
  // User will need to click render button for new sizes

  // Overlay updates are now handled within the main render function
  // This prevents automatic re-rendering loops

  const handleSidebarRenderWithAlpha = (newAlpha) => {
    actions.setOverlayAlpha(newAlpha); // Update the state
    handleRender(newAlpha);
  };

  // useEffect to trigger rendering after overlayAlpha changes
  useEffect(() => {
    // This useEffect is no longer needed as handleRender handles rendering directly
    // and the slider value is passed as an argument.
    // Keeping it for now in case it's used elsewhere or for future changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayAlpha]);

  const handleSidebarRender = useCallback(() => {
    const newSeed = Math.random();
    actions.setPatternSeed(newSeed);
    
    // Generate a new overlay color when user explicitly renders
    if (colors.length > 0) {
      const backgroundColor = colors[0];
      const objectColors = colors.slice(1);
      const availableColors = objectColors.length > 0 ? [...objectColors, backgroundColor] : [backgroundColor];
      const newOverlayColor = getBatchOverlayColor(availableColors, backgroundColor, newSeed);
      actions.setOverlayColor(newOverlayColor);
    }
  }, [colors, getBatchOverlayColor, actions]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onRender: handleSidebarRender,
    onDownload: () => {
      // This will be handled by the DownloadButtons component
      const downloadBtn = document.querySelector('.pc-download-btn');
      if (downloadBtn) downloadBtn.click();
    },
    isRendering,
    hasPatterns: Object.keys(compositedPatterns).length > 0
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground font-sans">
      <Sidebar
        sizes={SIZES}
        collections={COLLECTIONS}
        selectedSizeKey={selectedSizeKey}
        setSelectedSizeKey={actions.setSelectedSizeKey}
        activeSizeKey={activeSizeKey}
        colors={colors}
        setColors={actions.setColors}
        selectedGenre={selectedGenre}
        onGenreChange={handleGenreChange}
        genreColors={GENRE_COLORS}
        images={safeImages}
        setImages={actions.setImages}
        books={books}
        setBooks={actions.setBooks}
        addBooks={actions.addBooks}
        onRender={handleSidebarRender}
        isRendering={isRendering}
        error={error}
        generatedPatterns={compositedPatterns}
        emailVariant={emailVariant}
        setEmailVariant={actions.setEmailVariant}
        overlayText={overlayText}
        setOverlayText={actions.setOverlayText}
        overlayStyle={overlayStyle}
        setOverlayStyle={actions.setOverlayStyle}
        fontSize={fontSize}
        setFontSize={actions.setFontSize}
        lineHeight={lineHeight}
        setLineHeight={actions.setLineHeight}
        overlayAlpha={overlayAlpha}
        setOverlayAlpha={actions.setOverlayAlpha}
        onRenderWithAlpha={handleSidebarRenderWithAlpha}
      />
      <CanvasErrorBoundary 
        onError={(error) => actions.setError(`Canvas error: ${error.message}`)}
        onReset={() => actions.setError(null)}
      >
        <PatternPreview
          patterns={compositedPatterns}
          isRendering={isRendering}
          selectedSizeKey={selectedSizeKey}
          collections={COLLECTIONS}
          onActiveSizeKeyChange={useCallback((key) => actions.setActiveSizeKey(key), [actions])}
          emailVariant={emailVariant}
        />
      </CanvasErrorBoundary>
      <ProgressIndicator
        isRendering={isRendering}
        progress={progress}
        message={progressMessage}
      />
    </div>
  );
}
