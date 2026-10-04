export const files: Record<string, string> = {
  'src/api.ts': `export function saveCart(items: string[]) { return fetch('/cart'); }`,
  'src/page.tsx': `
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
    import { saveCart } from './api';
    export function Page() {
      const { data } = useQuery({ queryKey: ['cart'], queryFn: () => saveCart([]) });
      const client = useQueryClient();
      const save = useMutation({
        mutationFn: saveCart,
        onSuccess: () => client.invalidateQueries({ queryKey: ['cart'] }),
      });
      const submit = () => { saveCart([]); save.mutate([]); };
      return <button onClick={submit} />;
    }
  `,
};
