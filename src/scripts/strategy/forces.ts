/** Five Forces assessor in the browser: five fixed forces, so every change is a value. */
import { mount } from './controller';
import { blank, editorHtml, fileName, headline, normalize, outputsHtml, toCsvText, toText, type ForcesState } from '../../lib/strategy/forces';

mount<ForcesState>({
  tool: 'five-forces',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  action: () => null,
});
