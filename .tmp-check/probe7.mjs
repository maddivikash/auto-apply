import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { DETECT } from "./detect.mjs";
const apps = JSON.parse(readFileSync(".tmp-check/filled.json", "utf8"));
const b = await chromium.launch(); 
for (const a of apps) {
  const p = await b.newPage({ viewport: { width: 1380, height: 940 } });
  try {
    await p.goto(a.applyUrl, { waitUntil: "domcontentloaded", timeout: 45000 }); await p.waitForTimeout(4000);
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 1500); await p.waitForTimeout(300); }
    const r = await p.evaluate(DETECT);
    console.log(`===== ${a.company} (${a.board}) headings=${JSON.stringify(r.headings)} addAnother=${JSON.stringify(r.addAnother)} fields=${r.fields.length}`);
    for (const f of r.fields) console.log("   ", JSON.stringify(f));
  } catch (e) { console.log(`===== ${a.company}: ERR ${e.message.split("\n")[0]}`); }
  await p.close();
}
await b.close();
