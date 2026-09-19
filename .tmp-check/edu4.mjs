import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("https://job-boards.greenhouse.io/embed/job_app?for=zenoti&token=7825552003", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(4000);
const info = await p.evaluate(() => {
  const h = [...document.querySelectorAll("h2,h3,legend,div,span")].find(e => e.children.length === 0 && /^education$/i.test((e.textContent||"").trim()));
  const sec = h?.closest("fieldset, section, div[class*=education], div") ; let node = h?.parentElement; 
  while (node && node.querySelectorAll("input").length < 4) node = node.parentElement;
  const els = [...(node||document).querySelectorAll("input,select,button,a")].slice(0, 30);
  return { header: h?.outerHTML.slice(0,200), fields: els.map(e => ({ tag: e.tagName, id: e.id, name: e.getAttribute("name"), role: e.getAttribute("role"), type: e.getAttribute("type"), text: (e.textContent||"").trim().slice(0,40), label: e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim().slice(0,40) : undefined })) };
});
console.log(JSON.stringify(info.header)); for (const f of info.fields) console.log(JSON.stringify(f));
// open the School combobox, type, and list options; open Degree and Discipline and End month and list options
const openList = async (sel, typed) => { const el = p.locator(sel).first(); await el.click(); if (typed) await el.pressSequentially(typed, { delay: 30 }); await p.waitForTimeout(1500); const t = await p.getByRole("option").allInnerTexts(); await p.keyboard.press("Escape"); return t.slice(0, 15); };
const ids = info.fields.filter(f => f.role === "combobox").map(f => "#" + f.id);
console.log("comboboxes:", ids);
for (const id of ids) { try { console.log(id, "options:", await openList(id, /school/i.test(id) ? "Indian Institute of Technology Madras" : "")); } catch (e) { console.log(id, "ERR", e.message.split("\n")[0]); } }
await b.close();
