import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../contracts/TurnMasterEscrow.py", import.meta.url));
const published = fileURLToPath(new URL("../public/TurnMasterEscrow.py", import.meta.url));
const [sourceText, publishedText] = await Promise.all([
  readFile(source, "utf8"),
  readFile(published, "utf8").catch(() => ""),
]);

if (sourceText !== publishedText) await copyFile(source, published);
