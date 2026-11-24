import express from "express";
import multer from "multer";
import { extractDominantColors } from "./colorExtractor.js";
import { generateFireflyImage, generateNovaImage, resolvePromptPlaceholders } from "./imageGeneration.js";
import { getDescribedColors } from "./colorNaming.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

router.post("/extract-colors", upload.single("image"), async (req, res) => {
  try {
    const buffer = req.file?.buffer || (req.body.imageBase64 ? Buffer.from(req.body.imageBase64, "base64") : null);

    if (!buffer) {
      return res.status(400).json({ message: "No image provided" });
    }

    const colors = await extractDominantColors(buffer, 5);
    res.json({ colors });
  } catch (error: any) {
    console.error("Color extraction error:", error);
    res.status(500).json({ message: error.message || "Failed to extract colors" });
  }
});

router.get("/ai-prompts", (req, res) => {
  try {
    const promptsPath = join(__dirname, "config", "aiPrompts.json");
    const promptsData = readFileSync(promptsPath, "utf-8");
    const { prompts } = JSON.parse(promptsData);
    res.json({ prompts });
  } catch (error: any) {
    console.error("Failed to load AI prompts:", error);
    res.status(500).json({ message: "Failed to load AI prompts" });
  }
});

router.post("/generate-background", async (req, res) => {
  try {
    const { promptId, colors, engine, width, height } = req.body;

    console.log('🎨 Server received colors (hex):', colors);

    if (!promptId || !colors || !Array.isArray(colors)) {
      return res.status(400).json({ message: "Missing required fields: promptId, colors" });
    }

    const promptsPath = join(__dirname, "config", "aiPrompts.json");
    const promptsData = readFileSync(promptsPath, "utf-8");
    const { prompts } = JSON.parse(promptsData);

    const promptConfig = prompts.find((p: any) => p.id === promptId);
    if (!promptConfig) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    // Convert hex colors to described colors with names
    const describedColors = await getDescribedColors(colors);
    console.log('🎨 Described colors:', describedColors);

    // Randomly pick a color from the palette for this generation
    const randomColorIndex = Math.floor(Math.random() * describedColors.length);
    const selectedColor = describedColors[randomColorIndex];
    console.log('🎲 Randomly selected color:', selectedColor, `(index ${randomColorIndex})`);

    // Replace all ${color1} placeholders with the randomly selected color
    const promptWithRandomColor = promptConfig.text.replace(/\$\{color1\}/g, selectedColor);
    const resolvedPrompt = resolvePromptPlaceholders(promptWithRandomColor, describedColors);
    console.log('🔍 Resolved prompt:', resolvedPrompt);

    let imageDataUrl: string;
    const selectedEngine = engine || "firefly";

    if (selectedEngine === "nova") {
      imageDataUrl = await generateNovaImage(resolvedPrompt);
    } else {
      const styleOptions = {
        stylePreset: promptConfig.stylePreset,
        styleStrength: promptConfig.styleStrength,
        visualIntensity: promptConfig.visualIntensity,
      };
      imageDataUrl = await generateFireflyImage(resolvedPrompt, styleOptions);
    }

    res.json({
      imageDataUrl,
      promptUsed: resolvedPrompt,
    });
  } catch (error: any) {
    console.error("Background generation error:", error);
    res.status(500).json({ message: error.message || "Failed to generate background" });
  }
});

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) return null;
    return buffer;
  } catch {
    return null;
  }
}

async function fetchBookCover(isbn: string): Promise<{ coverUrl: string; title: string | null }> {
  let title: string | null = null;
  let coverUrl: string | null = null;
  let imageBuffer: Buffer | null = null;

  const googleRes = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  ).catch(() => null);

  if (googleRes?.ok) {
    const googleData = (await googleRes.json()) as any;
    const volume = googleData.items?.[0]?.volumeInfo;
    if (volume) {
      title = volume.title || null;
      const thumbnail = volume.imageLinks?.thumbnail;
      if (thumbnail) {
        const hiRes = thumbnail
          .replace("zoom=1", "zoom=3")
          .replace("&edge=curl", "")
          .replace("http://", "https://");
        imageBuffer = await fetchImageBuffer(hiRes);
        if (imageBuffer) {
          coverUrl = hiRes;
        } else {
          const medRes = thumbnail
            .replace("&edge=curl", "")
            .replace("http://", "https://");
          imageBuffer = await fetchImageBuffer(medRes);
          if (imageBuffer) {
            coverUrl = medRes;
          }
        }
      }
    }
  }

  if (!coverUrl) {
    for (const host of ["images2", "images1", "images3"]) {
      const prhUrl = `https://${host}.penguinrandomhouse.com/cover/700jpg/${isbn}`;
      imageBuffer = await fetchImageBuffer(prhUrl);
      if (imageBuffer) {
        coverUrl = prhUrl;
        break;
      }
    }
  }

  if (!coverUrl) {
    const directGoogleUrl = `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=3`;
    imageBuffer = await fetchImageBuffer(directGoogleUrl);
    if (imageBuffer) {
      coverUrl = directGoogleUrl;
    }
  }

  if (!coverUrl) {
    try {
      const olRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (olRes.ok) {
        const olData = (await olRes.json()) as any;
        if (!title) title = olData.title || null;
        const coverId = olData.covers?.[0];
        if (coverId) {
          const olCoverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
          imageBuffer = await fetchImageBuffer(olCoverUrl);
          if (imageBuffer) {
            coverUrl = olCoverUrl;
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching cover from Open Library for ISBN ${isbn}:`, err);
    }
  }

  if (!coverUrl) {
    const olCoverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    imageBuffer = await fetchImageBuffer(olCoverUrl);
    if (imageBuffer) {
      coverUrl = olCoverUrl;
    }
  }

  if (!title) {
    try {
      const olRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (olRes.ok) {
        const olData = (await olRes.json()) as any;
        title = olData.title || null;
      }
    } catch (err) {
      console.error(`Error fetching title from Open Library for ISBN ${isbn}:`, err);
    }
  }

  if (!coverUrl || !imageBuffer) {
    throw new Error(`No cover image found for ISBN ${isbn}`);
  }

  return { coverUrl, title };
}

router.post("/fetch-book-cover", async (req, res) => {
  try {
    const { isbn } = req.body;

    if (!isbn || typeof isbn !== "string") {
      return res.status(400).json({ message: "ISBN is required" });
    }

    const cleanIsbn = isbn.replace(/[-\s]/g, "").trim();

    if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
      return res.status(400).json({ message: "Invalid ISBN format. Must be 10 or 13 digits." });
    }

    const result = await fetchBookCover(cleanIsbn);

    res.json({
      isbn: cleanIsbn,
      coverUrl: result.coverUrl,
      title: result.title,
    });
  } catch (error: any) {
    console.error("Book cover fetch error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch book cover" });
  }
});

export default router;
