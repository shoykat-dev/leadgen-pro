import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

console.log("=================================================");
console.log("▶ LeadGen Pro MASTER PROMPT v2 - Automated QA Check");
console.log("=================================================\n");

let checksFailed = 0;

function report(step, success, details = "") {
  if (success) {
    console.log(`[PASS] ${step}`);
  } else {
    console.error(`[FAIL] ${step}`);
    if (details) console.error(`       ${details}`);
    checksFailed++;
  }
}

// 1. .gitignore Check
try {
  const gitignore = fs.readFileSync(".gitignore", "utf8");
  const hasEnv = gitignore.includes(".env");
  const hasLocal = gitignore.includes(".env.local");
  const hasDb = gitignore.includes("*.sqlite") || gitignore.includes("*.db") || gitignore.includes("data/");

  report(".gitignore covers .env, .env.local, and local database files", hasEnv && hasLocal && hasDb);
} catch (e) {
  report(".gitignore check", false, e.message);
}

// 2. Secrets Scan: Fail if any Google API key pattern like "AIza" appears in src, .env.example
function scanDirectoryForSecrets(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== "node_modules" && f.name !== ".next" && f.name !== ".git") {
        scanDirectoryForSecrets(full);
      }
    } else if (f.isFile() && (f.name.endsWith(".ts") || f.name.endsWith(".tsx") || f.name.endsWith(".js") || f.name === ".env.example")) {
      const content = fs.readFileSync(full, "utf8");
      // Check for exposed Google API key pattern: AIza[0-9A-Za-z-_]{35}
      const match = content.match(/AIza[0-9A-Za-z\-_]{35}/);
      if (match) {
        throw new Error(`Exposed Google API key found in ${full}: ${match[0].slice(0, 8)}...`);
      }
    }
  }
}

try {
  scanDirectoryForSecrets("src");
  const envExample = fs.readFileSync(".env.example", "utf8");
  if (/AIza[0-9A-Za-z\-_]{35}/.test(envExample)) {
    throw new Error("Exposed key in .env.example");
  }
  report("Secrets scan: No Google API keys (AIza...) exposed in src or .env.example", true);
} catch (e) {
  report("Secrets scan", false, e.message);
}

// 3. No-Fake-Data Scan (Section 2 item 33)
// Scans src (outside test fixtures) for fake patterns: 1712-345678, 1713-000000, info@<business>.com, INITIAL_LEADS
function scanForFakeData(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== "node_modules" && f.name !== ".next" && f.name !== "tests") {
        scanForFakeData(full);
      }
    } else if (f.isFile() && (f.name.endsWith(".ts") || f.name.endsWith(".tsx"))) {
      const content = fs.readFileSync(full, "utf8");

      if (!full.includes("data-integrity.ts") && (content.includes("1712-345678") || content.includes("1912-345678") || content.includes("1713-000000"))) {
        throw new Error(`Hardcoded dummy phone pattern found in ${full}`);
      }
      if (content.includes("INITIAL_LEADS") && !full.includes("qa-check")) {
        throw new Error(`Hardcoded INITIAL_LEADS dummy array found in ${full}`);
      }
      if (content.includes("generateWorldwideLeads") && !full.includes("qa-check")) {
        throw new Error(`Synthetic generateWorldwideLeads generator found in ${full}`);
      }
    }
  }
}

try {
  scanForFakeData("src");
  report("No-Fake-Data Scan: Zero synthetic data generators or hardcoded mock leads in src", true);
} catch (e) {
  report("No-Fake-Data Scan", false, e.message);
}

// 4. Run Unit Tests
try {
  execSync("node --experimental-strip-types tests/data-integrity.test.mjs", {
    stdio: "inherit",
  });
  report("Unit Tests: All 20 data integrity & system logic tests passed", true);
} catch (e) {
  report("Unit Tests", false, e.message);
}

console.log("\n=================================================");
if (checksFailed === 0) {
  console.log("✔ QA RESULT: ALL CHECKS PASSED SUCCESSFULLY!");
} else {
  console.error(`✖ QA RESULT: ${checksFailed} CHECKS FAILED!`);
  process.exit(1);
}
console.log("=================================================\n");
