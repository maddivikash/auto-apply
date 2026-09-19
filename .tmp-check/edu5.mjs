import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1380, height: 940 } });
const dump = async (tag) => {
  const info = await p.evaluate(() => {
    const hit = [...document.querySelectorAll("*")].filter(e => e.children.length === 0 && /^education/i.test((e.textContent||"").trim()));
    const out = [];
    for (const h of hit) {
      let node = h.parentElement; while (node && node.querySelectorAll("input,select").length < 3 && node !== document.body) node = node.parentElement;
      out.push({ heading: (h.textContent||"").trim(), tag: h.tagName, fields: [...node.querySelectorAll("input,select,a,button")].map(e => ({ tag: e.tagName, id: e.id, name: e.getAttribute("name"), role: e.getAttribute("role"), type: e.getAttribute("type"), text: (e.textContent||"").trim().slice(0,30), label: e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim().slice(0,40) : undefined })).slice(0, 20) });
    }
    return out;
  });
  console.log("=====", tag, info.length ? "" : "no Education heading"); for (const i of info) { console.log("heading:", i.heading, i.tag); for (const f of i.fields) console.log("  ", JSON.stringify(f)); }
};
for (const [name, url] of [["glean-embed","https://job-boards.greenhouse.io/embed/job_app?for=gleanwork&token=4712442005"],["zenoti-page","https://job-boards.greenhouse.io/zenoti/jobs/7825552003"]]) {
  await p.goto(url, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3500);
  await p.mouse.wheel(0, 5000); await p.waitForTimeout(1000);
  await dump(name + " before resume");
  const fi = p.locator("input#resume, input[type=file]").first();
  if (await fi.count()) { await fi.setInputFiles("/private/tmp/claude-501/-Users-vikashmaddi-Projects/212ce788-2c64-4a25-aaa4-ab172acd164d/scratchpad/together.pdf"); await p.waitForTimeout(7000); await dump(name + " after resume"); }
}
await b.close();
