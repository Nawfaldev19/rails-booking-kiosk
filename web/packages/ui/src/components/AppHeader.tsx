// The page header both apps share: skip link, brand, theme switch and sign-out.
import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTheme } from '../useTheme';
import { Button } from './Button';

const THEME_LABEL = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' } as const;

function BookingKioskMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--color-primary)" />
      <path
        d="M9 23V9M9 16l9-7M12.5 13.5L21 23"
        stroke="var(--color-on-primary)"
        strokeWidth="2.4"
        fill="none"
      />
      <rect x="21" y="8" width="3" height="16" rx="1.5" fill="var(--color-accent)" />
    </svg>
  );
}

/** Props for {@link AppHeader}. */
interface AppHeaderProps {
  /** The app's name next to the Booking Kiosk mark, such as "Members" or "Front desk". */
  readonly product: string;
  /** Where the brand link goes. */
  readonly homeHref: string;
  /** App-specific navigation, placed between the brand and the controls. */
  readonly children?: ReactNode;
  /** The signed-in person's name; nothing is shown when absent. */
  readonly userName?: string | null;
  /** Shows a Sign out button when given. */
  readonly onSignOut?: () => void;
}

/**
 * The top bar of every page.
 *
 * @remarks
 * Its first focusable element is a "Skip to content" link to `#main`, so
 * keyboard users can bypass the navigation (WCAG 2.4.1). The theme button's
 * accessible name states the current theme as well as the action.
 */
export function AppHeader({ product, homeHref, children, userName, onSignOut }: AppHeaderProps) {
  const { choice, cycle } = useTheme();
  const ThemeIcon = choice === 'dark' ? Moon : choice === 'light' ? Sun : Monitor;
  return (
    <header className="k-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <a className="k-brand" href={homeHref}>
        <BookingKioskMark />
        Booking Kiosk <span className="k-brand-sub">{product}</span>
      </a>
      {children}
      <div className="k-header-end">
        {userName && <span className="k-muted k-header-user">{userName}</span>}
        <Button
          variant="ghost"
          onClick={cycle}
          aria-label={`${THEME_LABEL[choice]}. Switch theme`}
          title={THEME_LABEL[choice]}
          icon={<ThemeIcon size={18} aria-hidden="true" />}
        />
        {onSignOut && (
          <Button
            variant="ghost"
            onClick={onSignOut}
            icon={<LogOut size={18} aria-hidden="true" />}
          >
            Sign out
          </Button>
        )}
      </div>
    </header>
  );
}
