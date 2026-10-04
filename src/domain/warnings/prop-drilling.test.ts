import { describe, expect, it } from 'vitest';
import { diagramOf, edge, item, link, node } from '../testing/fixtures';
import { propDrilling } from './prop-drilling';
import { WARNING_THRESHOLDS } from './types';

const app = node('App', 'component', { items: [item('user', 'state')] });
const layout = node('Layout', 'component', { items: [item('layoutUser', 'prop')] });
const sidebar = node('Sidebar', 'component', { items: [item('sidebarUser', 'prop')] });
const badge = node('Badge', 'component', { items: [item('badgeUser', 'prop')] });

const toLayout = edge('e1', 'passes-prop', 'App/user->Layout/layoutUser');
const toSidebar = edge('e2', 'passes-prop', 'Layout/layoutUser->Sidebar/sidebarUser');
const toBadge = edge('e3', 'passes-prop', 'Sidebar/sidebarUser->Badge/badgeUser');

const run = (nodes: ReturnType<typeof node>[], edges: ReturnType<typeof edge>[]) =>
  propDrilling(diagramOf(nodes, edges), WARNING_THRESHOLDS);

describe('prop-drilling', () => {
  it('warns at the origin when a value crosses 3 levels unused in between', () => {
    expect(run([app, layout, sidebar, badge], [toLayout, toSidebar, toBadge])).toEqual([
      {
        ruleId: 'prop-drilling',
        target: { nodeId: 'App', itemId: 'user' },
        message: "'user' is forwarded 3 levels without being used in between",
        relatedNodeIds: ['App', 'Layout', 'Sidebar', 'Badge'],
      },
    ]);
  });

  it('stays quiet at 2 levels', () => {
    expect(run([app, layout, sidebar], [toLayout, toSidebar])).toEqual([]);
  });

  it('lets the last component use the value', () => {
    const used = node('Badge', 'component', {
      items: [item('badgeUser', 'prop'), item('label', 'derived')],
      links: [link('l1', 'depends-on', 'label->badgeUser')],
    });
    expect(run([app, layout, sidebar, used], [toLayout, toSidebar, toBadge])).toHaveLength(1);
  });

  it('stops at a component in between that uses the value (links)', () => {
    const using = node('Sidebar', 'component', {
      items: [item('sidebarUser', 'prop'), item('greeting', 'derived')],
      links: [link('l1', 'depends-on', 'greeting->sidebarUser')],
    });
    expect(run([app, layout, using, badge], [toLayout, toSidebar, toBadge])).toEqual([]);
  });

  it('stops at a component in between that uses the value (other edge)', () => {
    const calling = edge('e9', 'calls', 'Sidebar/sidebarUser->api/load');
    const api = node('api', 'service', { items: [item('load', 'method')] });
    expect(
      run([app, layout, sidebar, badge, api], [toLayout, toSidebar, toBadge, calling]),
    ).toEqual([]);
  });

  it('follows callbacks too and reports the longest chain', () => {
    const handler = node('App', 'component', { items: [item('onSave', 'handler')] });
    const edges = [
      edge('e1', 'passes-callback', 'App/onSave->Layout/layoutUser'),
      toSidebar,
      toBadge,
      edge('e4', 'passes-prop', 'Layout/layoutUser->Badge/badgeUser'),
    ];
    const [warning] = run([handler, layout, sidebar, badge], edges);
    expect(warning?.relatedNodeIds).toEqual(['App', 'Layout', 'Sidebar', 'Badge']);
  });

  it('terminates on a forwarding cycle', () => {
    const back = edge('e4', 'passes-prop', 'Badge/badgeUser->Layout/layoutUser');
    expect(() =>
      run([app, layout, sidebar, badge], [toLayout, toSidebar, toBadge, back]),
    ).not.toThrow();
  });

  it('honours a lower threshold', () => {
    const diagram = diagramOf([app, layout, sidebar], [toLayout, toSidebar]);
    expect(propDrilling(diagram, { ...WARNING_THRESHOLDS, drillingHops: 2 })).toHaveLength(1);
  });
});
