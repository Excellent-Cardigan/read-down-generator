import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { generateFireflyImage, resolvePromptPlaceholders } from "../server/imageGeneration.js";
import { getDescribedColors } from "../server/colorNaming.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const grayColors = ["#808080", "#A0A0A0", "#606060"];

async function generatePreviews() {
  const promptsPath = join(__dirname, "../server/config/aiPrompts.json");
  const outputDir = join(__dirname, "../public/images/ai-previews");

  mkdirSync(outputDir, { recursive: true });

  const promptsData = readFileSync(promptsPath, "utf-8");
  const { prompts } = JSON.parse(promptsData);

  console.log(`Generating ${prompts.length} preview images with gray colors...`);
  console.log(`Colors: ${grayColors.join(", ")}\n`);

  // Convert gray hex colors to described colors with names
  const describedGrayColors = await getDescribedColors(grayColors);
  console.log(`Described gray colors: ${describedGrayColors.join(", ")}\n`);

  for (const prompt of prompts) {
    console.log(`Generating preview for: ${prompt.name} (${prompt.id})...`);

    try {
      const resolvedPrompt = resolvePromptPlaceholders(prompt.text, describedGrayColors);
      console.log(`  Prompt: ${resolvedPrompt}`);

      const styleOptions = {
        stylePreset: prompt.stylePreset,
        styleStrength: prompt.styleStrength,
        visualIntensity: prompt.visualIntensity,
      };

      const imageDataUrl = await generateFireflyImage(resolvedPrompt, styleOptions);

      const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const outputPath = join(outputDir, `${prompt.id}.jpg`);
      writeFileSync(outputPath, buffer);

      console.log(`  ✓ Saved to ${outputPath}\n`);
    } catch (error: any) {
      console.error(`  ✗ Failed: ${error.message}\n`);
    }
  }

  console.log("All previews generated!");
}

generatePreviews().catch(console.error);
