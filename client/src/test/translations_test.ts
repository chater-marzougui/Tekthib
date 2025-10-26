import * as fs from "node:fs";
import * as path from "node:path";

interface TranslationObject {
  [key: string]: any;
}

interface FileContent {
  fileName: string;
  content: TranslationObject;
}

interface DuplicateKey {
  key: string;
  files: string[];
}

interface MissingKey {
  key: string;
  path: string;
  missingIn: string[];
}

interface UntranslatedKey {
  key: string;
  usedIn: string[];
}

const LOCALES_DIR = "./src/locales";
const SRC_DIR = "./src";
const LANGUAGES = ["en", "ar", "fr"];

// Read all JSON files from a language directory
function readLanguageFiles(lang: string): FileContent[] {
  const langDir = path.join(LOCALES_DIR, lang);
  const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".json") && !f.includes('bot'));

  return files.map((fileName) => ({
    fileName,
    content: JSON.parse(fs.readFileSync(path.join(langDir, fileName), "utf-8")),
  }));
}

// Flatten nested object to dot notation paths
function flattenObject(
  obj: TranslationObject,
  prefix = ""
): { [key: string]: any } {
  const flattened: { [key: string]: any } = {};

  for (const key in obj) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      Object.assign(flattened, flattenObject(obj[key], fullPath));
    } else {
      flattened[fullPath] = obj[key];
    }
  }

  return flattened;
}

// Check for duplicate top-level keys within a language
function findDuplicateKeys(files: FileContent[]): DuplicateKey[] {
  const keyMap: { [key: string]: string[] } = {};

  for (const file of files) {
    const topLevelKeys = Object.keys(file.content);
    for (const key of topLevelKeys) {
      if (!keyMap[key]) {
        keyMap[key] = [];
      }
      keyMap[key].push(file.fileName);
    }
  }

  return Object.entries(keyMap)
    .filter(([_, files]) => files.length > 1)
    .map(([key, files]) => ({ key, files }));
}

// Get all flattened keys from all files in a language
function getAllKeysForLanguage(lang: string): Map<string, string> {
  const files = readLanguageFiles(lang);
  const allKeys = new Map<string, string>();

  for (const file of files) {
    const flattened = flattenObject(file.content);
    for (const key of Object.keys(flattened)) {
      allKeys.set(key, file.fileName);
    }
  }

  return allKeys;
}

// Compare keys between languages
function findMissingKeys(
  referenceLang: string,
  compareLangs: string[]
): MissingKey[] {
  const referenceKeys = getAllKeysForLanguage(referenceLang);
  const missingKeys: MissingKey[] = [];

  for (const keyPath of referenceKeys.keys()) {
    const missingIn: string[] = [];

    for (const lang of compareLangs) {
      const langKeys = getAllKeysForLanguage(lang);
      if (!langKeys.has(keyPath)) {
        missingIn.push(lang);
      }
    }

    if (missingIn.length > 0) {
      missingKeys.push({
        key: keyPath.split(".")[0], // top-level key
        path: keyPath,
        missingIn,
      });
    }
  }

  return missingKeys;
}

function findTsxFiles(dir: string): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (!["node_modules", "dist", "build", ".git"].includes(item.name)) {
        files.push(...findTsxFiles(fullPath));
      }
    } else if (
      item.isFile() &&
      (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractTranslationKeys(filePath: string): Set<string> {
    const content = fs.readFileSync(filePath, "utf-8");
    const keys = new Set<string>();

    // Match t('key') or t("key") patterns
    // Also handles t(`key`) and more complex patterns
    // Use negative lookbehind to exclude cases like: ut(, at(, etc.
    const patterns = [
        /(?<![a-zA-Z])t\(['"]([^'"]+)['"]\)/g, // t('key') or t("key")
        /(?<![a-zA-Z])t\(`([^`]+)`\)/g, // t(`key`)
        /(?<![a-zA-Z])t\(['"]([^'"]+)['"],/g, // t('key', ...) with additional params
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const key = match[1];
            // Skip keys with interpolation variables like ${var}
            if (!key.includes("${")) {
                keys.add(key);
            }
        }
    }

    return keys;
}


function findUsedTranslationKeys(): Map<string, string[]> {
  const usedKeys = new Map<string, string[]>();
  const tsxFiles = findTsxFiles(SRC_DIR);

  console.log(`📂 Found ${tsxFiles.length} TypeScript/TSX files\n`);

  for (const filePath of tsxFiles) {
    const keys = extractTranslationKeys(filePath);
    const relativePath = path.relative(process.cwd(), filePath);

    for (const key of keys) {
      if (!usedKeys.has(key)) {
        usedKeys.set(key, []);
      }
      usedKeys.get(key)!.push(relativePath);
    }
  }

  return usedKeys;
}

function findUntranslatedKeys(
  usedKeys: Map<string, string[]>
): UntranslatedKey[] {
  const untranslated: UntranslatedKey[] = [];

  // Get all available keys from all languages
  const allAvailableKeys = new Set<string>();
  for (const lang of LANGUAGES) {
    const langKeys = getAllKeysForLanguage(lang);
    for (const key of langKeys.keys()) {
      allAvailableKeys.add(key);
    }
  }

  for (const [key, files] of usedKeys) {
    if (!allAvailableKeys.has(key)) {
      untranslated.push({
        key,
        usedIn: files,
      });
    }
  }

  return untranslated;
}

function findUnusedKeys(usedKeys: Map<string, string[]>): string[] {
  const unused: string[] = [];

  // Get all available keys from English (as reference)
  const allAvailableKeys = getAllKeysForLanguage("en");

  for (const [key] of allAvailableKeys) {
    if (!usedKeys.has(key)) {
      unused.push(key);
    }
  }

  return unused;
}

// Main analysis function
function analyzeTranslations() {
  console.log("🔍 Analyzing i18n JSON files...\n");
  console.log("=".repeat(80));

  // 1. Check for duplicate keys in each language
  console.log("\n📋 CHECKING FOR DUPLICATE TOP-LEVEL KEYS\n");

  for (const lang of LANGUAGES) {
    const files = readLanguageFiles(lang);
    const duplicates = findDuplicateKeys(files);

    if (duplicates.length > 0) {
      console.log(
        `❌ ${lang.toUpperCase()}: Found ${duplicates.length} duplicate(s):`
      );
      for (const dup of duplicates) {
        console.log(`   • "${dup.key}" appears in: ${dup.files.join(", ")}`);
      }
    } else {
      console.log(`✅ ${lang.toUpperCase()}: No duplicates found`);
    }
  }

  // 2. Check for missing keys (EN as reference)
  console.log("\n" + "=".repeat(80));
  console.log("\n🔍 CHECKING MISSING KEYS (English as reference)\n");

  const missingFromEN = findMissingKeys("en", ["fr", "ar"]);
  if (missingFromEN.length > 0) {
    console.log(
      `❌ Found ${missingFromEN.length} key(s) in English that are missing in other languages:\n`
    );

    const grouped = missingFromEN.reduce(
      (acc, item) => {
        if (!acc[item.key]) acc[item.key] = [];
        acc[item.key].push(item);
        return acc;
      },
      {} as { [key: string]: MissingKey[] }
    );

    for (const [topKey, items] of Object.entries(grouped)) {
      console.log(`   📦 "${topKey}":`);
      for (const item of items) {
        console.log(
          `      • ${item.path} → Missing in: ${item.missingIn.join(", ")}`
        );
      }
    }
  } else {
    console.log("✅ All English keys exist in French and Arabic");
  }

  // 3. Check for missing keys (AR as reference)
  console.log("\n" + "=".repeat(80));
  console.log("\n🔍 CHECKING MISSING KEYS (Arabic as reference)\n");

  const missingFromAR = findMissingKeys("ar", ["en", "fr"]);
  if (missingFromAR.length > 0) {
    console.log(
      `❌ Found ${missingFromAR.length} key(s) in Arabic that are missing in other languages:\n`
    );

    const grouped = missingFromAR.reduce(
      (acc, item) => {
        if (!acc[item.key]) acc[item.key] = [];
        acc[item.key].push(item);
        return acc;
      },
      {} as { [key: string]: MissingKey[] }
    );

    for (const [topKey, items] of Object.entries(grouped)) {
      console.log(`   📦 "${topKey}":`);
      for (const item of items) {
        console.log(
          `      • ${item.path} → Missing in: ${item.missingIn.join(", ")}`
        );
      }
    }
  } else {
    console.log("✅ All Arabic keys exist in English and French");
  }

  // 4. Check for untranslated keys used in code
  // 4. Check for untranslated keys used in code
  console.log("\n" + "=".repeat(80));
  console.log("\n🔍 CHECKING FOR UNTRANSLATED KEYS IN CODE\n");

  const usedKeys = findUsedTranslationKeys();
  console.log(
    `📊 Found ${usedKeys.size} unique translation keys used in code\n`
  );

  const untranslated = findUntranslatedKeys(usedKeys);
  if (untranslated.length > 0) {
    console.log(
      `❌ Found ${untranslated.length} key(s) used in code but NOT translated:\n`
    );
    for (const item of untranslated) {
      console.log(`   🔴 "${item.key}"`);
      console.log(`      Used in:`);
      for (const file of item.usedIn) {
        console.log(`         - ${file}`);
      }
      console.log("");
    }
  } else {
    console.log("✅ All keys used in code have translations!");
  }

  // 5. Check for unused translation keys
  console.log("\n" + "=".repeat(80));
  console.log("\n🔍 CHECKING FOR UNUSED TRANSLATION KEYS\n");

  const unused = findUnusedKeys(usedKeys);
  if (unused.length > 0) {
    console.log(
      `⚠️  Found ${unused.length} translation key(s) that are defined but never used:\n`
    );
    console.log("This is not a dangerous issue, but consider cleaning them up:");
    for (const key of unused.slice(0, 20)) {
      console.log(`   • ${key}`);
    }
    if (unused.length > 20) {
      console.log(`   ... and ${unused.length - 20} more`);
    }
  } else {
    console.log("✅ All translation keys are being used!");
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n✨ Analysis complete!\n");
}

// Run the analysis
try {
  analyzeTranslations();
} catch (error) {
  console.error("❌ Error during analysis:", error);
  process.exit(1);
}
