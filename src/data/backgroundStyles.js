const floralModules = import.meta.glob('../assets/floral/*.png', { eager: true });
const shapesModules = import.meta.glob('../assets/shapes/*.png', { eager: true });

export const floralImages = Object.entries(floralModules).map(([path, mod]) => ({
  source: mod.default,
  preview: mod.default,
  name: path.split('/').pop(),
}));

export const shapesImages = Object.entries(shapesModules).map(([path, mod]) => ({
  source: mod.default,
  preview: mod.default,
  name: path.split('/').pop(),
}));
