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

export default router;
