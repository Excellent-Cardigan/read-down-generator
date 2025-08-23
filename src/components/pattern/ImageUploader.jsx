import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types'; 
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from '@/lib/utils';

const ImageUploader = React.memo(function ImageUploader({ images, setImages }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Debounce timeout is managed by the debounce utility
  // const debounceTimeout = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Deduplicate by name and size
  const deduplicate = useCallback((newFiles) => {
    const existing = new Set(Array.isArray(images) ? images.map(img => {
      // Handle both File objects (uploaded) and string URLs (default images)
      const size = typeof img.source === 'object' ? img.source.size || '' : '';
      return img.name + '-' + size;
    }) : []);
    return (newFiles || []).filter(file => !existing.has(file.name + '-' + file.size));
  }, [images]);

  // Move processFiles above debouncedProcessFiles
  const processFiles = useCallback((files) => {
    const uniqueFiles = deduplicate(files);
    if (uniqueFiles.length === 0) return;
    setIsLoading(true);
    let processed = 0;
    (uniqueFiles || []).forEach(file => {
      const reader = new FileReader();
      reader.onerror = (error) => {
        console.error(`Failed to read file ${file.name}:`, error);
        alert(`Failed to read file ${file.name}. Please try again.`);
        processed++;
        if (processed === uniqueFiles.length) setIsLoading(false);
      };
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            if (img.width <= 2000 && img.height <= 2000) {
              // Get current images and add the new one
              const newImage = { source: file, preview: e.target.result, name: file.name };
              const currentImages = Array.isArray(images) ? images : [];
              const newArray = [...currentImages, newImage];
              setImages(newArray);
            } else {
              alert(`Image ${file.name} is too large (${img.width}x${img.height}). Maximum is 2000x2000px.`);
            }
          } catch (error) {
            console.error(`Error processing image ${file.name}:`, error);
            alert(`Error processing image ${file.name}. Please try again.`);
          }
          processed++;
          if (processed === uniqueFiles.length) setIsLoading(false);
        };
        img.onerror = (error) => {
          console.error(`Failed to load image ${file.name}:`, error);
          alert(`Failed to load image ${file.name}. Please check the file format and try again.`);
          processed++;
          if (processed === uniqueFiles.length) setIsLoading(false);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }, [deduplicate, setImages, images]);

  // Debounced file processing using shared debounce utility
  const debouncedProcessFiles = useCallback((files) => {
    const debouncedFn = debounce(processFiles, 200);
    debouncedFn(files);
  }, [processFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'image/png');
    debouncedProcessFiles(files);
  }, [debouncedProcessFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files).filter(file => file.type === 'image/png');
    debouncedProcessFiles(files);
    e.target.value = '';
  }, [debouncedProcessFiles]);

  const removeImage = (indexToRemove) => {
    if (!Array.isArray(images)) return;
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="pc-image-uploader space-y-3">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload').click()}
        className={`pc-image-dropzone upload-dropzone ${isDragActive ? 'upload-dropzone--active' : ''}`}
      >
        <input
          type="file"
          multiple
          accept="image/png"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <div className="w-10 h-10 mx-auto mb-2 bg-primary/10 rounded-full flex items-center justify-center">
            <UploadCloud className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-gray-600 font-semibold">Click or Drag files</p>
        <p className="text-xs text-gray-500">PNG up to 2000x2000px</p>
        {isLoading && (
          <div className="flex justify-center items-center mt-2">
            <Loader2 className="animate-spin w-5 h-5 text-primary" />
            <span className="ml-2 text-xs text-primary">Processing...</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 pt-1">
        <AnimatePresence>
          {Array.isArray(images) ? images.map((image, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="pc-image-preview relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
            >
              <img src={image.preview} alt={image.name || `upload-preview-${index}`} className="w-full h-full object-contain p-1" />
              <button
                onClick={() => removeImage(index)}
                className="pc-image-remove-btn absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )) : null}
        </AnimatePresence>
      </div>
    </div>
  );
});

ImageUploader.propTypes = {
  images: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    preview: PropTypes.string,
    name: PropTypes.string,
  })),
  setImages: PropTypes.func.isRequired,
};

export default ImageUploader;