// Pattern Generator State Reducer
// Consolidates all pattern-related state into a single, predictable reducer

// Action Types
export const PATTERN_ACTIONS = {
  // UI State
  SET_SELECTED_SIZE_KEY: 'SET_SELECTED_SIZE_KEY',
  SET_ACTIVE_SIZE_KEY: 'SET_ACTIVE_SIZE_KEY',
  SET_IS_RENDERING: 'SET_IS_RENDERING',
  SET_ERROR: 'SET_ERROR',
  SET_HAS_AUTO_RENDERED: 'SET_HAS_AUTO_RENDERED',
  SET_PROGRESS: 'SET_PROGRESS',
  SET_PROGRESS_MESSAGE: 'SET_PROGRESS_MESSAGE',
  
  // Pattern Data
  SET_COLORS: 'SET_COLORS',
  SET_SELECTED_GENRE: 'SET_SELECTED_GENRE',
  SET_IMAGES: 'SET_IMAGES',
  SET_BOOKS: 'SET_BOOKS',
  SET_PATTERN_SEED: 'SET_PATTERN_SEED',
  
  // Overlay Settings
  SET_EMAIL_VARIANT: 'SET_EMAIL_VARIANT',
  SET_OVERLAY_TEXT: 'SET_OVERLAY_TEXT',
  SET_OVERLAY_STYLE: 'SET_OVERLAY_STYLE',
  SET_OVERLAY_COLOR: 'SET_OVERLAY_COLOR',
  SET_OVERLAY_ALPHA: 'SET_OVERLAY_ALPHA',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_LINE_HEIGHT: 'SET_LINE_HEIGHT',
  
  // Cache Management
  SET_BACKGROUND_CACHE: 'SET_BACKGROUND_CACHE',
  SET_COMPOSITED_PATTERNS: 'SET_COMPOSITED_PATTERNS',
  UPDATE_BACKGROUND_CACHE: 'UPDATE_BACKGROUND_CACHE',
  UPDATE_COMPOSITED_PATTERNS: 'UPDATE_COMPOSITED_PATTERNS',
  CLEAR_CACHE: 'CLEAR_CACHE',
  
  // Batch Operations
  RESET_FOR_NEW_RENDER: 'RESET_FOR_NEW_RENDER',
  INITIALIZE_STATE: 'INITIALIZE_STATE',
};

// Initial State
export const createInitialState = (GENRE_COLORS_OBJ, defaultImages, defaultBooks) => ({
  // UI State
  selectedSizeKey: 'all-sizes',
  activeSizeKey: 'all-sizes',
  isRendering: false,
  error: null,
  hasAutoRendered: false,
  progress: 0,
  progressMessage: 'Ready to generate...',
  
  // Pattern Data
  colors: GENRE_COLORS_OBJ["Romance"],
  selectedGenre: "Romance",
  images: defaultImages,
  books: defaultBooks,
  patternSeed: Math.random(),
  
  // Overlay Settings
  emailVariant: 'text',
  overlayText: 'Must read romances of the season.',
  overlayStyle: 'transparent',
  overlayColor: null,
  overlayAlpha: 1,
  fontSize: 116,
  lineHeight: 96,
  
  // Cache
  backgroundCache: {},
  compositedPatterns: {},
});

// Reducer Function
export function patternReducer(state, action) {
  switch (action.type) {
    // UI State Actions
    case PATTERN_ACTIONS.SET_SELECTED_SIZE_KEY:
      return {
        ...state,
        selectedSizeKey: action.payload,
        // Auto-update activeSizeKey if it matches selectedSizeKey
        activeSizeKey: state.activeSizeKey === state.selectedSizeKey ? action.payload : state.activeSizeKey,
      };
      
    case PATTERN_ACTIONS.SET_ACTIVE_SIZE_KEY:
      return { ...state, activeSizeKey: action.payload };
      
    case PATTERN_ACTIONS.SET_IS_RENDERING:
      return { ...state, isRendering: action.payload };
      
    case PATTERN_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
      
    case PATTERN_ACTIONS.SET_HAS_AUTO_RENDERED:
      return { ...state, hasAutoRendered: action.payload };
      
    case PATTERN_ACTIONS.SET_PROGRESS:
      return { ...state, progress: action.payload };
      
    case PATTERN_ACTIONS.SET_PROGRESS_MESSAGE:
      return { ...state, progressMessage: action.payload };
    
    // Pattern Data Actions
    case PATTERN_ACTIONS.SET_COLORS:
      return { ...state, colors: action.payload };
      
    case PATTERN_ACTIONS.SET_SELECTED_GENRE:
      return { ...state, selectedGenre: action.payload };
      
    case PATTERN_ACTIONS.SET_IMAGES:
      return { ...state, images: action.payload };
      
    case PATTERN_ACTIONS.SET_BOOKS:
      return { ...state, books: action.payload };
      
    case PATTERN_ACTIONS.SET_PATTERN_SEED:
      return { ...state, patternSeed: action.payload };
    
    // Overlay Settings Actions
    case PATTERN_ACTIONS.SET_EMAIL_VARIANT:
      return { ...state, emailVariant: action.payload };
      
    case PATTERN_ACTIONS.SET_OVERLAY_TEXT:
      return { ...state, overlayText: action.payload };
      
    case PATTERN_ACTIONS.SET_OVERLAY_STYLE:
      return { ...state, overlayStyle: action.payload };
      
    case PATTERN_ACTIONS.SET_OVERLAY_COLOR:
      return { ...state, overlayColor: action.payload };
      
    case PATTERN_ACTIONS.SET_OVERLAY_ALPHA:
      return { ...state, overlayAlpha: action.payload };
      
    case PATTERN_ACTIONS.SET_FONT_SIZE:
      return { ...state, fontSize: action.payload };
      
    case PATTERN_ACTIONS.SET_LINE_HEIGHT:
      return { ...state, lineHeight: action.payload };
    
    // Cache Management Actions
    case PATTERN_ACTIONS.SET_BACKGROUND_CACHE:
      return { ...state, backgroundCache: action.payload };
      
    case PATTERN_ACTIONS.SET_COMPOSITED_PATTERNS:
      return { ...state, compositedPatterns: action.payload };
      
    case PATTERN_ACTIONS.UPDATE_BACKGROUND_CACHE:
      return {
        ...state,
        backgroundCache: { ...state.backgroundCache, ...action.payload }
      };
      
    case PATTERN_ACTIONS.UPDATE_COMPOSITED_PATTERNS:
      return {
        ...state,
        compositedPatterns: { ...state.compositedPatterns, ...action.payload }
      };
      
    case PATTERN_ACTIONS.CLEAR_CACHE:
      return {
        ...state,
        backgroundCache: {},
        compositedPatterns: {},
      };
    
    // Batch Operations
    case PATTERN_ACTIONS.RESET_FOR_NEW_RENDER:
      return {
        ...state,
        isRendering: true,
        error: null,
        backgroundCache: {},
        compositedPatterns: {},
      };
      
    case PATTERN_ACTIONS.INITIALIZE_STATE:
      return { ...state, ...action.payload };
    
    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

// Action Creators for convenience
export const createActions = (dispatch) => ({
  // UI Actions
  setSelectedSizeKey: (key) => dispatch({ type: PATTERN_ACTIONS.SET_SELECTED_SIZE_KEY, payload: key }),
  setActiveSizeKey: (key) => dispatch({ type: PATTERN_ACTIONS.SET_ACTIVE_SIZE_KEY, payload: key }),
  setIsRendering: (rendering) => dispatch({ type: PATTERN_ACTIONS.SET_IS_RENDERING, payload: rendering }),
  setError: (error) => dispatch({ type: PATTERN_ACTIONS.SET_ERROR, payload: error }),
  setHasAutoRendered: (rendered) => dispatch({ type: PATTERN_ACTIONS.SET_HAS_AUTO_RENDERED, payload: rendered }),
  setProgress: (progress) => dispatch({ type: PATTERN_ACTIONS.SET_PROGRESS, payload: progress }),
  setProgressMessage: (message) => dispatch({ type: PATTERN_ACTIONS.SET_PROGRESS_MESSAGE, payload: message }),
  
  // Pattern Data Actions
  setColors: (colors) => dispatch({ type: PATTERN_ACTIONS.SET_COLORS, payload: colors }),
  setSelectedGenre: (genre) => dispatch({ type: PATTERN_ACTIONS.SET_SELECTED_GENRE, payload: genre }),
  setImages: (images) => dispatch({ type: PATTERN_ACTIONS.SET_IMAGES, payload: images }),
  setBooks: (books) => dispatch({ type: PATTERN_ACTIONS.SET_BOOKS, payload: books }),
  setPatternSeed: (seed) => dispatch({ type: PATTERN_ACTIONS.SET_PATTERN_SEED, payload: seed }),
  
  // Overlay Actions
  setEmailVariant: (variant) => dispatch({ type: PATTERN_ACTIONS.SET_EMAIL_VARIANT, payload: variant }),
  setOverlayText: (text) => dispatch({ type: PATTERN_ACTIONS.SET_OVERLAY_TEXT, payload: text }),
  setOverlayStyle: (style) => dispatch({ type: PATTERN_ACTIONS.SET_OVERLAY_STYLE, payload: style }),
  setOverlayColor: (color) => dispatch({ type: PATTERN_ACTIONS.SET_OVERLAY_COLOR, payload: color }),
  setOverlayAlpha: (alpha) => dispatch({ type: PATTERN_ACTIONS.SET_OVERLAY_ALPHA, payload: alpha }),
  setFontSize: (size) => dispatch({ type: PATTERN_ACTIONS.SET_FONT_SIZE, payload: size }),
  setLineHeight: (height) => dispatch({ type: PATTERN_ACTIONS.SET_LINE_HEIGHT, payload: height }),
  
  // Cache Actions
  setBackgroundCache: (cache) => dispatch({ type: PATTERN_ACTIONS.SET_BACKGROUND_CACHE, payload: cache }),
  setCompositedPatterns: (patterns) => dispatch({ type: PATTERN_ACTIONS.SET_COMPOSITED_PATTERNS, payload: patterns }),
  updateBackgroundCache: (updates) => dispatch({ type: PATTERN_ACTIONS.UPDATE_BACKGROUND_CACHE, payload: updates }),
  updateCompositedPatterns: (updates) => dispatch({ type: PATTERN_ACTIONS.UPDATE_COMPOSITED_PATTERNS, payload: updates }),
  clearCache: () => dispatch({ type: PATTERN_ACTIONS.CLEAR_CACHE }),
  
  // Batch Actions
  resetForNewRender: () => dispatch({ type: PATTERN_ACTIONS.RESET_FOR_NEW_RENDER }),
  initializeState: (state) => dispatch({ type: PATTERN_ACTIONS.INITIALIZE_STATE, payload: state }),
});

// Selectors for computed values
export const createSelectors = (state) => ({
  // Basic selectors
  getColors: () => state.colors,
  getImages: () => state.images,
  getBooks: () => state.books,
  getError: () => state.error,
  getIsRendering: () => state.isRendering,
  
  // Computed selectors
  getBackgroundColor: () => state.colors[0],
  getObjectColors: () => state.colors.slice(1),
  getHasValidImages: () => state.images.length > 0,
  getHasValidColors: () => state.colors.length >= 2,
  getCanRender: () => state.images.length > 0 && state.colors.length >= 2 && !state.isRendering,
  getHasPatterns: () => Object.keys(state.compositedPatterns).length > 0,
  
  // Cache selectors
  getPatternForSize: (sizeKey) => state.compositedPatterns[sizeKey],
  getBackgroundForSize: (sizeKey) => state.backgroundCache[sizeKey],
  getCacheKeys: () => Object.keys(state.backgroundCache),
});