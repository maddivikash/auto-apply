// Shared detector: every control near a label that smells like education, no assumptions about ids or headings.
export const DETECT = () => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").replace(/[*✱]/g, "").trim();
  const labelFor = (el) => {
    let t = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : "";
    if (!t) t = el.closest("label")?.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
    if (!t) { const w = el.closest("div, li, fieldset"); t = w?.querySelector("label, legend, [class*=label]")?.textContent || ""; }
    return clean(t);
  };
  const re = /school|university|college|institution|degree|discipline|major|field of study|education|gpa|graduat|start (date )?(month|year)|end (date )?(month|year)/i;
  const out = [];
  document.querySelectorAll("input, select, textarea, [role=combobox]").forEach((el) => {
    if (["hidden", "submit", "button", "file"].includes(el.type)) return;
    const label = labelFor(el);
    const idn = (el.id || "") + " " + (el.getAttribute("name") || "");
    if (!re.test(label) && !re.test(idn)) return;
    if (/how did you hear|referral|linkedin|website|phone|email/i.test(label)) return;
    out.push({ label, id: el.id, name: el.getAttribute("name"), tag: el.tagName, type: el.getAttribute("type"), role: el.getAttribute("role"), required: el.required || el.getAttribute("aria-required") === "true" || /\*/.test(document.querySelector(`label[for="${el.id}"]`)?.textContent || "") });
  });
  const addAnother = [...document.querySelectorAll("a, button")].filter((e) => /add another|add education|add school/i.test(e.textContent || "")).map((e) => clean(e.textContent));
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,legend,label,div,span,p")].filter((e) => e.children.length <= 1 && /^education\b/i.test(clean(e.textContent))).map((e) => e.tagName + ":" + clean(e.textContent).slice(0, 30));
  return { fields: out, addAnother, headings };
};
