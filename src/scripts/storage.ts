/**
 * Raw access to this site's items in local storage, for the recorder, the
 * save button and the dashboard. Every call is wrapped, so blocked, full or
 * missing storage never throws: reads give null and writes report failure.
 */

/** The item written and removed to learn whether storage works. */
const PROBE = 'bb:storage-check';

export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes and reads back; false when the browser would not keep it. */
export function writeItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return localStorage.getItem(key) === value;
  } catch {
    return false;
  }
}

export function removeItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Every item of this site's ("bb:..."), by name; null when storage cannot be read. */
export function siteItems(): Record<string, string> | null {
  try {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('bb:') || k === PROBE) continue;
      const v = localStorage.getItem(k);
      if (v !== null) out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

let works: boolean | undefined;

/** True when this browser lets the site keep something: one write, read back and removed, checked once a page. */
export function storageWorks(): boolean {
  if (works !== undefined) return works;
  try {
    localStorage.setItem(PROBE, '1');
    works = localStorage.getItem(PROBE) === '1';
    localStorage.removeItem(PROBE);
  } catch {
    works = false;
  }
  return works;
}
