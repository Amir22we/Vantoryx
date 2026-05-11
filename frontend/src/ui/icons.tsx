import type { ReactNode } from "react";

function I(props: { children: ReactNode }) {
  return (
    <span className="icon" aria-hidden="true">
      {props.children}
    </span>
  );
}

export function IconPulse() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconMessage() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 6h14v10H8l-3 3V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconLink() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 1 1-7-7l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconShield() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3l8 4v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconWand() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 20l10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 10l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="currentColor" opacity=".9" />
      </svg>
    </I>
  );
}

export function IconTimer() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 14V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 22a9 9 0 1 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 13l2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconMic() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="2" />
        <path d="M19 11a7 7 0 0 1-14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconHome() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconInfo() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" strokeWidth="2" />
        <path d="M12 10v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 7h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconMenu() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconClose() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconPerson() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
        <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconCode() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconStar() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconDevice() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M12 18h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconSun() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconHistory() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.05 11a9 9 0 1 1 .5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 16v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconMoon() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconSettings() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconCheck() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconTelegram() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 2L15 22l-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconGitHub() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.645.35-1.085.636-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10Z" fill="currentColor" />
      </svg>
    </I>
  );
}

export function IconExternal() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <polyline points="15,3 21,3 21,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconAndroid() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        {/* antennas */}
        <path d="M8.5 8.5L6.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15.5 8.5L17.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* head: dome (arc across top) + rectangular body */}
        <path d="M4 16a8 8 0 0 1 16 0v3H4v-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        {/* eyes */}
        <circle cx="9.5" cy="16.5" r="1" fill="currentColor" />
        <circle cx="14.5" cy="16.5" r="1" fill="currentColor" />
        {/* arms */}
        <path d="M1.5 15h2.5M20 15h2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconWindows() {
  return (
    <I>
      {/* Windows flag: 4 panes with perspective skew, filled */}
      <svg viewBox="0 0 24 24">
        <path d="M2.5 8.5V13H11V7L2.5 8.5Z" fill="currentColor" />
        <path d="M2.5 14V18.5L11 17V14H2.5Z" fill="currentColor" />
        <path d="M12 6.8V13H21.5V5.5L12 6.8Z" fill="currentColor" />
        <path d="M12 14V17.2L21.5 18.5V14H12Z" fill="currentColor" />
      </svg>
    </I>
  );
}

export function IconLinux() {
  return (
    <I>
      {/* Terminal window — universally understood as Linux */}
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
        <path d="M2 8.5h20" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="5.5" cy="5.75" r="1" fill="currentColor" />
        <circle cx="9" cy="5.75" r="1" fill="currentColor" />
        {/* > prompt */}
        <path d="M7 13.5l3 2-3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* cursor _ */}
        <path d="M13 17.5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconApple() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        {/* leaf */}
        <path d="M12 6C12 4 13.5 2.5 15.5 2.5C15.5 4.5 14 6 12 6Z" fill="currentColor" />
        {/* apple body: characteristic shape with bite on upper-right */}
        <path d="M8.5 8C6 8 3.5 10.5 3.5 14C3.5 17.5 6 22 9 22C10 22 10.8 21.5 12 21.5C13.2 21.5 14 22 15 22C18 22 20.5 17.5 20.5 14C20.5 10.5 18 8 15.5 8C14.5 8 13.5 8.5 12 8.5C10.5 8.5 9.5 8 8.5 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </I>
  );
}

export function IconSearch() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconGraduate() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3L2 8l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconShare() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </I>
  );
}

export function IconChart() {
  return (
    <I>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 16V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M9 16V6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M14 16V12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M19 16V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </I>
  );
}

// Large version for splash screen (no wrapper span)
export function IconShieldLarge() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l8 4v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
