import type { VercelRequest, VercelResponse } from '@vercel/node';
import sharp from 'sharp';
import multiparty from 'multiparty';

interface ColorInfo {
  hex: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

async function extractDominantColors(imageBuffer: Buffer, count: number = 5): Promise<ColorInfo[]> {
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

async function parseMultipartForm(req: VercelRequest): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);

      if (files.image && files.image[0]) {
        const fs = require('fs');
        const buffer = fs.readFileSync(files.image[0].path);
        resolve(buffer);
      } else if (fields.imageBase64 && fields.imageBase64[0]) {
        resolve(Buffer.from(fields.imageBase64[0], 'base64'));
      } else {
        resolve(null);
      }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let buffer: Buffer | null = null;

    if (req.headers['content-type']?.includes('multipart/form-data')) {
      buffer = await parseMultipartForm(req);
    } else if (req.body?.imageBase64) {
      buffer = Buffer.from(req.body.imageBase64, 'base64');
    }

    if (!buffer) {
      return res.status(400).json({ message: "No image provided" });
    }

    const colors = await extractDominantColors(buffer, 5);
    return res.status(200).json({ colors });
  } catch (error: any) {
    console.error("Color extraction error:", error);
    return res.status(500).json({ message: error.message || "Failed to extract colors" });
  }
}
