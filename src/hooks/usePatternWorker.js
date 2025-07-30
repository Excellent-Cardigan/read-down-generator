import { useRef, useCallback, useEffect } from 'react';

export function usePatternWorker() {
  const workerRef = useRef(null);
  const messageHandlersRef = useRef(new Map());

  // Initialize worker
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        workerRef.current = new Worker(
          new URL('../workers/patternWorker.js', import.meta.url),
          { type: 'module' }
        );

        // Set up message handler
        workerRef.current.onmessage = (event) => {
          const { type, payload, id } = event.data;
          
          if (type === 'ERROR') {
            console.error('Worker error:', payload);
            const handler = messageHandlersRef.current.get(id);
            if (handler && handler.reject) {
              handler.reject(new Error(payload.message));
            }
          } else {
            const handler = messageHandlersRef.current.get(id);
            if (handler && handler.resolve) {
              handler.resolve(payload);
            }
          }
          
          // Clean up handler
          messageHandlersRef.current.delete(id);
        };

        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error);
          // Reject all pending handlers
          messageHandlersRef.current.forEach((handler) => {
            if (handler.reject) {
              handler.reject(error);
            }
          });
          messageHandlersRef.current.clear();
        };
      } catch (error) {
        console.error('Failed to create worker:', error);
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      messageHandlersRef.current.clear();
    };
  }, []);

  // Send message to worker and return a promise
  const sendMessage = useCallback((type, payload) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = Date.now() + Math.random();
      messageHandlersRef.current.set(id, { resolve, reject });

      workerRef.current.postMessage({
        type,
        payload,
        id
      });
    });
  }, []);

  // Generate background pattern
  const generateBackground = useCallback(async (images, objectColors, backgroundColor, size, seed) => {
    return sendMessage('GENERATE_BACKGROUND', {
      images,
      objectColors,
      backgroundColor,
      size,
      seed
    });
  }, [sendMessage]);

  // Composite overlay on background
  const compositeOverlay = useCallback(async (params) => {
    return sendMessage('COMPOSITE_OVERLAY', params);
  }, [sendMessage]);

  // Generate pattern batch (multiple sizes)
  const generatePatternBatch = useCallback(async (params) => {
    return sendMessage('GENERATE_PATTERN_BATCH', params);
  }, [sendMessage]);

  // Check if worker is available
  const isWorkerAvailable = useCallback(() => {
    return workerRef.current !== null;
  }, []);

  return {
    generateBackground,
    compositeOverlay,
    generatePatternBatch,
    isWorkerAvailable
  };
} 