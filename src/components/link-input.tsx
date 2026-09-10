"use client";
import { useState } from "react";
import { Link2 } from "lucide-react";

const BOARD: [RegExp, string][] = [[/greenhouse\.io/, "Greenhouse"], [/lever\.co/, "Lever"], [/ashbyhq\.com/, "Ashby"]];

/** Recognizes the board as you type, so you know before submitting whether the link will work. */
export function LinkInput({ disabled, large = false }: { disabled?: boolean; large?: boolean }) {
  const [v, setV] = useState("");
  const board = BOARD.find(([re]) => re.test(v))?.[1];
  const unknown = v.length > 12 && !board;
  return (
    <div className="relative flex-1">
      <Link2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
      <input name="url" type="url" required value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} placeholder="Paste a Greenhouse, Lever or Ashby job link" aria-label="Job link" className={`field mono pl-10 pr-32 ${large ? "h-12 text-[14px]" : ""}`} />
      <span className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${board ? "bg-go-soft text-go" : unknown ? "bg-signal-soft text-signal" : "text-transparent"}`}>{board ? `${board} recognized` : unknown ? "Not a supported board" : "."}</span>
    </div>
  );
}
