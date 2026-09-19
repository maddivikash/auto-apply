import { chromium } from "playwright";
const urls = {
  togetherai: "https://job-boards.greenhouse.io/embed/job_app?for=togetherai&token=5217063007",
  gleanwork: "https://job-boards.greenhouse.io/embed/job_app?for=gleanwork&token=4712442005",
  pubmatic: "https://job-boards.greenhouse.io/embed/job_app?for=pubmatic&token=5369682008",
  zenoti: "https://job-boards.greenhouse.io/embed/job_app?for=zenoti&token=7825552003",
  truveta: "https://job-boards.greenhouse.io/embed/job_app?for=truveta&token=6015981004",
  cloudflare: "https://job-boards.greenhouse.io/embed/job_app?for=cloudflare&token=7831810",
};
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, url] of Object.entries(urls)) {
  await p.goto(url, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const sec = document.querySelector("#education_section, [id*=education], fieldset:has(legend:is(:contains('Education')))") || [...document.querySelectorAll("h2,h3,legend,label")].find(e => /education/i.test(e.textContent||""))?.closest("div,section,fieldset");
    if (!sec) return null;
    const fields = [...sec.querySelectorAll("input,select,button")].map(e => ({ tag: e.tagName, id: e.id, name: e.getAttribute("name"), type: e.getAttribute("type"), role: e.getAttribute("role"), label: (e.id && document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim()) || e.textContent?.trim().slice(0,40), ph: e.getAttribute("placeholder") }));
    return { outer: sec.outerHTML.slice(0, 1500), fields };
  });
  console.log("=====", name, info ? "" : "NO EDUCATION SECTION");
  if (info) { console.log(JSON.stringify(info.fields, null, 0)); console.log(info.outer.slice(0, 1200)); }
}
await b.close();
