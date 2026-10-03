import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DiagramCanvas } from '../canvas/diagram-canvas';
import { DiagramList } from '../panels/diagram-list';
import { Inspector } from '../panels/inspector';
import { Palette } from '../panels/palette';
import { NoticeBar } from './notice-bar';
import { TopBar } from './top-bar';
import { useShortcuts } from './use-shortcuts';

export function App() {
  const [listOpen, setListOpen] = useState(false);
  useShortcuts(listOpen);
  return (
    <div className="flex h-full flex-col text-slate-900">
      <TopBar onOpenList={() => setListOpen(true)} />
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
      {listOpen && <DiagramList onClose={() => setListOpen(false)} />}
    </div>
  );
}
