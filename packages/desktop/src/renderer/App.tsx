import LeftNav from './layouts/LeftNav';
import MainArea from './layouts/MainArea';
import RightPanel from './layouts/RightPanel';
import { useUiStore } from './stores/uiStore';
import { useGatewayEventDispatcher } from './hooks/useGatewayDispatcher';

export default function App() {
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const setRightPanelOpen = useUiStore((s) => s.setRightPanelOpen);

  useGatewayEventDispatcher();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* macOS title bar drag region */}
      <div className="titlebar-drag fixed top-0 left-0 right-0 h-8 z-50" />

      {/* Left Navigation — fixed 260px */}
      <aside
        className="flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)]"
        style={{ width: 260 }}
      >
        <LeftNav />
      </aside>

      {/* Main Content Area — flexible */}
      <main className="flex-1 min-w-0 flex flex-col">
        <MainArea onTogglePanel={toggleRightPanel} />
      </main>

      {/* Right Context Panel — 320px, collapsible */}
      {rightPanelOpen && (
        <aside
          className="flex-shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)]"
          style={{ width: 320 }}
        >
          <RightPanel onClose={() => setRightPanelOpen(false)} />
        </aside>
      )}
    </div>
  );
}
