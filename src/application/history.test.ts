import { describe, expect, it } from 'vitest';
import { diagramOf } from '../domain/testing/fixtures';
import { emptyHistory, HISTORY_LIMIT, record, stepBack, stepForward } from './history';

const named = (name: string) => ({ ...diagramOf([]), name });

describe('history', () => {
  it('records the previous diagram and clears redo', () => {
    const history = record({ past: [], future: [named('redo')] }, named('a'));
    expect(history.past.map((d) => d.name)).toEqual(['a']);
    expect(history.future).toEqual([]);
  });

  it('keeps at most the limit of past entries, dropping the oldest', () => {
    let history = emptyHistory;
    for (let index = 0; index <= HISTORY_LIMIT; index += 1) {
      history = record(history, named(String(index)));
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]?.name).toBe('1');
  });

  it('steps back and forward', () => {
    const back = stepBack(record(emptyHistory, named('a')), named('b'));
    expect(back?.diagram.name).toBe('a');
    const forward = back && stepForward(back.history, back.diagram);
    expect(forward?.diagram.name).toBe('b');
    expect(forward?.history.past.map((d) => d.name)).toEqual(['a']);
  });

  it('returns undefined when there is nothing to step to', () => {
    expect(stepBack(emptyHistory, named('a'))).toBeUndefined();
    expect(stepForward(emptyHistory, named('a'))).toBeUndefined();
  });
});
