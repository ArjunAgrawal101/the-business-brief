/**
 * The flashcard deck as a static JSON file, written at build time from the
 * content (src/lib/revision/deck.ts), so the flashcards page stays light and
 * loads the cards when its script starts.
 */
import type { APIRoute } from 'astro';
import { revisionData } from '../../../lib/revision/content';

export const GET: APIRoute = async () => {
  const { deck } = await revisionData();
  return new Response(JSON.stringify(deck), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
