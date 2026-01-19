import { useReducer, useMemo } from 'react';
import { patternReducer, createInitialState, createActions, createSelectors } from '../state/patternReducer';

/**
 * @typedef {import('../state/patternReducer').PatternState} PatternState
 * @typedef {import('../state/patternReducer').PatternActions} PatternActions
 * @typedef {import('../state/patternReducer').PatternSelectors} PatternSelectors
 * @typedef {import('../state/patternReducer').Dispatch} Dispatch
 * @typedef {import('../state/patternReducer').ImageObject} ImageObject
 * @typedef {import('../state/patternReducer').BookObject} BookObject
 *
 * @typedef {object} PatternStateReturn
 * @property {PatternState} state
 * @property {PatternActions} actions
 * @property {PatternSelectors} selectors
 * @property {Dispatch} dispatch
 */

/**
 * @param {Object<string, string[]>} GENRE_COLORS_OBJ
 * @param {ImageObject[]} defaultImages
 * @param {BookObject[]} defaultBooks
 * @returns {PatternStateReturn}
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