/**
 * Integrity checks for the Assessment Centre's practice engine: every
 * question the bank draws from the questions collection, the notes and the
 * case files can be read, names a command term in the register and a real
 * subtopic, and has guidance to reveal; and no HL-only question claims the
 * style of Paper 1, which does not assess the HL extension topics. Called
 * from checkIntegrity in
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
    // Paper 1 covers units 1 to 5 without the HL extension topics, at both levels (guide, pp. 39 to 40).
    if (it.level === 'HL' && it.paper === 'paper-1') out.push({ where: `question bank/${it.id}`, message: 'is HL only, but Paper 1 does not assess the HL extension topics' });
  }
  return out;
}
