import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ts from "typescript";

const sourceRoot = path.resolve("src");
const outputPath = path.join(sourceRoot, "generated", "siteCopy.ts");
const separator = "<<<LCSEP>>>";
const execFileAsync = promisify(execFile);

async function listSourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  }));
  return files.flat();
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function collectChineseCopy(file, content, output) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, kind);
  const visit = (node) => {
    if (
      ts.isStringLiteral(node)
      || ts.isNoSubstitutionTemplateLiteral(node)
      || ts.isJsxText(node)
      || ts.isTemplateHead(node)
      || ts.isTemplateMiddle(node)
      || ts.isTemplateTail(node)
    ) {
      const value = normalize(node.text);
      if (/[\u3400-\u9fff]/u.test(value) && value.length > 1) {
        if (/[<>]/.test(value)) {
          for (const match of value.matchAll(/>([^<>]*[\u3400-\u9fff][^<>]*)</gu)) {
            const text = normalize(match[1]);
            if (text.length > 1) output.add(text);
          }
          for (const match of value.matchAll(/(?:alt|title)="([^"]*[\u3400-\u9fff][^"]*)"/gu)) {
            const text = normalize(match[1]);
            if (text.length > 1) output.add(text);
          }
        } else {
          output.add(value);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

function createBatches(values, maxLength = 1200) {
  const batches = [];
  let current = [];
  let length = 0;
  for (const value of values) {
    const nextLength = length + value.length + separator.length + 2;
    if (current.length && nextLength > maxLength) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(value);
    length += value.length + separator.length + 2;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateBatch(values, target) {
  let payload;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const { stdout } = await execFileAsync("curl", [
      "-sS",
      "--retry", "5",
      "--retry-all-errors",
      "--retry-delay", "1",
      "--connect-timeout", "20",
      "--get", "https://translate.googleapis.com/translate_a/single",
      "--data-urlencode", "client=gtx",
      "--data-urlencode", "sl=zh-CN",
      "--data-urlencode", `tl=${target}`,
      "--data-urlencode", "dt=t",
      "--data-urlencode", `q=${values.join(`\n${separator}\n`)}`,
    ], { maxBuffer: 8 * 1024 * 1024 });
    try {
      payload = JSON.parse(stdout);
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  const translated = payload[0].map((part) => part[0]).join("");
  const results = translated.split(separator).map((value) => normalize(value));
  if (results.length !== values.length) throw new Error(`Translation batch mismatch: ${values.length} / ${results.length}`);
  return results;
}

async function translateAll(values, target) {
  const batches = createBatches(values);
  const output = [];
  for (let index = 0; index < batches.length; index += 1) {
    output.push(...await translateBatch(batches[index], target));
    process.stdout.write(`${target}: ${index + 1}/${batches.length}\n`);
  }
  return output;
}

const files = (await listSourceFiles(sourceRoot)).filter((file) => !file.endsWith("i18n.tsx") && !file.includes(`${path.sep}generated${path.sep}`));
const sources = new Set();
for (const file of files) collectChineseCopy(file, await fs.readFile(file, "utf8"), sources);
const values = [...sources].sort((a, b) => b.length - a.length || a.localeCompare(b, "zh-CN"));
const english = await translateAll(values, "en");
const japanese = await translateAll(values, "ja");
const records = values.map((source, index) => [source, { en: english[index], ja: japanese[index] }]);
const fileContent = `// Generated from user-visible source copy. Explicit entries in i18n.tsx take priority.\nexport const generatedSiteCopy: Record<string, { ja: string; en: string }> = ${JSON.stringify(Object.fromEntries(records), null, 2)};\n`;
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, fileContent);
process.stdout.write(`Generated ${records.length} translations at ${outputPath}\n`);
