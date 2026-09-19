/**
 * Reads the fields of a live application form (Lever, Ashby) the way a person sees them.
 * Runs inside the page via Playwright's page.evaluate, so it must not close over anything.
 * Radio and checkbox groups are reported once, as the question with its options, instead of
 * once per option, so the answer rules see "How did you hear about us?" and not "Job board".
 */
import type { Page } from "playwright-core";

export type LiveField = {
  label: string;
  selector: string;
  type: "text" | "textarea" | "select" | "checkbox" | "group" | "file" | "buttons";
  options?: string[];
  required: boolean;
  /** For groups: the shared input name, used to find the option to click. */
  name?: string;
};

export function discoverFields(): LiveField[] {
  const clean = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").replace(/[✱*]/g, "").trim();
  const optionLabel = (el: HTMLInputElement) => clean((el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.closest("label")?.textContent);
  const out: LiveField[] = [];
  const seen = new Set<string>();
  const groups = new Map<string, { question: string; options: string[]; required: boolean; kind: "radio" | "checkbox"; count: number }>();

  // Segmented button groups (Ashby's Yes/No, "pick one" pills): 2 to 8 short-text buttons under one label and
  // no text control. The container is tagged so the runner can click the button that matches the answer.
  const buttonGroups = new Map<HTMLElement, HTMLButtonElement[]>();
  document.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    const text = clean(b.textContent);
    // Buttons without an explicit type report type="submit", so the real submit is recognised by its text, not its type.
    if (!text || text.length > 40 || /submit|apply now|send|continue|next|back|upload|attach|replace|remove|delete|add |browse|cancel|close|autofill/i.test(text) || b.closest("[role=option], [role=listbox], nav, header, footer")) return;
    const box = (b.closest("[data-field-entry-id], fieldset, [class*=field-entry], [class*=question], [class*=field]") || b.parentElement?.parentElement) as HTMLElement | null;
    if (!box || box.querySelector("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select")) return;
    buttonGroups.set(box, [...(buttonGroups.get(box) || []), b]);
  });
  let gi = 0;
  for (const [box, buttons] of buttonGroups) {
    if (buttons.length < 2 || buttons.length > 8) continue;
    const label = clean(box.querySelector("label, legend, [class*=question-title], [class*=title], [class*=label]")?.textContent);
    if (!label) continue;
    const key = `aa-btn-${gi++}`;
    box.setAttribute("data-aa-group", key);
    const required = !!box.querySelector("[class*=required], [required], [aria-required=true]") || /\*|✱/.test(box.querySelector("label, legend")?.textContent || "");
    out.push({ label, selector: `[data-aa-group="${key}"] button`, type: "buttons", options: buttons.map((b) => clean(b.textContent)), required });
  }

  document.querySelectorAll<HTMLElement>("input, textarea, select").forEach((el) => {
    const input = el as HTMLInputElement;
    if (["hidden", "submit", "button"].includes(input.type)) return;
    // Inputs the person cannot see (display:none helpers such as pronoun text fields) are not questions.
    if (input.type !== "file" && el.offsetParent === null && getComputedStyle(el).display === "none") return;
    // A hidden checkbox or radio under a segmented button group is that group's state, not a field of its own.
    if (el.closest("[data-aa-group]")) return;

    if ((input.type === "radio" || input.type === "checkbox") && input.name) {
      // Walk up while the container still only holds this group's inputs; the last non-option label is the question.
      let node: HTMLElement | null = el.parentElement;
      let question = "";
      const opt = optionLabel(input);
      while (node && node !== document.body) {
        // Stop at the first container that also holds other controls: the question sits inside the group's own box.
        const controls = Array.from(node.querySelectorAll<HTMLInputElement>("input, textarea, select")).filter((i) => !["hidden", "submit", "button"].includes(i.type));
        if (!controls.every((i) => (i.type === "radio" || i.type === "checkbox") && i.name === input.name)) break;
        const cand = node.querySelector("legend, h3, h4, h5, h6, [class*=question], [class*=Label], [class*=label]:not(label), .application-label");
        const t = clean(cand?.textContent);
        if (t && t !== opt) question = t;
        node = node.parentElement;
      }
      const g = groups.get(input.name) || { question, options: [], required: false, kind: input.type as "radio" | "checkbox", count: 0 };
      if (question) g.question = question;
      if (opt) g.options.push(opt);
      g.required = g.required || input.required || el.getAttribute("aria-required") === "true" || /\*|✱/.test(question);
      g.count++;
      groups.set(input.name, g);
      return;
    }

    const selector = el.id ? `#${CSS.escape(el.id)}` : el.getAttribute("name") ? `[name="${el.getAttribute("name")}"]` : "";
    if (!selector || seen.has(selector)) return;
    seen.add(selector);
    // The question text wins over the input's own placeholder: Lever's custom questions carry the question in
    // an .application-label above an input whose placeholder is just "Type your response".
    let label = "";
    if (el.id) label = document.querySelector(`label[for="${el.id}"]`)?.textContent || "";
    if (!label) label = el.closest("label")?.textContent || "";
    if (!label) {
      // Walk up to the smallest container that holds only this control and carries a label-like element.
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const controls = node.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select").length;
        if (controls > 1) break;
        const lab = node.querySelector(".application-label, label, legend, [class*=question-title], [class*=label]:not(input)");
        if (lab?.textContent?.trim()) { label = lab.textContent; break; }
        node = node.parentElement;
      }
    }
    if (!label) label = el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
    label = clean(label);
    // Lever appends helper text to some labels ("Current location No location found..."); keep the first sentence.
    label = label.replace(/(ATTACH RESUME|No location found|Couldn't auto-read|Analyzing resume|Loading).*$/i, "").trim();
    const required = input.required || el.getAttribute("aria-required") === "true" || /\*|✱/.test(el.closest("div, li")?.querySelector("label")?.textContent || "");
    // A radio or checkbox without a name never joined a group above; it is a lone checkbox, not a text field.
    const type: LiveField["type"] = el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : input.type === "file" ? "file" : input.type === "checkbox" || input.type === "radio" ? "checkbox" : "text";
    const options = el.tagName === "SELECT" ? Array.from((el as HTMLSelectElement).options).map((o) => o.text.trim()).filter(Boolean) : undefined;
    if (label) out.push({ label, selector, type, options, required });
  });

  for (const [name, g] of groups) {
    const selector = `input[name="${name.replace(/"/g, '\\"')}"]`;
    if (g.kind === "checkbox" && g.count === 1) {
      // A lone checkbox is a statement to agree with; its own text is the label.
      out.push({ label: g.options[0] || g.question, selector, type: "checkbox", required: g.required, name });
    } else if (g.question || g.options.length > 1) {
      out.push({ label: g.question || g.options.join(" / "), selector, type: "group", options: g.options, required: g.required, name });
    }
  }
  return out;
}

/**
 * Run discoverFields in a page. Bundlers that keep function names (tsx, esbuild) wrap inner
 * helpers in a `__name` call, which does not exist in the browser, so a no-op is defined first.
 */
export async function discoverLiveFields(page: Page): Promise<LiveField[]> {
  await page.evaluate("window.__name = window.__name || function (f) { return f; }");
  return page.evaluate(discoverFields);
}

/**
 * Every required field that is still empty, by label, the way a person checks a form before pressing
 * Submit. Heuristic on purpose: required means a star in the label, a "required" class, or a required
 * attribute; empty means no text, no file, no checked option, no pressed button in that field's box.
 */
export function findEmptyRequired(): string[] {
  const clean = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").replace(/[✱*]/g, "").trim();
  const seen = new Set<string>(); const out: string[] = [];
  const labels = Array.from(document.querySelectorAll<HTMLElement>("label, legend, [class*=question-title]"));
  for (const lab of labels) {
    const raw = lab.textContent || "";
    const ctl = (lab as HTMLLabelElement).control as HTMLElement | null;
    const box = (lab.closest("[data-field-entry-id], fieldset, [class*=field-entry], [class*=question], [class*=field], li") || lab.parentElement) as HTMLElement | null;
    if (!box) continue;
    const required = /\*|✱/.test(raw) || /required/i.test(lab.className) || !!(ctl && (ctl.hasAttribute("required") || ctl.getAttribute("aria-required") === "true")) || !!box.querySelector("[required], [aria-required=true]");
    if (!required) continue;
    const scope = ctl && !/radio|checkbox/.test((ctl as HTMLInputElement).type || "") ? ctl.parentElement || box : box;
    const texts = Array.from(scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]):not([type=submit]), textarea, select"));
    const files = Array.from(scope.querySelectorAll<HTMLInputElement>("input[type=file]"));
    const checks = Array.from(scope.querySelectorAll<HTMLInputElement>("input[type=radio], input[type=checkbox]"));
    const buttons = Array.from(scope.querySelectorAll<HTMLElement>("button, [role=radio], [role=checkbox]")).filter((b) => (b as HTMLButtonElement).type !== "submit");
    if (!texts.length && !files.length && !checks.length && !buttons.length) continue;
    const scopeText = scope.textContent || "";
    const filled =
      texts.some((t) => (t as HTMLInputElement).value?.trim()) ||
      files.some((f) => (f.files?.length || 0) > 0) || (files.length > 0 && /\.(pdf|docx?|rtf|txt)\b/i.test(scopeText)) ||
      checks.some((c) => c.checked) ||
      buttons.some((b) => b.getAttribute("aria-pressed") === "true" || b.getAttribute("aria-checked") === "true" || /selected|active|checked/i.test(b.className) && !/unselected/i.test(b.className));
    const label = clean(raw).replace(/(ATTACH RESUME|No location found|Couldn't auto-read|Analyzing resume|Loading).*$/i, "").trim();
    if (!filled && label && !seen.has(label)) { seen.add(label); out.push(label); }
  }
  return out;
}

export async function findEmptyRequiredLive(page: Page): Promise<string[]> {
  await page.evaluate("window.__name = window.__name || function (f) { return f; }");
  return page.evaluate(findEmptyRequired);
}
