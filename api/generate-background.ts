import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import prompts from './config/aiPrompts.json';

interface FireflyStyleOptions {
  stylePreset?: string;
  styleStrength?: number;
  visualIntensity?: number;
}

const FIREFLY_BASE_URL = "https://firefly.api.bertelsmann.de/firefly";

const colorNameCache = new Map<string, string>();

async function fetchColorNames(hexColors: string[]): Promise<Map<string, string>> {
  const uncached = hexColors.filter(hex => !colorNameCache.has(hex.toUpperCase()));

  if (uncached.length === 0) {
    const result = new Map<string, string>();
    for (const hex of hexColors) {
      result.set(hex.toUpperCase(), colorNameCache.get(hex.toUpperCase()) || "unknown");
    }
    return result;
  }

  try {
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

async function getDescribedColors(hexColors: string[]): Promise<string[]> {
  if (!hexColors || hexColors.length === 0) return [];

  const nameMap = await fetchColorNames(hexColors);
  return hexColors.map(hex => {
    const name = nameMap.get(hex.toUpperCase()) || "unknown";
    return `${name} (${hex})`;
  });
}

function resolvePromptPlaceholders(template: string, colors: string[]): string {
  return template
    .replace(/\$\{color1\}/g, colors[0] || '')
    .replace(/\$\{color2\}/g, colors[1] || '')
    .replace(/\$\{color3\}/g, colors[2] || '')
    .replace(/\$\{allColors\}/g, colors.join(', '))
    .replace(/\$\{backgroundColor\}/g, colors[0] || '');
}

async function pollFireflyJob(jobId: string, apiKey: string, maxAttempts: number = 60): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await fetch(`${FIREFLY_BASE_URL}/v3/status/${jobId}`, {
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Firefly status check failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as any;

    if (data.status === "succeeded") {
      return data.result;
    } else if (data.status === "failed" || data.status === "canceled" || data.status === "cancelled") {
      throw new Error(`Firefly job ${data.status}: ${data.message || "Unknown error"}`);
    }
  }

  throw new Error("Firefly job timed out after 2 minutes");
}

async function generateFireflyImage(prompt: string, styleOptions?: FireflyStyleOptions): Promise<string> {
  const apiKey = process.env.FIREFLY_API_KEY;
  if (!apiKey) {
    throw new Error("FIREFLY_API_KEY not configured");
  }

  const body: Record<string, any> = {
    prompt,
    numVariations: 1,
    size: { width: 1792, height: 2304 },
    contentClass: "art",
    promptBiasingLocaleCode: "en-US",
  };

  if (styleOptions?.stylePreset) {
    body.styles = [{ presetName: styleOptions.stylePreset }];
  }
  if (styleOptions?.styleStrength != null) {
    body.styleStrength = styleOptions.styleStrength;
  }
  if (styleOptions?.visualIntensity != null) {
    body.visualIntensity = styleOptions.visualIntensity;
  }

  const response = await fetch(`${FIREFLY_BASE_URL}/v3/images/generate-async`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firefly generation failed (${response.status}): ${errorText}`);
  }

  const asyncResponse = (await response.json()) as any;
  const jobId = asyncResponse.jobId;

  if (!jobId) {
    throw new Error("Firefly returned no jobId");
  }

  const result = await pollFireflyJob(jobId, apiKey);

  const imageUrl = result?.outputs?.[0]?.image?.url;
  if (!imageUrl) {
    throw new Error("Firefly returned no image URL in result");
  }

  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error(`Failed to download Firefly image: ${imgResponse.status}`);
  }

  const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
  const base64 = imgBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

function parseNovaConfig(): { region: string; modelId: string } {
  const awsRegionOrArn = process.env.AWS_REGION || "";

  if (awsRegionOrArn.startsWith("arn:")) {
    const arnParts = awsRegionOrArn.split(":");
    const region = arnParts[3] || "us-east-1";
    return { region, modelId: awsRegionOrArn };
  }

  return { region: awsRegionOrArn || "us-east-1", modelId: "amazon.nova-canvas-v1:0" };
}

async function generateNovaImage(prompt: string): Promise<string> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }

  const { region, modelId } = parseNovaConfig();

  const credentials: any = { accessKeyId, secretAccessKey };
  if (sessionToken) {
    credentials.sessionToken = sessionToken;
  }

  const client = new BedrockRuntimeClient({ region, credentials });

  const payload = {
    taskType: "TEXT_IMAGE",
    textToImageParams: {
      text: prompt,
    },
    imageGenerationConfig: {
      height: 1024,
      width: 1024,
      quality: "standard",
      cfgScale: 6.5,
      numberOfImages: 1,
    },
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body)) as any;

  if (responseBody.error) {
    throw new Error(`Nova error: ${responseBody.error}`);
  }

  if (!responseBody.images || responseBody.images.length === 0) {
    throw new Error("Nova returned no images");
  }

  const base64Image = responseBody.images[0];
  return `data:image/jpeg;base64,${base64Image}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { promptId, colors, engine, width, height } = req.body;

    console.log('🎨 Server received colors (hex):', colors);

    if (!promptId || !colors || !Array.isArray(colors)) {
      return res.status(400).json({ message: "Missing required fields: promptId, colors" });
    }

    const promptConfig = prompts.prompts.find((p: any) => p.id === promptId);
    if (!promptConfig) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    const describedColors = await getDescribedColors(colors);
    console.log('🎨 Described colors:', describedColors);

    const randomColorIndex = Math.floor(Math.random() * describedColors.length);
    const selectedColor = describedColors[randomColorIndex];
    console.log('🎲 Randomly selected color:', selectedColor, `(index ${randomColorIndex})`);

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

    return res.status(200).json({
      imageDataUrl,
      promptUsed: resolvedPrompt,
    });
  } catch (error: any) {
    console.error("Background generation error:", error);
    return res.status(500).json({ message: error.message || "Failed to generate background" });
  }
}
