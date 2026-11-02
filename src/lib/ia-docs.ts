/**
 * The supporting-document checks for the IA, as a pure function: the number
 * of documents, their dates, who chose them, transcripts and textbooks (the
 * guide's rules), and the range of voices, data and length (recommended).
 */
export interface Doc {
  title: string;
  year: string;
  voice: string;
  data: boolean;
  long: boolean;
  teacher: boolean;
  textbook: boolean;
  transcript: boolean;
}

export interface Check {
  ok: boolean | 'tip';
  text: string;
  why: string;
  label: 'IB requirement' | 'Examiner emphasis' | 'Recommended strategy';
}

export const blankDoc = (): Doc => ({ title: '', year: '', voice: 'org', data: false, long: false, teacher: false, textbook: false, transcript: false });

/** The checks, as a pure function so the unit tests can reach it. */
export function checkDocuments(docs: Doc[], submitYear: number, submitMonth: number): Check[] {
  const used = docs.filter((d) => d.title.trim() || d.year);
  const n = used.length;
  const out: Check[] = [];
  out.push({
    ok: n >= 3 && n <= 5,
    text: `${n} ${n === 1 ? 'document' : 'documents'}: the guide asks for three to five.`,
    why: 'Any other number scores at most 1 mark for criterion B, as the assessment guides report.',
    label: 'IB requirement',
  });
  const dated = used.filter((d) => Number(d.year) > 0);
  const tooOld = dated.filter((d) => submitYear - Number(d.year) >= 4);
  const borderline = dated.filter((d) => submitYear - Number(d.year) === 3);
  const future = dated.filter((d) => Number(d.year) > submitYear);
  if (dated.length < n) out.push({ ok: 'tip', text: `${n - dated.length} without a year: add each publication year so the three-year rule can be checked.`, why: 'It is the publication date that counts, not the date of the event.', label: 'IB requirement' });
  out.push({
    ok: tooOld.length === 0 && future.length === 0 && dated.length > 0,
    text:
      tooOld.length > 0
        ? `${tooOld.length} published more than three years before your submission.`
        : future.length > 0
          ? `${future.length} dated after your submission: check the year.`
          : 'Published within three years before submission.',
    why: 'Each document must be published within the three years before submission; the event it describes can be older.',
    label: 'IB requirement',
  });
  if (borderline.length && !tooOld.length) out.push({ ok: 'tip', text: `${borderline.length} published three calendar years before submission: check the month is within the three years.`, why: `Submitting in ${submitMonth === 3 ? 'April' : 'October'} ${submitYear}, a document must be published no earlier than ${submitMonth === 3 ? 'April' : 'October'} ${submitYear - 3}.`, label: 'IB requirement' });
  const teacher = used.filter((d) => d.teacher).length;
  out.push({ ok: teacher === 0, text: teacher ? `${teacher} supplied by your teacher: you must choose your own.` : 'Chosen by you, not supplied by your teacher.', why: 'The documents are part of the work being assessed.', label: 'IB requirement' });
  const transcripts = used.filter((d) => d.transcript).length;
  out.push({ ok: transcripts <= 1, text: transcripts > 1 ? `${transcripts} transcripts: at most one is allowed.` : 'At most one transcript of audio or video.', why: 'The transcript must come from a reliable organization and be traceable to its original.', label: 'IB requirement' });
  const textbooks = used.filter((d) => d.textbook).length;
  out.push({ ok: textbooks === 0, text: textbooks ? `${textbooks} textbook or class-note documents: reference them instead.` : 'No textbook or class notes as documents.', why: 'Theory belongs in your analysis, cited; the documents are evidence about the organization.', label: 'IB requirement' });
  const voices = new Set(used.map((d) => d.voice));
  const allOrg = n > 0 && used.every((d) => d.voice === 'org');
  out.push({
    ok: !allOrg && voices.size >= 3,
    text: allOrg
      ? 'Every document is from the organization itself: the set lacks balance.'
      : `${voices.size} different ${voices.size === 1 ? 'voice' : 'voices'} in the set.`,
    why: 'A range of ideas and views is needed for 4 marks in criterion B. Inside and outside voices (the firm, independent data, your own research, a sceptic) give it.',
    label: 'Examiner emphasis',
  });
  const dataRich = used.filter((d) => d.data).length;
  out.push({ ok: n > 0 && dataRich >= Math.min(3, n), text: `${dataRich} with data you can analyse with a tool.`, why: 'Criterion D rewards document data used to analyse; a set without figures leaves little to work with.', label: 'Recommended strategy' });
  const long = used.filter((d) => d.long).length;
  out.push({ ok: long === 0, text: long ? `${long} longer than five A4 pages: highlight the part you use, or choose a shorter source.` : 'None longer than five A4 pages.', why: 'Recommended, not required.', label: 'Recommended strategy' });
  if (used.some((d) => d.voice === 'primary')) out.push({ ok: 'tip', text: 'For primary research, attach the blank questionnaire and a tally, or the interview questions and a summary.', why: 'That is the form the guide allows for primary research as a document.', label: 'IB requirement' });
  return out;
}

