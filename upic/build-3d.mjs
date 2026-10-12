// Builds the rotatable three.js bench: node build-3d.mjs [--local <three package dir>]
// Writes upic-3d.html (a standalone page) and, with --fragment <file>, the page body alone.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const local = arg("--local");
const three = local ? pathToFileURL(resolve(local)).href + "/" : "https://cdn.jsdelivr.net/npm/three@0.160.0/";
const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const page = readFileSync(join(HERE, "upic-3d.template.html"), "utf8").replaceAll("@THREE@", three).replace("/*@MODEL@*/", () => model);

const fragment = arg("--fragment");
if (fragment) writeFileSync(fragment, page);
const out = arg("--out") ?? join(HERE, "upic-3d.html");
writeFileSync(out, `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}\n</body>\n</html>\n`);
console.log("wrote", out, fragment ? "and " + fragment : "");
