import { chromium } from "playwright";
const urls = {
  databricks: "https://job-boards.greenhouse.io/embed/job_app?for=databricks&token=8632126002",
  cloudflare8168623: "https://job-boards.greenhouse.io/embed/job_app?for=cloudflare&token=8168623",
  mongodb: "https://job-boards.greenhouse.io/embed/job_app?for=mongodb&token=8106099",
  truveta: "https://job-boards.greenhouse.io/embed/job_app?for=truveta&token=6015981004",
};
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, url] of Object.entries(urls)) {
  await p.goto(url, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3000);
  const info = await p.evaluate(() => {
    const els = [...document.querySelectorAll("input,select,button,h2,h3,legend,label")].filter(e => /school|degree|discipline|education|start|end|gpa|graduat/i.test((e.id||"")+" "+(e.getAttribute("name")||"")+" "+(e.textContent||"").slice(0,60)));
    return els.map(e => ({ tag: e.tagName, id: e.id, name: e.getAttribute("name"), role: e.getAttribute("role"), type: e.getAttribute("type"), text: (e.textContent||"").trim().slice(0,60), label: e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim().slice(0,50) : undefined }));
  });
  console.log("=====", name, info.length ? "" : "no education-like fields");
  for (const f of info) console.log(JSON.stringify(f));
}
await b.close();
