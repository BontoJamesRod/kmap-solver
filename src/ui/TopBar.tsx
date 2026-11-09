import { IconLink, IconMenu, IconSidebar } from './icons';

interface Props {
  title: string;
  subtitle: string;
  sidebarOpen: boolean;
  drawer: boolean;
  onToggleSidebar: () => void;
  onShare: () => void;
  shareLabel: string;
}

export function TopBar({ title, subtitle, sidebarOpen, drawer, onToggleSidebar, onShare, shareLabel }: Props) {
  return (
    <header className="topbar">
      {(!sidebarOpen || drawer) && (
        <button
          type="button"
          className="icon-button"
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
        >
          {drawer ? <IconMenu /> : <IconSidebar />}
        </button>
      )}
      <div className="topbar-title">
        <span className="topbar-name">{title}</span>
        <span className="topbar-sub">{subtitle}</span>
      </div>
      <button type="button" className="button secondary" onClick={onShare}>
        <IconLink size={16} />
        <span>{shareLabel}</span>
      </button>
    </header>
  );
}
