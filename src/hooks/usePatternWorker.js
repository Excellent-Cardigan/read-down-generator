import { useRef, useCallback, useEffect } from 'react';

/**
 * @typedef {{source: File | string, preview: string, name: string}} ImageObject
 * @typedef {{source: File | string, preview: string, name: string}} BookObject
 * @typedef {{width: number, height: number}} SizeInfo
 * @typedef {'text' | 'book'} EmailVariant
 * @typedef {'transparent' | 'solid'} OverlayStyle
 *
 * @typedef {object} CompositeParams
 * @property {string} background
 * @property {BookObject[]} books
 * @property {EmailVariant} emailVariant
 * @property {string} overlayText
 * @property {string} overlayColor
 * @property {number} overlayAlpha
 * @property {number} fontSize
 * @property {number} lineHeight
 * @property {OverlayStyle} overlayStyle
 * @property {number} [blurAmount]
 * @property {number} [ditherAmount]
 * @property {SizeInfo} size
 *
 * @typedef {object} BatchParams
 * @property {ImageObject[]} images
 * @property {string[]} objectColors
 * @property {string} backgroundColor
 * @property {Object<string, SizeInfo>} sizes
 * @property {BookObject[]} books
 * @property {EmailVariant} emailVariant
 * @property {OverlayStyle} overlayStyle
 * @property {number} seed
 * @property {number} fontSize
 * @property {number} lineHeight
 * @property {string} overlayText
 * @property {number} [blurAmount]
 * @property {number} [ditherAmount]
 * @property {number} overlayAlpha
 *
 * @typedef {object} WorkerReturn
 * @property {function(ImageObject[], string[], string, SizeInfo, number): Promise<string>} generateBackground
 * @property {function(CompositeParams): Promise<string>} compositeOverlay
 * @property {function(BatchParams): Promise<Object<string, string>>} generatePatternBatch
 * @property {function(): boolean} isWorkerAvailable
 */

/**
 * @returns {WorkerReturn}
 */
export function usePatternWorker() {
  /** @type {React.MutableRefObject<Worker | null>} */
  const workerRef = useRef(null);
  /** @type {React.MutableRefObject<Map<number, {resolve: function(*): void, reject: function(Error): void}>>} */
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

  /**
   * @param {string} type
   * @param {*} payload
   * @returns {Promise<*>}
   */
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

  /**
   * @param {ImageObject[]} images
   * @param {string[]} objectColors
   * @param {string} backgroundColor
   * @param {SizeInfo} size
   * @param {number} seed
   * @returns {Promise<string>}
   */
  const generateBackground = useCallback(async (images, objectColors, backgroundColor, size, seed) => {
    return sendMessage('GENERATE_BACKGROUND', {
      images,
      objectColors,
      backgroundColor,
      size,
      seed
    });
  }, [sendMessage]);

  /**
   * @param {CompositeParams} params
   * @returns {Promise<string>}
   */
  const compositeOverlay = useCallback(async (params) => {
    return sendMessage('COMPOSITE_OVERLAY', params);
  }, [sendMessage]);

  /**
   * @param {BatchParams} params
   * @returns {Promise<Object<string, string>>}
   */
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