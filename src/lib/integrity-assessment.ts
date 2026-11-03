/**
 * Integrity checks for the Assessment Centre's practice engine: every
 * question the bank draws from the questions collection, the notes and the
 * case files can be read, names a command term in the register and a real
 * subtopic, and has guidance to reveal. Called from checkIntegrity in
 * src/lib/integrity.ts, so the build fails on any problem.
 */
import { buildBank } from './bank-build';
import type { Corpus } from './integrity';

interface Problem {
  where: string;
  message: string;
}

export function checkAssessment(c: Corpus): Problem[] {
  const { items, problems } = buildBank(c);
  const out: Problem[] = [...problems];
  for (const it of items) {
    if (it.source !== 'question' && !(it.guidance ?? '').trim()) out.push({ where: `question bank/${it.id}`, message: 'no strong-response guidance to reveal' });
    if (it.source === 'question' && !it.questionId) out.push({ where: `question bank/${it.id}`, message: 'no question to take the mark scheme from' });
  }
  return out;
}
