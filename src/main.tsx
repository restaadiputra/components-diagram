import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createDiagramStore } from './application/diagram-store';
import { createDiagram } from './domain/diagram';
import './index.css';
import { App } from './ui/app-shell/app';
import { ServicesProvider } from './ui/app-shell/services-context';

// Composition root: the only place that picks concrete implementations.
const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const store = createDiagramStore(createDiagram(newId(), 'Untitled diagram', now()), now);

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');

createRoot(root).render(
  <StrictMode>
    <ServicesProvider value={{ store, newId }}>
      <App />
    </ServicesProvider>
  </StrictMode>,
);
