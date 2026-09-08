import { z } from "zod";

/** The tailored resume the LLM produces. Rendering never reads the master directly. */
export const TailoredResume = z.object({
  headline: z.string().max(80).optional().describe("Not rendered, used for the email subject"),
  roles: z.array(z.object({
    company: z.string(),
    title: z.string(),
    start: z.string(),
    end: z.string(),
    groups: z.array(z.object({
      heading: z.string().min(3).max(60),
      bullets: z.array(z.string().min(40).max(230)).min(1).max(4)
    })).min(1).max(4)
  })).min(1).max(2),
  projects: z.array(z.object({
    name: z.string(),
    stack: z.string().max(70),
    year: z.string(),
    bullets: z.array(z.string().min(40).max(230)).min(1).max(2)
  })).min(1).max(2),
  skills: z.array(z.object({
    label: z.string().max(40),
    items: z.array(z.string()).min(2).max(12)
  })).min(4).max(7),
  coursework: z.array(z.string()).max(6).optional(),
  achievements: z.array(z.string()).min(1).max(2)
});
export type TailoredResume = z.infer<typeof TailoredResume>;
