
import React, { useCallback, useMemo } from 'react';
import SizeSelector from './SizeSelector';
import GenreSelector from './GenreSelector';
import ColorPalette from './ColorPalette';
import ImageUploader from './ImageUploader';
import BookUploader from './BookUploader';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wand2, Loader2, Terminal, Scaling, BookMarked, Images, Download, Book, LayoutTemplate, Type, EyeOff, Square, CheckSquare, Palette } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import PropTypes from 'prop-types';
import { useDebounce } from '../../hooks/useDebounce';
import summerPaletteData from '../../data/2025-summer-palette-by-genre.json';
import fallPaletteData from '../../data/2025-fall-palette-by-genre.json';

const DownloadButtons = React.memo(function DownloadButtons({
  currentPatterns, patternKeys, isCollection
}) {
  const handleBatchDownload = useCallback(async () => {
    if (currentPatterns.length === 1) {
      // Single pattern, download as before
      const link = document.createElement('a');
      link.href = currentPatterns[0];
      link.download = `pattern-${patternKeys[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Multiple patterns, zip and download
      const zip = new JSZip();
      await Promise.all(currentPatterns.map(async (pattern, idx) => {
        // Convert dataURL to blob
        const res = await fetch(pattern);
        const blob = await res.blob();
        zip.file(`pattern-${patternKeys[idx]}.png`, blob);
      }));
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'patterns.zip');
    }
  }, [currentPatterns, patternKeys]);

  return (
    <>
      <Button
        onClick={handleBatchDownload}
        disabled={currentPatterns.length === 0}
        variant="outline"
        className="pc-download-btn w-full py-5 text-md font-semibold rounded-xl transition-all duration-300 hover:bg-[#756f66] hover:text-white text-[#FA6400] border border-[#FA6400] hover:border-transparent"
      >
        <Download className="mr-2 h-5 w-5" />
        {isCollection ? `Download All (${currentPatterns.length})` : 'Download Pattern'}
      </Button>
    </>
  );
});

DownloadButtons.propTypes = {
  currentPatterns: PropTypes.arrayOf(PropTypes.string).isRequired,
  patternKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  isCollection: PropTypes.bool.isRequired,
};

function Sidebar({
  sizes,
  collections,
  selectedSizeKey,
  setSelectedSizeKey,
  activeSizeKey,
  colors,
  setColors,
  selectedGenre,
  onGenreChange,
  // genreColors, // available but using currentPalette instead
  images,
  setImages,
  books,
  setBooks,
  onRender,
  isRendering,
  error,
  generatedPatterns,
  emailVariant,
  setEmailVariant,
  overlayText,
  setOverlayText,
  overlayStyle,
  setOverlayStyle,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  overlayAlpha,
  // setOverlayAlpha, // parameter available but not currently used in this component
  onRenderWithAlpha,
}) {
  const [paletteSeason, setPaletteSeason] = React.useState('Summer');
  
  // Choose the palette based on toggle
  const currentPalette = paletteSeason === 'Summer' ? summerPaletteData : fallPaletteData;

  // When palette or genre changes, update colors
  React.useEffect(() => {
    if (selectedGenre && currentPalette[selectedGenre]) {
      setColors(currentPalette[selectedGenre]);
    }
  }, [paletteSeason, selectedGenre, currentPalette, setColors]);

  const isCollection = !!collections[selectedSizeKey];
  const patternKeys = useMemo(() => (
    isCollection ? (collections[selectedSizeKey]?.sizes || []).map(s => `${s.width}x${s.height}`) : [selectedSizeKey]
  ), [isCollection, collections, selectedSizeKey]);
  const currentPatterns = useMemo(() => (
    (patternKeys || []).map(key => generatedPatterns[key]).filter(Boolean)
  ), [patternKeys, generatedPatterns]);
  // Use activeSizeKey for all conditional logic
  const isHomepageSize = activeSizeKey === '1200x628';
  const isEmailSize = activeSizeKey === '1080x1080';
  const isOverlayApplicable = isHomepageSize || isEmailSize;

  // Debounced overlay text, font size, and line height
  const [localOverlayText, setLocalOverlayText] = React.useState(overlayText);
  const [localFontSize, setLocalFontSize] = React.useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = React.useState(lineHeight);

  const debouncedOverlayText = useDebounce(localOverlayText, 400);
  const debouncedFontSize = useDebounce(localFontSize, 200);
  const debouncedLineHeight = useDebounce(localLineHeight, 200);

  // Sync debounced values to parent state
  React.useEffect(() => {
    if (debouncedOverlayText !== overlayText) setOverlayText(debouncedOverlayText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedOverlayText]);
  React.useEffect(() => {
    if (debouncedFontSize !== fontSize) setFontSize(debouncedFontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFontSize]);
  React.useEffect(() => {
    if (debouncedLineHeight !== lineHeight) setLineHeight(debouncedLineHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLineHeight]);

  // Local state for pending overlay alpha
  const [pendingOverlayAlpha, setPendingOverlayAlpha] = React.useState(overlayAlpha);
  // Sync local state when overlayAlpha changes from parent
  React.useEffect(() => {
    setPendingOverlayAlpha(overlayAlpha);
  }, [overlayAlpha]);

  // Note: Overlay alpha is now updated manually via the "Update Opacity" button

  return (
    <div className="pc-sidebar w-full md:w-1/3 lg:w-1/4 bg-muted border-r border-border h-screen overflow-y-auto p-4 flex flex-col gap-5 min-h-full"
      style={{ contain: 'layout paint' }}
    >
      <header className="pc-sidebar-header px-1">
        <h1 className="text-2xl font-bold text-foreground/90 tracking-tight">Pattern Craft</h1>
        <p className="text-sm text-muted-foreground">Create unique patterns from your assets.</p>
      </header>
      {/* Pattern Generation Settings - These trigger full re-renders */}
      <div className="pc-pattern-generation bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-5 h-5 text-muted-foreground" />
          <Label className="text-sm font-medium text-muted-foreground">Pattern Generation</Label>
        </div>
        
        <div className="pc-output-size space-y-2">
          <div className="flex items-center gap-2">
            <Scaling className="w-5 h-5 text-muted-foreground" />
            <Label className="text-sm font-medium text-muted-foreground">Output Size</Label>
          </div>
          <SizeSelector
            sizes={sizes}
            collections={collections}
            selectedSizeKey={selectedSizeKey}
            setSelectedSizeKey={setSelectedSizeKey}
          />
        </div>
        
        {/* Palette Tabs + Swatches */}
        <div className="pc-palette-section space-y-2">
          <div className="pc-palette-headline flex items-center gap-2">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <Label className="text-sm font-medium text-muted-foreground">Color Palette</Label>
          </div>
          <div className="pc-palette-card bg-background rounded-lg border border-border/50 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-medium">Season:</Label>
                <Button
                  onClick={() => setPaletteSeason('Summer')}
                  className={`pc-color-add-btn h-8 px-3 text-xs border border-border bg-background text-foreground hover:bg-[#756f66] hover:text-white${paletteSeason === 'Summer' ? ' bg-[#473f39e6] text-white border-none' : ''}`}
                >
                  Summer
                </Button>
                <Button
                  onClick={() => setPaletteSeason('Fall')}
                  className={`pc-color-add-btn h-8 px-3 text-xs border border-border bg-background text-foreground hover:bg-[#756f66] hover:text-white${paletteSeason === 'Fall' ? ' bg-[#473f39e6] text-white border-none' : ''}`}
                >
                  Fall
                </Button>
              </div>
              <div className="flex items-center gap-2 min-h-[48px]">
                <ColorPalette 
                  colors={colors}
                  setColors={setColors}
                />
              </div>
          </div>
        </div>
        
        <div className="pc-genre-section space-y-2">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-muted-foreground" />
            <Label className="text-sm font-medium text-muted-foreground">Book Genre</Label>
          </div>
          <GenreSelector
            selectedGenre={selectedGenre}
            onGenreChange={onGenreChange}
            genreColors={currentPalette}
          />
        </div>
        
        <div className="pc-upload-section space-y-2">
           <div className="flex items-center gap-2">
            <Images className="w-5 h-5 text-muted-foreground" />
            <Label className="text-sm font-medium text-muted-foreground">Upload Objects</Label>
          </div>
          <ImageUploader images={images} setImages={setImages} />
        </div>
      </div>

      {/* Overlay Settings - These only affect overlays, not the background pattern */}
      <div className="pc-overlay-settings bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
          <Label className="text-sm font-medium text-muted-foreground">Overlay Settings</Label>
          <div className="text-xs text-muted-foreground/70 ml-auto">Changes instantly</div>
        </div>
        
        {isOverlayApplicable && (
          <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Overlay Style</Label>
              <RadioGroup value={overlayStyle} onValueChange={setOverlayStyle} className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="o-none" />
                      <Label htmlFor="o-none" className="flex items-center gap-1 text-sm">
                          <EyeOff className="w-4 h-4 text-muted-foreground"/> 
                          None
                      </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transparent" id="o-transparent" />
                      <Label htmlFor="o-transparent" className="flex items-center gap-1 text-sm">
                          <Square className="w-4 h-4 text-muted-foreground"/> 
                          Transparent
                      </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="solid" id="o-solid" />
                      <Label htmlFor="o-solid" className="flex items-center gap-1 text-sm">
                          <CheckSquare className="w-4 h-4 text-muted-foreground"/> 
                          Solid
                      </Label>
                  </div>
              </RadioGroup>
          </div>
        )}

        {overlayStyle === 'solid' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Overlay Opacity: {(pendingOverlayAlpha * 100).toFixed(0)}%</Label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={pendingOverlayAlpha}
                onChange={e => setPendingOverlayAlpha(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <Button
                onClick={() => onRenderWithAlpha(pendingOverlayAlpha)}
                className="pc-color-add-btn w-full h-8 px-3 text-xs border border-border bg-background text-foreground hover:bg-[#756f66] hover:text-white"
                disabled={isRendering}
              >
                {isRendering ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Update Opacity'}
              </Button>
            </div>
          </div>
        )}

        {isEmailSize && overlayStyle !== 'none' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Email Variant</Label>
              <RadioGroup value={emailVariant} onValueChange={setEmailVariant} className="flex gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="v-text" />
                      <Label htmlFor="v-text">Text</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="books" id="v-books" />
                      <Label htmlFor="v-books">Books</Label>
                  </div>
              </RadioGroup>
            </div>

            {emailVariant === 'text' && (
              <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                      <div className="flex items-center gap-2">
                          <Type className="w-5 h-5 text-muted-foreground" />
                          <Label className="text-sm font-medium text-muted-foreground">Overlay Text</Label>
                      </div>
                      <Textarea 
                          value={localOverlayText}
                          onChange={(e) => setLocalOverlayText(e.target.value)}
                          placeholder="Enter text for the overlay..."
                          className="h-24 bg-background"
                      />
                  </div>
                  
                  <div className="space-y-3">
                      <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Font Size: {localFontSize}px</Label>
                          <input
                              type="range"
                              min="20"
                              max="200"
                              value={localFontSize}
                              onChange={(e) => setLocalFontSize(Number(e.target.value))}
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                          />
                      </div>
                      
                      <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Line Height: {localLineHeight}px</Label>
                          <input
                              type="range"
                              min="20"
                              max="250"
                              value={localLineHeight}
                              onChange={(e) => setLocalLineHeight(Number(e.target.value))}
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                          />
                      </div>
                  </div>
              </div>
            )}
          </div>
        )}

        {(isHomepageSize && overlayStyle !== 'none') || (isEmailSize && overlayStyle !== 'none' && emailVariant === 'books') ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-muted-foreground" />
              <Label className="text-sm font-medium text-muted-foreground">Book Covers</Label>
            </div>
            <BookUploader books={books || []} setBooks={setBooks} />
          </div>
        ) : null}
      </div>
      
      <div className="flex-grow flex flex-col gap-5">

      </div>

      <div className="pc-sidebar-footer pt-4 space-y-3 sticky bottom-0 bg-muted/90 backdrop-blur-sm pb-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between">
          <KeyboardShortcutsModal
            onRender={onRender}
            onDownload={() => {
              // This will be handled by the DownloadButtons component
              const downloadBtn = document.querySelector('.pc-download-btn');
              if (downloadBtn) downloadBtn.click();
            }}
            isRendering={isRendering}
            hasPatterns={currentPatterns.length > 0}
          />
        </div>

        {/* Render Pattern button moved here to use onRenderWithAlpha */}
        <Button
          onClick={() => onRenderWithAlpha(pendingOverlayAlpha)}
          disabled={isRendering || images.length === 0}
          className="pc-render-btn w-full py-5 text-md font-semibold rounded-xl transition-all duration-300 bg-black text-white hover:bg-[#FA6400]"
        >
          {isRendering ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Rendering...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-5 w-5" />
              Render Pattern
            </>
          )}
        </Button>
        <DownloadButtons
          currentPatterns={currentPatterns}
          patternKeys={patternKeys}
          isCollection={isCollection}
          isRendering={isRendering}
          images={images}
          onRender={onRender}
        />
      </div>
    </div>
  );
}

Sidebar.propTypes = {
  sizes: PropTypes.object.isRequired,
  collections: PropTypes.object.isRequired,
  selectedSizeKey: PropTypes.string.isRequired,
  setSelectedSizeKey: PropTypes.func.isRequired,
  activeSizeKey: PropTypes.string.isRequired,
  colors: PropTypes.array.isRequired,
  setColors: PropTypes.func.isRequired,
  selectedGenre: PropTypes.string.isRequired,
  onGenreChange: PropTypes.func.isRequired,
  genreColors: PropTypes.object.isRequired,
  images: PropTypes.array.isRequired,
  setImages: PropTypes.func.isRequired,
  books: PropTypes.array.isRequired,
  setBooks: PropTypes.func.isRequired,
  onRender: PropTypes.func.isRequired,
  isRendering: PropTypes.bool.isRequired,
  error: PropTypes.string,
  generatedPatterns: PropTypes.object.isRequired,
  emailVariant: PropTypes.string.isRequired,
  setEmailVariant: PropTypes.func.isRequired,
  overlayText: PropTypes.string.isRequired,
  setOverlayText: PropTypes.func.isRequired,
  overlayStyle: PropTypes.string.isRequired,
  setOverlayStyle: PropTypes.func.isRequired,
  fontSize: PropTypes.number.isRequired,
  setFontSize: PropTypes.func.isRequired,
  lineHeight: PropTypes.number.isRequired,
  setLineHeight: PropTypes.func.isRequired,
  overlayAlpha: PropTypes.number.isRequired,
  onRenderWithAlpha: PropTypes.func.isRequired,
};

export default React.memo(Sidebar);
