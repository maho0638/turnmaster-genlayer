import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../contracts/TurnMasterEscrow.py", import.meta.url));
const published = fileURLToPath(new URL("../public/TurnMasterEscrow.py", import.meta.url));
const pairs = [
  [source, published],
  [
    fileURLToPath(new URL("../contracts/TurnMasterDirectory.py", import.meta.url)),
    fileURLToPath(new URL("../public/TurnMasterDirectory.py", import.meta.url)),
  ],
];

for (const [sourcePath, publishedPath] of pairs) {
  const [sourceText, publishedText] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(publishedPath, "utf8").catch(() => ""),
  ]);
  if (sourceText !== publishedText) await copyFile(sourcePath, publishedPath);
}
