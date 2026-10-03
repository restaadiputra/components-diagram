import { ReactFlowProvider } from '@xyflow/react';
import { DiagramCanvas } from '../canvas/diagram-canvas';
import { Inspector } from '../panels/inspector';
import { Palette } from '../panels/palette';
import { NoticeBar } from './notice-bar';
import { TopBar } from './top-bar';
import { useShortcuts } from './use-shortcuts';

export function App() {
  useShortcuts();
  return (
    <div className="flex h-full flex-col text-slate-900">
      <TopBar />
      <NoticeBar />
      <div className="flex min-h-0 flex-1">
        <Palette />
        <main className="min-w-0 flex-1">
          <ReactFlowProvider>
            <DiagramCanvas />
          </ReactFlowProvider>
        </main>
        <Inspector />
      </div>
    </div>
  );
}
