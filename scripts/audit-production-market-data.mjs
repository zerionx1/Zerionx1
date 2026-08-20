import fs from "node:fs";
import path from "node:path";

const roots = ["src/app", "src/components", "src/lib", "src/hooks", "src/workers"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const problems = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["__tests__", "fixtures", "test", "tests"].includes(entry.name)) return [];
      return walk(full);
    }
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

const files = roots.flatMap(walk);
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    const normalized = line.toLowerCase();
    if (
      /\bbinance\b/.test(normalized) &&
      !/removed|do not|not supported|legacy audit/.test(normalized)
    ) {
      problems.push(`${file}:${index + 1} Binance runtime/source reference`);
    }
    if (
      /math\.random\(\)/.test(line) &&
      /(price|candle|pnl|profit|loss|quote|market)/i.test(line)
    ) {
      problems.push(`${file}:${index + 1} random market/trading value`);
    }
    if (
      /(fake|synthetic|mock|sample|demo).*(price|candle|pnl|quote|analytics)/i.test(line) &&
      !/(no |not |without |avoid |never |does not)/i.test(line)
    ) {
      problems.push(`${file}:${index + 1} suspicious fabricated production data`);
    }
    if (
      /TradingViewAdvancedChart|tradingview-advanced-chart/.test(line) &&
      !file.endsWith("tradingview-advanced-chart.tsx")
    ) {
      problems.push(`${file}:${index + 1} active TradingView chart dependency`);
    }
  });
}

if (problems.length) {
  console.error("Production market-data audit FAILED:\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`Production market-data audit passed across ${files.length} active source files.`);
