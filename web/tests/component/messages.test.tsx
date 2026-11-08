import { messagePreviewQuery, messageTemplatesQuery } from '@booking-kiosk/api';
import { describe, expect, it } from 'vitest';
import { MessagesPage } from '../../apps/member/src/manage/MessagesPage';
import { managerWorkspace } from './data';
import { always, renderPage } from './render';

const template = {
  __typename: 'MessageTemplate' as const,
  kind: 'BOOKING_CONFIRMED' as const,
  subject: 'Booked {{ member.secret }}',
  body: 'See you',
  customised: true,
};

describe('MessagesPage', () => {
  it('links both fields to the list of problems, and blocks saving', async () => {
    const screen = await renderPage(<MessagesPage />, {
      outletContext: { workspace: managerWorkspace },
      mocks: [
        always({
          request: { query: messageTemplatesQuery, variables: { slug: 'larkspur' } },
          result: {
            data: {
              workspace: {
                __typename: 'Workspace' as const,
                id: 'w1',
                messageTemplates: [template],
              },
            },
          },
        }),
        always({
          request: {
            query: messagePreviewQuery,
            variables: {
              slug: 'larkspur',
              kind: 'BOOKING_CONFIRMED',
              subject: template.subject,
              body: template.body,
            },
          },
          result: {
            data: {
              workspace: {
                __typename: 'Workspace' as const,
                id: 'w1',
                messagePreview: {
                  __typename: 'MessagePreview' as const,
                  subject: 'Booked: Laser cutter',
                  body: 'Default',
                  problems: ['undefined variable secret'],
                },
              },
            },
          },
        }),
      ],
    });
    const subject = screen.getByLabelText('Subject');
    await expect.element(subject).toHaveAttribute('aria-invalid', 'true');
    await expect.element(subject).toHaveAccessibleDescription(/undefined variable secret/);
    await expect
      .element(screen.getByLabelText('Body'))
      .toHaveAccessibleDescription(/undefined variable secret/);
    await expect.element(screen.getByRole('button', { name: 'Save template' })).toBeDisabled();
    expect(document.title).toBe('Messages · Larkspur Makerspace · Booking Kiosk');
  });
});
