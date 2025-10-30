// @vitest-environment node

import { type ViteDevServer } from "vite";
import path from "path";
import fs from "fs";
import { TextEncoder, TextDecoder } from "util";
import { Buffer } from "buffer";

export const projectRoot = process.cwd();
const entryExts = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".mts"];

export async function loadModule(filePathRelativeToProjectRootDir: string) {
  const restoreGlobals = hackGlobalsForVite();
  try {
    const vite = await getVite();

    const fullPath = path.join(projectRoot, filePathRelativeToProjectRootDir);

    return await vite.ssrLoadModule(fullPath);
  } finally {
    restoreGlobals();
  }
}

/**
 * @param basename - filename without the extension
 */
export function findFileInProjectRoot(
  basename: string,
  { absolutePath = true }: { absolutePath?: boolean } = { absolutePath: true }
): string | undefined {
  for (const ext of entryExts) {
    const fullFilename = path.join(projectRoot, basename + ext);
    if (fs.existsSync(fullFilename)) {
      return absolutePath
        ? fullFilename
        : path.relative(projectRoot, fullFilename);
    }
  }

  return undefined;
}

let vite: Promise<ViteDevServer> | undefined;
function getVite() {
  if (!vite) {
    const viteConfigFilePath = findFileInProjectRoot("vite.config");

    if (!viteConfigFilePath) {
      throw new Error(
        "react-router-test-router: could not find vite.config.(ts|js|mjs|mts) in your project root. Please create one to use this library."
      );
    }

    vite = import("vite").then((Vite) =>
      Vite.createServer({
        root: projectRoot,
        configFile: viteConfigFilePath,
        configLoader: "bundle",
        server: { middlewareMode: true, ws: false },
        appType: "custom",
      })
    );
  }

  return vite!;
}

/**
 * When we import vite, it checks for TextEncoder/TextDecoder/Uint8Array
 * globals, and if they don't match the ones it expects, it throws an error.
 * This function temporarily hacks the globals to match what vite expects.
 */
function hackGlobalsForVite() {
  const originalTextEncoder = globalThis.TextEncoder;
  const originalTextDecoder = globalThis.TextDecoder;
  const originalUint8Array = globalThis.Uint8Array;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocation = globalThis.location;

  globalThis.TextEncoder = TextEncoder;
  // @ts-expect-error - i know what i'm doing
  globalThis.TextDecoder = TextDecoder;

  globalThis.Uint8Array = Object.getPrototypeOf(Buffer.prototype)
    .constructor as typeof Uint8Array;

  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).location;

  return () => {
    globalThis.TextEncoder = originalTextEncoder;
    globalThis.TextDecoder = originalTextDecoder;
    globalThis.Uint8Array = originalUint8Array;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.location = originalLocation;
  };
}
