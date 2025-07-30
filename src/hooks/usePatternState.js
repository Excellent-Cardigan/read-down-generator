import { useReducer, useMemo } from 'react';
import { patternReducer, createInitialState, createActions, createSelectors } from '../state/patternReducer';

/**
 * Custom hook for managing pattern generator state
 * Consolidates all state management into a single, predictable reducer
 */
export function usePatternState(GENRE_COLORS_OBJ, defaultImages, defaultBooks) {
  const initialState = useMemo(
    () => createInitialState(GENRE_COLORS_OBJ, defaultImages, defaultBooks),
    [GENRE_COLORS_OBJ, defaultImages, defaultBooks]
  );
  
  const [state, dispatch] = useReducer(patternReducer, initialState);
  
  // Create stable action creators
  const actions = useMemo(() => createActions(dispatch), []);
  
  // Create selectors with current state
  const selectors = useMemo(() => createSelectors(state), [state]);
  
  return {
    // Raw state (use sparingly, prefer selectors)
    state,
    
    // Action creators
    actions,
    
    // Selectors for computed values
    selectors,
    
    // Direct dispatch for complex operations
    dispatch,
  };
}