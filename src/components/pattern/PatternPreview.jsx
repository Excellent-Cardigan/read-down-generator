
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ImageIcon, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';

const PatternPreview = React.memo(function PatternPreview({ patterns, isRendering, selectedSizeKey, collections, onActiveSizeKeyChange, emailVariant }) {
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const isCollection = !!collections[selectedSizeKey];
  const patternKeys = useMemo(() => isCollection ? (collections[selectedSizeKey]?.sizes || []).map(s => `${s.width}x${s.height}`) : [selectedSizeKey], [isCollection, collections, selectedSizeKey]);
  
  // Handle 'both' variant for email size
  const currentPatterns = useMemo(() => {
    console.log('PatternPreview: emailVariant =', emailVariant, 'selectedSizeKey =', selectedSizeKey);
    console.log('PatternPreview: available patterns =', Object.keys(patterns));
    console.log('PatternPreview: patternKeys =', patternKeys);
    
    // Check if email size (1080x1080) is included in current selection
    const hasEmailSize = selectedSizeKey === '1080x1080' || patternKeys.includes('1080x1080');
    
    if (emailVariant === 'both' && hasEmailSize) {
      // Look for both text and books variants
      const textPattern = patterns['1080x1080-text'];
      const booksPattern = patterns['1080x1080-books'];
      console.log('PatternPreview: Found email size, textPattern =', !!textPattern, 'booksPattern =', !!booksPattern);
      
      if (textPattern && booksPattern) {
        return { textPattern, booksPattern };
      }
    }
    const regularPatterns = (patternKeys || []).map(key => patterns[key]).filter(Boolean);
    console.log('PatternPreview: regular patterns count =', regularPatterns.length);
    return regularPatterns;
  }, [patternKeys, patterns, emailVariant, selectedSizeKey]);

  // NEW: Track the active size key and notify parent
  const activeSizeKey = patternKeys[activePreviewIndex] || patternKeys[0];
  useEffect(() => {
    if (onActiveSizeKeyChange) {
      onActiveSizeKeyChange(activeSizeKey);
    }
  }, [activeSizeKey, onActiveSizeKeyChange]);

  useEffect(() => {
    setActivePreviewIndex(0);
  }, [selectedSizeKey]);
  
  const nextPreview = useCallback(() => setActivePreviewIndex(i => (i + 1) % currentPatterns.length), [currentPatterns.length]);
  const prevPreview = useCallback(() => setActivePreviewIndex(i => (i - 1 + currentPatterns.length) % currentPatterns.length), [currentPatterns.length]);

  return (
    <main className="pc-pattern-preview w-full md:w-2/3 lg:w-3/4 bg-background p-4 md:p-6 flex flex-col items-center justify-center h-screen sticky top-0"
      style={{ contain: 'layout paint' }}
    >
      <div className="pc-pattern-carousel w-full h-full bg-card rounded-3xl shadow-sm flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {isRendering ? (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
               <Loader2 className="h-16 w-16 animate-spin text-primary"/>
               <p className="text-xl font-medium">Generating your masterpiece...</p>
               <p>This may take a moment.</p>
            </motion.div>
          ) : (emailVariant === 'both' && currentPatterns.textPattern && currentPatterns.booksPattern) ? (
            <motion.div key="both-preview" className="w-full h-full flex flex-col items-center justify-center gap-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="relative w-full flex-grow flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={currentPatterns.textPattern}
                    alt="Text Variant"
                    className="pc-pattern-carousel-img max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                    style={{ maxHeight: 'calc(100vh - 250px)', maxWidth: '45%'}}
                  />
                  <span className="text-sm text-muted-foreground font-medium">Text Variant</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={currentPatterns.booksPattern}
                    alt="Books Variant"
                    className="pc-pattern-carousel-img max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                    style={{ maxHeight: 'calc(100vh - 250px)', maxWidth: '45%'}}
                  />
                  <span className="text-sm text-muted-foreground font-medium">Books Variant</span>
                </div>
              </div>
            </motion.div>
          ) : currentPatterns.length > 0 ? (
            <motion.div key="preview" className="w-full h-full flex flex-col items-center justify-center gap-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="relative w-full flex-grow flex items-center justify-center">
                <img
                  src={currentPatterns[activePreviewIndex]}
                  alt="Generated Pattern"
                  className="pc-pattern-carousel-img max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  style={{ maxHeight: 'calc(100vh - 200px)'}}
                />
                {isCollection && currentPatterns.length > 1 && (
                  <>
                    <Button onClick={prevPreview} size="icon" className="pc-pattern-carousel-btn absolute left-2 md:left-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 bg-black text-white shadow-md hover:bg-white hover:text-black" aria-label="Previous">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Button onClick={nextPreview} size="icon" className="pc-pattern-carousel-btn absolute right-2 md:right-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 bg-black text-white shadow-md hover:bg-white hover:text-black" aria-label="Next">
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
              {isCollection && (
                <div className="pc-pattern-carousel-label flex-shrink-0 flex items-center gap-4 bg-background/80 backdrop-blur-sm p-2 px-4 rounded-full">
                  <p className="text-foreground font-medium text-sm md:text-base">{collections[selectedSizeKey].sizes[activePreviewIndex].name} ({collections[selectedSizeKey].sizes[activePreviewIndex].width}x{collections[selectedSizeKey].sizes[activePreviewIndex].height})</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-muted-foreground">
              <div className="w-24 h-24 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-primary" />
              </div>
              <p className="mt-4 text-xl font-semibold">Your pattern will appear here.</p>
              <p>Configure your settings and click &quot;Render&quot;.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
});

PatternPreview.propTypes = {
  patterns: PropTypes.object.isRequired,
  isRendering: PropTypes.bool.isRequired,
  selectedSizeKey: PropTypes.string.isRequired,
  collections: PropTypes.object.isRequired,
  onActiveSizeKeyChange: PropTypes.func,
  emailVariant: PropTypes.string,
};

export default PatternPreview;
