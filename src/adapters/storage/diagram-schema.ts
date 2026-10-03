import { z } from 'zod';
import type { ParseResult } from '../../application/ports/diagram-codec';
import type { DiagramSummary } from '../../application/ports/diagram-repository';
import {
  CURRENT_SCHEMA_VERSION,
  EDGE_KIND_VALUES,
  ITEM_KIND_VALUES,
  LINK_RELATION_VALUES,
  NODE_KIND_VALUES,
} from '../../domain/diagram';
import { dropDanglingReferences } from '../../domain/repair';

const id = z.string().min(1);

const item = z.object({
  id,
  kind: z.enum(ITEM_KIND_VALUES),
  name: z.string(),
  type: z.string().optional(),
  note: z.string().optional(),
});

const link = z.object({
  id,
  fromItemId: z.string(),
  toItemId: z.string(),
  relation: z.enum(LINK_RELATION_VALUES),
});

const node = z.object({
  id,
  kind: z.enum(NODE_KIND_VALUES),
  name: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  collapsed: z.boolean(),
  items: z.array(item),
  links: z.array(link),
});

const endpoint = z.object({ nodeId: z.string(), itemId: z.string().optional() });

const diagramSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  id,
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: z.array(node),
  edges: z.array(
    z.object({ id, kind: z.enum(EDGE_KIND_VALUES), source: endpoint, target: endpoint }),
  ),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
});

const versionSchema = z.object({ schemaVersion: z.number().int().positive() });
const summarySchema = z.object({ id, name: z.string(), updatedAt: z.string() });

/**
 * `MIGRATIONS[n]` upgrades a raw file from version n to n + 1. When the format
 * changes: bump CURRENT_SCHEMA_VERSION, add the migration here, and add a
 * fixture of the old version with a test that it still opens.
 */
const MIGRATIONS: Record<number, (raw: unknown) => unknown> = {};

function migrate(raw: unknown, from: number): unknown {
  let current = raw;
  for (let version = from; version < CURRENT_SCHEMA_VERSION; version += 1) {
    current = MIGRATIONS[version]?.(current) ?? current;
  }
  return current;
}

export function parseDiagram(raw: unknown): ParseResult {
  const version = versionSchema.safeParse(raw);
  if (!version.success) {
    return { ok: false, reason: 'This is not a diagram file: it has no schemaVersion.' };
  }
  const { schemaVersion } = version.data;
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    const format = String(schemaVersion);
    return {
      ok: false,
      reason: `This diagram was saved by a newer version of the app (format ${format}). Update the app to open it.`,
    };
  }
  const parsed = diagramSchema.safeParse(migrate(raw, schemaVersion));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.map(String).join('.') ?? 'file';
    return {
      ok: false,
      reason: `This diagram file is invalid at "${where}": ${issue?.message ?? 'unknown problem'}.`,
    };
  }
  const { diagram, dropped } = dropDanglingReferences(parsed.data);
  return { ok: true, diagram, droppedReferences: dropped };
}

export function parseSummary(raw: unknown): DiagramSummary | undefined {
  const parsed = summarySchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export function newestFirst(a: DiagramSummary, b: DiagramSummary): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}
