import type { Diagram } from '../../domain/diagram';
import type { LoadedDiagram } from './diagram-repository';

export type ParseResult = ({ ok: true } & LoadedDiagram) | { ok: false; reason: string };

/** Turns a diagram into file text and back. `reason` is shown to the user as is. */
export interface DiagramCodec {
  parse: (text: string) => ParseResult;
  serialize: (diagram: Diagram) => string;
}
