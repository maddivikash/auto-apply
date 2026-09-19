import { chromium } from "playwright";
const urls = {
  spector_ashby: "https://jobs.ashbyhq.com/spector-ai/68127883-4e2f-432b-95b2-e90335200b7c/application",
  cartesia_ashby: "https://jobs.ashbyhq.com/cartesia/9d9c6cc0-218c-4fd4-a478-3e4b37de1d76/application",
  wisdom_ashby: "https://jobs.ashbyhq.com/Wisdom-AI/9dc24174-86ef-496d-9957-6012e6e49097/application",
  cyara_lever: "https://jobs.lever.co/cyara/214d9b16-6de8-42f5-bf9c-8d8596659a11/apply",
};
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, url] of Object.entries(urls)) {
  await p.goto(url, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(4000);
  const info = await p.evaluate(() => {
    const els = [...document.querySelectorAll("input,select,textarea,button,h2,h3,h4,legend,label,[role=combobox]")].filter(e => /school|degree|discipline|education|university|college|gpa|graduat|major|field of study/i.test((e.id||"")+" "+(e.getAttribute("name")||"")+" "+(e.getAttribute("placeholder")||"")+" "+(e.textContent||"").slice(0,80)));
    return els.map(e => ({ tag: e.tagName, id: e.id, name: e.getAttribute("name"), role: e.getAttribute("role"), type: e.getAttribute("type"), ph: e.getAttribute("placeholder"), text: (e.textContent||"").trim().slice(0,70), label: e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim().slice(0,60) : undefined }));
  });
  console.log("=====", name, info.length ? "" : "no education-like fields");
  for (const f of info.slice(0, 25)) console.log(JSON.stringify(f));
}
await b.close();
