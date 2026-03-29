const fs = require("fs");
const path = require("path");
let axios = null;
try {
  axios = require("axios");
} catch (_error) {
  axios = null;
}

const mode = (process.argv[2] || "").toLowerCase();
const BACKEND_URL = "http://localhost:3001";

const REAL_IPS = [
  ...Array.from({ length: 20 }, (_, i) => `74.125.224.${i + 1}`),
  ...Array.from({ length: 20 }, (_, i) => `74.125.225.${i + 1}`),
  ...Array.from({ length: 20 }, (_, i) => `98.207.45.${i + 1}`),
  ...Array.from({ length: 11 * 5 }, (_, i) => {
    const x = 100 + Math.floor(i / 5);
    const y = (i % 5) + 1;
    return `172.56.${x}.${y}`;
  }),
];

const BOT_IPS = ["45.33.32.156", "198.20.69.74", "209.95.50.167", "104.131.0.69"];

const REAL_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Version/17.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120.0.2210.91",
  "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.6099.193 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 Chrome/118.0.0.0 Safari/537.36",
];

const BOT_USER_AGENT =
  "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)";

const GEO_REGIONS_TX = ["TX"];
const GEO_REGIONS_RANDOM = ["CA", "NY", "FL", "IL", "WA", "OH", "GA", "AZ"];

const REAL_VENDOR = {
  vendor_id: "VND-002",
  vendor_name: "AutoAudience Network",
  campaign_id: "CAM-AUTO-TX-002",
};

const BOT_VENDOR = {
  vendor_id: "VND-021",
  vendor_name: "PhantomReach Media",
  campaign_id: "CAM-AUTO-TX-007",
};

const finalTotals = {
  totalFired: 0,
  realFired: 0,
  botFired: 0,
  realGeoMatch: 0,
  botGeoMatch: 0,
};

let counters = createFreshCounters();
const activeTimers = new Set();
let shutdownRequested = false;
let botIpIndex = 0;

function createFreshCounters() {
  return {
    totalFired: 0,
    realFired: 0,
    botFired: 0,
    realUniqueIPs: new Set(),
    botUniqueIPs: new Set(),
    realGeoMatch: 0,
    botGeoMatch: 0,
    startTime: Date.now(),
  };
}

function randomFrom(array) {
  return array[randomInt(0, array.length - 1)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay(min, max) {
  return new Promise((resolve) => {
    const delayMs = randomInt(min, max);
    const timer = setTimeout(() => {
      activeTimers.delete(timer);
      resolve();
    }, delayMs);
    activeTimers.add(timer);
  });
}

function nowTime() {
  return new Date().toLocaleTimeString();
}

function printVendorsCsvMatch() {
  try {
    const vendorsPath = path.join(__dirname, "backend", "data", "vendors.csv");
    const content = fs.readFileSync(vendorsPath, "utf8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    const header = lines[0];
    const matched = lines.filter(
      (line) =>
        line.includes("AutoAudience Network") || line.includes("PhantomReach Media"),
    );
    console.log("vendors.csv (matched rows):");
    console.log(header);
    matched.forEach((line) => console.log(line));
  } catch (error) {
    console.log("Could not read vendors.csv from backend/data/vendors.csv");
  }
}

async function fireClick(vendor, ip, userAgent, geoRegion, clickType, sessionId) {
  const payload = {
    vendor_id: vendor.vendor_id,
    vendor_name: vendor.vendor_name,
    campaign_id: vendor.campaign_id,
    ip_address: ip,
    user_agent: userAgent,
    geo_region: geoRegion,
    click_type: clickType,
    timestamp: Date.now(),
    session_id: sessionId,
  };
  try {
    if (axios) {
      await axios.post(`${BACKEND_URL}/api/redirect/click`, payload);
    } else {
      const response = await fetch(`${BACKEND_URL}/api/redirect/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${await response.text()}`);
      }
    }
    return true;
  } catch (error) {
    const errMsg =
      error && error.response
        ? `${error.response.status} ${JSON.stringify(error.response.data)}`
        : error.message;
    console.error(`[${nowTime()}] Request failed: ${errMsg}`);
    return false;
  }
}

function updateCounters(clickType, ip, geo) {
  counters.totalFired += 1;
  finalTotals.totalFired += 1;

  if (clickType === "real") {
    counters.realFired += 1;
    counters.realUniqueIPs.add(ip);
    finalTotals.realFired += 1;
    if (geo === "TX") {
      counters.realGeoMatch += 1;
      finalTotals.realGeoMatch += 1;
    }
  } else if (clickType === "bot") {
    counters.botFired += 1;
    counters.botUniqueIPs.add(ip);
    finalTotals.botFired += 1;
    if (geo !== "TX") {
      counters.botGeoMatch += 1;
      finalTotals.botGeoMatch += 1;
    }
  }
}

function geoPercent(matches, total) {
  if (!total) return "0.0";
  return ((matches / total) * 100).toFixed(1);
}

function printSummary() {
  const realGeoPct = geoPercent(counters.realGeoMatch, counters.realFired);
  const botGeoPct = geoPercent(counters.botGeoMatch, counters.botFired);

  console.log("╔══════════════════════════════════════════╗");
  console.log("║     TRAFFIC SUMMARY — last 15 seconds    ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log("║ REAL  (AutoAudience Network)             ║");
  console.log(
    `║   Clicks: ${String(counters.realFired).padEnd(4)} | Unique IPs: ${String(counters.realUniqueIPs.size).padEnd(4)}║`,
  );
  console.log(`║   Geo match: ${realGeoPct.padEnd(5)}%                      ║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log("║ BOT   (PhantomReach Media)               ║");
  console.log(
    `║   Clicks: ${String(counters.botFired).padEnd(4)} | Unique IPs: ${String(counters.botUniqueIPs.size).padEnd(4)}║`,
  );
  console.log(`║   Geo match: ${botGeoPct.padEnd(5)}%                      ║`);
  console.log("╚══════════════════════════════════════════╝");

  counters = createFreshCounters();
}

function printFinalTotals() {
  console.log("\nFinal totals:");
  console.log(`Total clicks fired: ${finalTotals.totalFired}`);
  console.log(`Real clicks fired:  ${finalTotals.realFired}`);
  console.log(`Bot clicks fired:   ${finalTotals.botFired}`);
  console.log(`Real geo match TX:  ${geoPercent(finalTotals.realGeoMatch, finalTotals.realFired)}%`);
  console.log(`Bot geo mismatch:   ${geoPercent(finalTotals.botGeoMatch, finalTotals.botFired)}%`);
}

function clearAllTimers() {
  for (const timer of activeTimers) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  activeTimers.clear();
}

async function startRealLoop() {
  const run = async () => {
    if (shutdownRequested) return;
    const ip = randomFrom(REAL_IPS);
    const userAgent = randomFrom(REAL_USER_AGENTS);
    const geo = Math.random() < 0.88 ? GEO_REGIONS_TX[0] : randomFrom(GEO_REGIONS_RANDOM);
    const ok = await fireClick(
      REAL_VENDOR,
      ip,
      userAgent,
      geo,
      "real",
      `real-${Date.now()}-${randomInt(1000, 9999)}`,
    );
    if (ok) {
      updateCounters("real", ip, geo);
      console.log(
        `[${nowTime()}] ✅ REAL -> AutoAudience Network | IP: ${ip} | geo: ${geo} | total: ${finalTotals.totalFired}`,
      );
    }
    const waitMs = randomInt(2000, 5000);
    const timer = setTimeout(() => {
      activeTimers.delete(timer);
      run().catch((error) => console.error("Real loop error:", error.message));
    }, waitMs);
    activeTimers.add(timer);
  };
  await run();
}

function startBotLoop(autoStopMs) {
  const interval = setInterval(async () => {
    if (shutdownRequested) return;
    const ip = BOT_IPS[botIpIndex % BOT_IPS.length];
    botIpIndex += 1;
    const geo = randomFrom(GEO_REGIONS_RANDOM);
    const ok = await fireClick(
      BOT_VENDOR,
      ip,
      BOT_USER_AGENT,
      geo,
      "bot",
      `bot-${Date.now()}-${randomInt(1000, 9999)}`,
    );
    if (ok) {
      updateCounters("bot", ip, geo);
      console.log(
        `[${nowTime()}] 🤖 BOT  -> PhantomReach Media | IP: ${ip} | geo: ${geo} | total: ${finalTotals.totalFired}`,
      );
    }
  }, 120);
  activeTimers.add(interval);

  if (typeof autoStopMs === "number" && autoStopMs > 0) {
    const stopTimer = setTimeout(() => {
      console.log(`[${nowTime()}] Bot mode reached ${autoStopMs / 1000}s. Stopping...`);
      shutdown("Bot auto-stop completed");
    }, autoStopMs);
    activeTimers.add(stopTimer);
  }
}

function shutdown(reason) {
  if (shutdownRequested) return;
  shutdownRequested = true;
  clearAllTimers();
  printSummary();
  printFinalTotals();
  if (reason) {
    console.log(reason);
  }
  process.exit(0);
}

function validateMode() {
  return mode === "real" || mode === "bot" || mode === "contrast";
}

async function main() {
  if (!validateMode()) {
    console.error("Usage: node simulate_clicks.js [real|bot|contrast]");
    process.exit(1);
  }

  printVendorsCsvMatch();
  console.log("============================================");
  console.log("Traffic Intelligence Framework");
  console.log(`Click Simulator — mode: ${mode}`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log("Press Ctrl+C to stop");
  console.log("============================================");

  process.on("SIGINT", () => {
    console.log("\nSIGINT received. Shutting down cleanly...");
    shutdown();
  });

  await randomDelay(1000, 1000);

  const summaryInterval = setInterval(printSummary, 15_000);
  activeTimers.add(summaryInterval);

  if (mode === "real") {
    await startRealLoop();
    return;
  }

  if (mode === "bot") {
    startBotLoop(120_000);
    return;
  }

  await startRealLoop();
  startBotLoop();
}

main().catch((error) => {
  console.error("Simulator crashed:", error.message);
  process.exit(1);
});
