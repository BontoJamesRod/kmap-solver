import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconPlus = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconSidebar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9.5 4v16" />
  </Icon>
);
export const IconMenu = (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h10" /></Icon>;
export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h11M18 6h3M3 12h3M10 12h11M3 18h13M20 18h1" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);
export const IconArrowUp = (p: IconProps) => <Icon {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Icon>;
export const IconX = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const IconChevron = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const IconLink = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </Icon>
);
export const IconCheck = (p: IconProps) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>;
export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V7a2 2 0 0 1 2-2h8" />
  </Icon>
);
export const IconDownload = (p: IconProps) => <Icon {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Icon>;

/** The app's own mark: a 2×2 map with one group circled. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2.5v19M2.5 12h19" stroke="currentColor" strokeWidth="1.1" opacity=".45" />
      <rect x="4.6" y="4.6" width="14.8" height="6.2" rx="3.1" fill="var(--accent)" fillOpacity=".18" stroke="var(--accent)" strokeWidth="1.7" />
    </svg>
  );
}
