import React, { useCallback, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BookUploader = React.memo(function BookUploader({ books = [], setBooks }) {
  // Debug logging to understand the books prop type
  console.log('BookUploader - books type:', typeof books, 'isArray:', Array.isArray(books), 'value:', books);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimeout = useRef(null);

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
  const deduplicate = (newFiles) => {
    const existing = new Set(Array.isArray(books) ? books.map(book => book.name + '-' + (book.source.size || '')) : []);
    return newFiles.filter(file => !existing.has(file.name + '-' + file.size));
  };

  const processFiles = (files) => {
    if (!setBooks) return;
    const uniqueFiles = deduplicate(files);
    if (uniqueFiles.length === 0) return;
    setIsLoading(true);
    let processed = 0;
    uniqueFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBooks(prev => {
          const next = [...(prev || []), { source: file, preview: e.target.result, name: file.name }];
          processed++;
          if (processed === uniqueFiles.length) setIsLoading(false);
          return next;
        });
      };
      reader.onerror = () => {
        processed++;
        if (processed === uniqueFiles.length) setIsLoading(false);
      };
      reader.readAsDataURL(file);
    });
  };

  // Debounced file processing
  const debouncedProcessFiles = useCallback((files) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => processFiles(files), 200);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'image/jpeg' || file.type === 'image/tiff' || file.type === 'image/jpg');
    debouncedProcessFiles(files);
  }, [debouncedProcessFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files).filter(file => file.type === 'image/jpeg' || file.type === 'image/tiff' || file.type === 'image/jpg');
    debouncedProcessFiles(files);
    e.target.value = '';
  }, [debouncedProcessFiles]);

  const removeBook = (indexToRemove) => {
    if (!setBooks || !Array.isArray(books)) return;
    setBooks(books.filter((_, index) => index !== indexToRemove));
  };

  const handleInputClick = () => {
    const input = document.getElementById('book-upload');
    if (input) {
      input.click();
    }
  };

  return (
    <div className="pc-book-uploader space-y-3">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleInputClick}
        className={`pc-book-dropzone upload-dropzone ${isDragActive ? 'upload-dropzone--active' : ''}`}
      >
        <input
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/tiff"
          onChange={handleFileSelect}
          className="hidden"
          id="book-upload"
        />
        <div className="w-10 h-10 mx-auto mb-2 bg-primary/10 rounded-full flex items-center justify-center">
            <UploadCloud className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-gray-600 font-semibold">Click or Drag books</p>
        <p className="text-xs text-gray-500">JPG, JPEG, TIF formats</p>
        {isLoading && (
          <div className="flex justify-center items-center mt-2">
            <Loader2 className="animate-spin w-5 h-5 text-primary" />
            <span className="ml-2 text-xs text-primary">Processing...</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 pt-1">
        <AnimatePresence>
          {Array.isArray(books) ? books.map((book, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="pc-book-preview relative group aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden"
            >
              <img src={book.preview} alt={book.name || `book-preview-${index}`} className="w-full h-full object-cover" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeBook(index);
                }}
                className="pc-book-remove-btn absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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

BookUploader.propTypes = {
  books: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.object,
    preview: PropTypes.string,
    name: PropTypes.string,
  })),
  setBooks: PropTypes.func.isRequired,
};

export default BookUploader;