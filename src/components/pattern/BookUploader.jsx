import React, { useCallback, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * @typedef {{source: File | string, preview: string, name: string}} BookObject
 */

/**
 * @param {object} props
 * @param {BookObject[]} [props.books=[]]
 * @param {function(BookObject[]): void} props.setBooks
 * @param {function(BookObject[]): void} props.addBooks
 */
const BookUploader = React.memo(function BookUploader({ books = [], setBooks, addBooks }) {
  /** @type {[boolean, function(boolean): void]} */
  const [isDragActive, setIsDragActive] = useState(false);
  /** @type {[boolean, function(boolean): void]} */
  const [isLoading, setIsLoading] = useState(false);
  /** @type {React.MutableRefObject<NodeJS.Timeout | null>} */
  const debounceTimeout = useRef(null);

  /**
   * @param {React.DragEvent} e
   * @returns {void}
   */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  /**
   * @param {React.DragEvent} e
   * @returns {void}
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  /**
   * @param {React.DragEvent} e
   * @returns {void}
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * @param {File[]} newFiles
   * @returns {File[]}
   */
  const deduplicate = useCallback((newFiles) => {
    const existing = new Set(Array.isArray(books) ? books.map(book => {
      // Handle both File objects (uploaded) and string URLs (default books)
      const size = typeof book.source === 'object' ? book.source.size || '' : '';
      return book.name + '-' + size;
    }) : []);
    return (newFiles || []).filter(file => !existing.has(file.name + '-' + file.size));
  }, [books]);

  /**
   * @param {File[]} files
   * @returns {void}
   */
  const processFiles = useCallback((files) => {
    if (!setBooks) return;
    const uniqueFiles = deduplicate(files);
    if (!uniqueFiles || uniqueFiles.length === 0) return;
    
    setIsLoading(true);
    let processed = 0;
    const newBooks = [];
    
    uniqueFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newBooks.push({ source: file, preview: e.target.result, name: file.name });
        processed++;
        if (processed === uniqueFiles.length) {
          // All files processed, use addBooks to add new books to existing ones
          if (addBooks) {
            addBooks(newBooks);
          } else {
            // Fallback to setBooks if addBooks not available
            const currentBooks = Array.isArray(books) ? books : [];
            setBooks([...currentBooks, ...newBooks]);
          }
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        processed++;
        if (processed === uniqueFiles.length) {
          // All files processed (even with errors), update state with valid books
          if (newBooks.length > 0) {
            if (addBooks) {
              addBooks(newBooks);
            } else {
              // Fallback to setBooks if addBooks not available
              const currentBooks = Array.isArray(books) ? books : [];
              setBooks([...currentBooks, ...newBooks]);
            }
          }
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [books, setBooks, addBooks, deduplicate]);

  // Debounced file processing
  const debouncedProcessFiles = useCallback((files) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => processFiles(files), 200);
  }, [processFiles]);

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

  /**
   * @param {number} indexToRemove
   * @returns {void}
   */
  const removeBook = (indexToRemove) => {
    if (!setBooks || !Array.isArray(books)) return;
    const newBooks = books.filter((_, index) => index !== indexToRemove);
    setBooks(newBooks);
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
    source: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    preview: PropTypes.string,
    name: PropTypes.string,
  })),
  setBooks: PropTypes.func.isRequired,
  addBooks: PropTypes.func,
};

export default BookUploader;