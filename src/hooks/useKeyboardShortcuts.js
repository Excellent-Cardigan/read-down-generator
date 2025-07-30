import { useEffect, useCallback } from 'react';

export const useKeyboardShortcuts = ({
  onRender,
  onDownload,
  onUndo,
  onRedo,
  isRendering = false,
  hasPatterns = false
}) => {
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when user is typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    // Ctrl/Cmd + Enter: Render pattern
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!isRendering && onRender) {
        onRender();
      }
    }

    // Ctrl/Cmd + S: Download pattern
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (hasPatterns && onDownload) {
        onDownload();
      }
    }

    // Ctrl/Cmd + Z: Undo
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      if (onUndo) {
        onUndo();
      }
    }

    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
    if ((event.ctrlKey || event.metaKey) && 
        ((event.shiftKey && event.key === 'z') || event.key === 'y')) {
      event.preventDefault();
      if (onRedo) {
        onRedo();
      }
    }

    // Escape: Clear error or close modal
    if (event.key === 'Escape') {
      // This could be used to clear errors or close modals
      // Implementation depends on specific needs
    }
  }, [onRender, onDownload, onUndo, onRedo, isRendering, hasPatterns]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: {
      render: 'Ctrl/Cmd + Enter',
      download: 'Ctrl/Cmd + S',
      undo: 'Ctrl/Cmd + Z',
      redo: 'Ctrl/Cmd + Shift + Z'
    }
  };
}; 