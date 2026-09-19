import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1380, height: 940 } });
await p.goto("https://job-boards.greenhouse.io/embed/job_app?for=pubmatic&token=5369682008", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3500);
const opts = async (sel, typed) => { const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await el.click(); if (typed) await el.pressSequentially(typed, { delay: 25 }); await p.waitForTimeout(1500); const t = await p.getByRole("option").allInnerTexts(); await p.keyboard.press("Escape"); await p.waitForTimeout(200); return t; };
console.log("SCHOOL typed 'Indian Institute of Technology Madras':", (await opts("#school--0", "Indian Institute of Technology Madras")).slice(0, 8));
console.log("SCHOOL typed 'IIT Madras':", (await opts("#school--0", "IIT Madras")).slice(0, 8));
console.log("SCHOOL typed 'zzqx no such':", (await opts("#school--0", "zzqx no such")).slice(0, 8));
console.log("DEGREE all:", await opts("#degree--0", ""));
console.log("DISCIPLINE typed 'Mechanical':", (await opts("#discipline--0", "Mechanical")).slice(0, 10));
console.log("DISCIPLINE all count:", (await opts("#discipline--0", "")).length);
console.log("END MONTH all:", await opts("#end-month--0", ""));
// year inputs
console.log("start-year attrs:", await p.locator("#start-year--0").evaluate(e => ({ type: e.type, min: e.min, max: e.max, ph: e.placeholder })));
// Add another
await p.getByText("Add another", { exact: false }).first().click(); await p.waitForTimeout(800);
console.log("after Add another, ids:", await p.evaluate(() => [...document.querySelectorAll("input")].map(i => i.id).filter(i => /school|degree|discipline|year|month/.test(i))));
await b.close();
