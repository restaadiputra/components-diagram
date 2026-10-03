import { useDiagramState, useServices } from './services-context';

export function NoticeBar() {
  const { store, persistent } = useServices();
  const notice = useDiagramState((state) => state.notice);
  return (
    <>
      {!persistent && (
        <p role="alert" className="bg-amber-100 px-3 py-1 text-sm">
          Browser storage is unavailable. This diagram will be lost when the tab closes — export it
          to keep it.
        </p>
      )}
      {notice !== null && (
        <p role="status" className="flex justify-between bg-sky-100 px-3 py-1 text-sm">
          {notice}
          <button aria-label="Dismiss" onClick={() => store.getState().setNotice(null)}>
            ✕
          </button>
        </p>
      )}
    </>
  );
}
