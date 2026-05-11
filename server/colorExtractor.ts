import sharp from "sharp";

interface ColorInfo {
  hex: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export async function extractDominantColors(imageBuffer: Buffer, count: number = 5): Promise<ColorInfo[]> {
  const { data } = await sharp(imageBuffer)
    .resize(100, 100, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 3) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  const colors = kMeansClustering(pixels, count);

  return colors.map(([r, g, b]) => ({
    hex: rgbToHex(r, g, b)
  }));
}

function kMeansClustering(
  pixels: [number, number, number][],
  k: number,
  maxIterations: number = 20
): [number, number, number][] {
  const step = Math.max(1, Math.floor(pixels.length / k));
  let centroids: [number, number, number][] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.min(i * step, pixels.length - 1);
    centroids.push([...pixels[idx]]);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: k }, () => []);

    for (const pixel of pixels) {
      let minDist = Infinity;
      let closest = 0;
      for (let c = 0; c < k; c++) {
        const dist = colorDistance(pixel, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          closest = c;
        }
      }
      clusters[closest].push(pixel);
    }

    let converged = true;
    for (let c = 0; c < k; c++) {
      if (clusters[c].length === 0) continue;
      const newCentroid: [number, number, number] = [0, 0, 0];
      for (const p of clusters[c]) {
        newCentroid[0] += p[0];
        newCentroid[1] += p[1];
        newCentroid[2] += p[2];
      }
      newCentroid[0] /= clusters[c].length;
      newCentroid[1] /= clusters[c].length;
      newCentroid[2] /= clusters[c].length;

      if (colorDistance(newCentroid, centroids[c]) > 1) {
        converged = false;
      }
      centroids[c] = newCentroid;
    }

    if (converged) break;
  }

  centroids.sort((a, b) => {
    const brightnessA = a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114;
    const brightnessB = b[0] * 0.299 + b[1] * 0.587 + b[2] * 0.114;
    return brightnessA - brightnessB;
  });

  return centroids;
}
