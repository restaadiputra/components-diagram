export const files: Record<string, string> = {
  'src/theme.ts': `import { createContext } from 'react'; export const Theme = createContext('light');`,
  'src/theme-provider.tsx': `
    import { Theme } from './theme';
    export function ThemeProvider({ children }: { children: unknown }) {
      return <Theme.Provider value="dark">{children}</Theme.Provider>;
    }
  `,
  'src/header.tsx': `
    import { useContext } from 'react';
    import { Theme } from './theme';
    export function Header() { const theme = useContext(Theme); return <h1 className={theme} />; }
  `,
  'src/footer.tsx': `
    import { useContext } from 'react';
    import { Theme } from './theme';
    export function Footer() { const theme = useContext(Theme); return <footer className={theme} />; }
  `,
};
