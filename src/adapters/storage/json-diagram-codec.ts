import type { DiagramCodec } from '../../application/ports/diagram-codec';
import { parseDiagram } from './diagram-schema';

function readJson(text: string): { value: unknown } | undefined {
  try {
    return { value: JSON.parse(text) as unknown };
  } catch {
    return undefined;
  }
}

export const jsonDiagramCodec: DiagramCodec = {
  parse: (text) => {
    const json = readJson(text);
    return json ? parseDiagram(json.value) : { ok: false, reason: 'This file is not valid JSON.' };
  },
  serialize: (diagram) => JSON.stringify(diagram, null, 2),
};
