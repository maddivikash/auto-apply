"use client";
import { useState } from "react";

const BOARD: [RegExp, string][] = [[/greenhouse\.io/, "Greenhouse"], [/lever\.co/, "Lever"], [/ashbyhq\.com/, "Ashby"]];

/** Recognizes the board as you type, so you know before submitting whether the link will work. */
export function LinkInput({ disabled }: { disabled?: boolean }) {
  const [v, setV] = useState("");
  const board = BOARD.find(([re]) => re.test(v))?.[1];
  const unknown = v.length > 12 && !board;
  return (
    <div className="relative flex-1">
      <input name="url" type="url" required value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} placeholder="Paste a job link, like https://job-boards.greenhouse.io/company/jobs/123456" className="field py-2.5 pr-28" />
      <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs ${board ? "bg-go-soft text-go" : unknown ? "bg-signal-soft text-signal" : "text-muted"}`}>{board ? `${board} ✓` : unknown ? "Not supported" : ""}</span>
    </div>
  );
}
