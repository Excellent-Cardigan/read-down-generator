import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export interface FireflyStyleOptions {
  stylePreset?: string;
  styleStrength?: number;
  visualIntensity?: number;
}

const FIREFLY_BASE_URL = "https://firefly.api.bertelsmann.de/firefly";

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

export async function generateFireflyImage(prompt: string, styleOptions?: FireflyStyleOptions): Promise<string> {
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

export async function generateNovaImage(prompt: string): Promise<string> {
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

export function resolvePromptPlaceholders(template: string, colors: string[]): string {
  console.log('🔧 Placeholder resolution:');
  console.log('  Template:', template);
  console.log('  Colors array:', colors);
  console.log('  color1:', colors[0]);
  console.log('  color2:', colors[1]);
  console.log('  color3:', colors[2]);

  const resolved = template
    .replace(/\$\{color1\}/g, colors[0] || '')
    .replace(/\$\{color2\}/g, colors[1] || '')
    .replace(/\$\{color3\}/g, colors[2] || '')
    .replace(/\$\{allColors\}/g, colors.join(', '))
    .replace(/\$\{backgroundColor\}/g, colors[0] || '');

  console.log('  Result:', resolved);
  return resolved;
}
