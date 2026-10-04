import { describe, expect, it } from 'vitest';
import { named, run } from './testing/run-analyzer';

const sources = {
  'src/app.tsx': `
    import { createContext, memo } from 'react';
    export const ThemeContext = createContext('light');
    export function App() { return <div />; }
    export const Card = memo(() => <span />);
    export const Wrapped = connect(App);
    export function useThing() { return 1; }
    export const useOther = () => 2;
    export function helper() { return 3; }
    export function lower() { return <p />; }
    export class Legacy extends Component { render() { return <i />; } }
  `,
};

describe('discoverNodes', () => {
  it('finds components, hooks and contexts by kind', async () => {
    const result = await run(sources);
    const kinds = Object.fromEntries(result.nodes.map((node) => [node.name, node.kind]));
    expect(kinds).toEqual({
      ThemeContext: 'context',
      App: 'component',
      Card: 'component',
      useThing: 'hook',
      useOther: 'hook',
      Legacy: 'component',
    });
  });

  it('skips plain functions and lowercase JSX functions', async () => {
    const result = await run(sources);
    expect(named(result, 'helper')).toBeUndefined();
    expect(named(result, 'lower')).toBeUndefined();
  });

  it('reports a higher-order component instead of guessing', async () => {
    const result = await run(sources);
    expect(result.report.entries).toContainEqual({ kind: 'hoc', file: 'src/app.tsx', line: 6 });
    expect(named(result, 'Wrapped')).toBeUndefined();
  });

  it('places every node at the origin', async () => {
    const result = await run(sources);
    expect(result.nodes.every((node) => node.position.x === 0 && node.position.y === 0)).toBe(true);
  });
});
