import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist/client");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

if (basePath && !basePath.startsWith("/")) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must start with a slash.");
}

const escapedBasePath = basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const unprefixedAssetPattern = basePath
  ? new RegExp(`(?<!${escapedBasePath})/_next/`, "g")
  : null;

async function patchGeneratedFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return patchGeneratedFiles(entryPath);
      if (!/\.(?:html|rsc|css|js|json)$/.test(entry.name)) return;

      const source = await readFile(entryPath, "utf8");
      const patched = unprefixedAssetPattern
        ? source.replace(unprefixedAssetPattern, `${basePath}/_next/`)
        : source;
      if (patched !== source) await writeFile(entryPath, patched);
    }),
  );
}

async function createPrettyRoute(route) {
  const sourcePath = path.join(outputDirectory, `${route}.html`);
  const routeDirectory = path.join(outputDirectory, route);
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(
    path.join(routeDirectory, "index.html"),
    await readFile(sourcePath),
  );
}

await patchGeneratedFiles(outputDirectory);
await Promise.all(
  ["join", "people", "publications", "research"].map(createPrettyRoute),
);
await writeFile(path.join(outputDirectory, ".nojekyll"), "");
