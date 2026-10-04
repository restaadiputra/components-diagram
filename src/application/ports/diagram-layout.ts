import type { DiagramEdge, DiagramNode } from '../../domain/diagram';

/** Returns the same nodes with positions filled in. Pure: the input is never mutated. */
export type DiagramLayout = (nodes: DiagramNode[], edges: DiagramEdge[]) => DiagramNode[];
