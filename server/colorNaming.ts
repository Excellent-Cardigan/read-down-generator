// Color naming and transformation for prompts

interface ColorName {
  hex: string;
  name: string;
}

const colorNameCache = new Map<string, string>();

export async function fetchColorNames(hexColors: string[]): Promise<Map<string, string>> {
  const uncached = hexColors.filter(hex => !colorNameCache.has(hex.toUpperCase()));

  if (uncached.length === 0) {
    const result = new Map<string, string>();
    for (const hex of hexColors) {
      result.set(hex.toUpperCase(), colorNameCache.get(hex.toUpperCase()) || "unknown");
    }
    return result;
  }

  try {
    // Batch request to thecolorapi.com
    const results = await Promise.all(
      uncached.map(async (hex) => {
        const cleanHex = hex.replace('#', '');
        const res = await fetch(`https://www.thecolorapi.com/id?hex=${cleanHex}`);
        if (!res.ok) throw new Error(`Color API failed for ${hex}`);
        const data = await res.json();
        return {
          hex: hex.toUpperCase(),
          name: data.name?.value || "unknown color"
        };
      })
    );

    for (const { hex, name } of results) {
      colorNameCache.set(hex, name);
    }
  } catch (err) {
    console.error("Failed to fetch color names:", err);
    // Fallback to basic names
    for (const hex of uncached) {
      colorNameCache.set(hex.toUpperCase(), `color ${hex}`);
    }
  }

  const result = new Map<string, string>();
  for (const hex of hexColors) {
    result.set(hex.toUpperCase(), colorNameCache.get(hex.toUpperCase()) || "unknown");
  }
  return result;
}

export async function getDescribedColors(hexColors: string[]): Promise<string[]> {
  if (!hexColors || hexColors.length === 0) return [];

  const nameMap = await fetchColorNames(hexColors);
  return hexColors.map(hex => {
    const name = nameMap.get(hex.toUpperCase()) || "unknown";
    return `${name} (${hex})`;
  });
}
