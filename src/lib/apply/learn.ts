import { listApplications, saveApplication, type Application } from "../store";
import type { Settings } from "../profile/types";
import { ANSWERS_MATTER, refreshAnswers } from "./answers";
import { getBank, recordAnswers, saveBank, type AnswerBank } from "./bank";

/**
 * After the user answers questions on one application: bank those answers, then fill the same
 * questions on every other open application straight away.
 */
export async function learnAnswers(userId: string, app: Application, settings: Settings): Promise<AnswerBank> {
  const bank = await getBank(userId);
  if (recordAnswers(bank, app)) await saveBank(userId, bank);
  await refreshOpenWithBank(userId, settings, bank, app.id);
  return bank;
}

/** Re-derive answers on open applications from settings and the bank (optionally skipping one already saved). */
export async function refreshOpenWithBank(userId: string, settings: Settings, bank?: AnswerBank, skipId?: string) {
  const b = bank ?? (await getBank(userId));
  const apps = (await listApplications(userId)).filter((a) => ANSWERS_MATTER(a) && a.id !== skipId);
  await Promise.all(apps.filter((a) => refreshAnswers(a, settings, b)).map((a) => saveApplication(a)));
}
