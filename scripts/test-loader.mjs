import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, defaultResolve) {
  // If specifier is a relative path or alias
  if (specifier.startsWith("@/")) {
    const rootDir = process.cwd();
    const relPath = specifier.replace("@/", "src/");
    for (const ext of ["", ".ts", ".tsx", ".js", ".mjs", ".json", "/index.ts", "/index.js"]) {
      const candidate = path.resolve(rootDir, relPath + ext);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          url: pathToFileURL(candidate).href,
          shortCircuit: true,
        };
      }
    }
  }

  try {
    return await defaultResolve(specifier, context);
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND" && (specifier.startsWith(".") || specifier.startsWith("/"))) {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
      for (const ext of [".ts", ".tsx", ".js", ".mjs", ".json", "/index.ts", "/index.js"]) {
        const candidate = path.resolve(parentDir, specifier + ext);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return {
            url: pathToFileURL(candidate).href,
            shortCircuit: true,
          };
        }
      }
    }
    throw err;
  }
}
