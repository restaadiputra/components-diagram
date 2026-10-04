export const files: Record<string, string> = {
  'src/api.ts': `export function saveCart(items: string[]) { return fetch('/cart'); }`,
  'src/use-cart.ts': `
    import { useState } from 'react';
    export function useCart(initial: string[]) {
      const [items, setItems] = useState(initial);
      const add = (i: string) => setItems([...items, i]);
      return { items, add };
    }
  `,
  'src/list.tsx': `export function List({ rows, onPick }: { rows: string[]; onPick: () => void }) { return <ul />; }`,
  'src/page.tsx': `
    import { useState } from 'react';
    import { useCart } from './use-cart';
    import { List } from './list';
    import { saveCart } from './api';
    export function Page() {
      const [seed] = useState<string[]>([]);
      const { items, add } = useCart(seed);
      const pick = () => { add('x'); saveCart(items); };
      return <List rows={items} onPick={pick} />;
    }
  `,
};
