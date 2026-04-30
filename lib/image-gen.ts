// B-013 pilot: AI image generation via Replicate Flux 1.1 Pro plus an
// image-to-video helper for the Drawbridge entry clip. If pilot is
// approved, scale to B-014 (full Castle theme replacement). See
// docs/cli-briefs/B-013-ai-art-pilot.md.
//
// Two helpers:
// - generateImage: Flux 1.1 Pro text-to-image, returns Buffer.
// - generateVideoFromImage: image-to-video via a passed-in model slug,
//   returns Buffer plus the actual file extension (webm or mp4) detected
//   from the response bytes. The caller picks the model.
//
// Errors surface; no silent fallback. The caller (scripts/generate-pilot-art.ts)
// decides how to handle a video failure (per brief: log and ship without video).

import Replicate from "replicate";

export const FLUX_MODEL = "black-forest-labs/flux-1.1-pro" as const;

// Image-to-video candidates in order of preference per B-013 brief.
// CLI verifies reachability before committing to one.
export const VIDEO_MODEL_CANDIDATES = [
  "kwaivgi/kling-v1.6-pro",
  "lightricks/ltx-video",
  "stability-ai/stable-video-diffusion-img2vid-xt",
] as const;

function client(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");
  return new Replicate({ auth: token });
}

async function collectBytes(output: unknown): Promise<Buffer> {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) throw new Error("No output from Replicate");

  if (typeof first === "string") {
    const res = await fetch(first);
    if (!res.ok) throw new Error(`fetch ${first} failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (first instanceof ReadableStream) {
    const reader = first.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }
  const fo = first as { blob?: () => Promise<Blob>; url?: () => string | URL };
  if (typeof fo.blob === "function") {
    const blob = await fo.blob();
    return Buffer.from(await blob.arrayBuffer());
  }
  if (typeof fo.url === "function") {
    const url = fo.url();
    const u = typeof url === "string" ? url : url.toString();
    const res = await fetch(u);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`Unexpected Replicate output shape`);
}

export async function generateImage(opts: {
  prompt: string;
  aspect_ratio: "16:9" | "1:1";
  output_format?: "webp" | "png" | "jpg";
}): Promise<{ bytes: Buffer; bytesLength: number }> {
  const r = client();
  const input = {
    prompt: opts.prompt,
    aspect_ratio: opts.aspect_ratio,
    output_format: opts.output_format ?? "webp",
    output_quality: 90,
    safety_tolerance: 2,
    prompt_upsampling: false,
  };
  const output = await r.run(FLUX_MODEL, { input });
  const bytes = await collectBytes(output);
  return { bytes, bytesLength: bytes.byteLength };
}

// Quick reachability check used by the pilot script before it commits to a
// video model. Hits Replicate's models endpoint with the auth token.
export async function verifyModelExists(slug: string): Promise<boolean> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.replicate.com/v1/models/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function detectVideoExtension(buf: Buffer): "webm" | "mp4" {
  // EBML/WebM magic: 0x1A 45 DF A3
  if (
    buf.length >= 4 &&
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  ) {
    return "webm";
  }
  // ISO base media (mp4): "ftyp" at byte offset 4.
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    return "mp4";
  }
  // Default to mp4 since most current image-to-video models return it.
  return "mp4";
}

// Image-to-video. Caller supplies the model slug and a model-shaped input
// object (different models use different field names: start_image, image,
// input_image, etc). Helper handles the run + bytes + extension detection.
export async function generateVideoFromImage(
  modelSlug: string,
  input: Record<string, unknown>
): Promise<{ bytes: Buffer; extension: "webm" | "mp4"; bytesLength: number }> {
  const r = client();
  const output = await r.run(modelSlug as `${string}/${string}`, { input });
  const bytes = await collectBytes(output);
  const extension = detectVideoExtension(bytes);
  return { bytes, extension, bytesLength: bytes.byteLength };
}
