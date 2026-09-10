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
  type: "text" | "textarea" | "select" | "checkbox" | "group" | "file";
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

  document.querySelectorAll<HTMLElement>("input, textarea, select").forEach((el) => {
    const input = el as HTMLInputElement;
    if (["hidden", "submit", "button"].includes(input.type)) return;

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
    let label = "";
    if (el.id) label = document.querySelector(`label[for="${el.id}"]`)?.textContent || "";
    if (!label) label = el.closest("label")?.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
    if (!label) { const wrap = el.closest("div, li, fieldset"); label = wrap?.querySelector("label, legend, .application-label, [class*=label]")?.textContent || ""; }
    label = clean(label);
    // Lever appends helper text to some labels ("Current location No location found..."); keep the first sentence.
    label = label.replace(/(ATTACH RESUME|No location found|Couldn't auto-read|Analyzing resume|Loading).*$/i, "").trim();
    const required = input.required || el.getAttribute("aria-required") === "true" || /\*|✱/.test(el.closest("div, li")?.querySelector("label")?.textContent || "");
    const type: LiveField["type"] = el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : input.type === "file" ? "file" : "text";
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
