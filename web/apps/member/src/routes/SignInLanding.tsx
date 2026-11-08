// What a signed-out visitor sees: what Booking Kiosk does, and the sign-in form.
import { AppHeader, SignInPanel, useDocumentTitle } from '@booking-kiosk/ui';
import { Clock3, ShieldCheck, Users } from 'lucide-react';

const POINTS = [
  {
    icon: Clock3,
    title: 'Holds that cannot collide',
    body: 'Choosing a slot holds it for a few minutes while you confirm. Postgres refuses any overlapping booking, so two people can never get the same slot, however many click at once.',
  },
  {
    icon: ShieldCheck,
    title: 'Workspaces kept apart',
    body: 'Each makerspace is its own workspace. Data access and composite database keys keep one workspace from ever reading or touching another.',
  },
  {
    icon: Users,
    title: 'Roles and two apps',
    body: 'Members book here; managers also run the space. Front-desk staff use the separate kiosk app to mark arrivals.',
  },
] as const;

/** The signed-out landing page with three short explanations and the sign-in panel. */
export function SignInLanding() {
  useDocumentTitle('Sign in');
  return (
    <div className="k-shell">
      <AppHeader product="Book a machine" homeHref="/" />
      <main className="k-main k-survey member-landing" id="main">
        <div className="k-stack">
          <p className="member-eyebrow">Larkspur Commons · makerspaces</p>
          <h1 className="member-hero">Book the laser cutter without the clipboard.</h1>
          <p className="k-muted member-lede">
            Booking Kiosk is a booking system shared by several community makerspaces. It is a demo:
            the people and places are fictional.
          </p>
          <ul className="member-points">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="k-card">
                <Icon size={22} aria-hidden="true" className="member-point-icon" />
                <h2>{title}</h2>
                <p className="k-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
        <SignInPanel
          heading="Sign in"
          intro={
            <p>
              Try a member account to book, or the manager account to see the management pages.
              Staff use the kiosk app (port 5174).
            </p>
          }
          demoAccounts={[
            { label: 'Sam (member)', email: 'sam@example.com' },
            { label: 'Robin (manager)', email: 'robin@example.com' },
          ]}
        />
      </main>
    </div>
  );
}
