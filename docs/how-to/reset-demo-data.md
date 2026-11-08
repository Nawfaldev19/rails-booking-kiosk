# Reset the demo data

The seed data is fictional (two makerspaces, six people, every email at `example.com`, password `booking-kiosk-demo-pass`). To wipe and reseed the development database:

```bash
cd api && bin/rails db:seed:replant
```

With Docker Compose:

```bash
docker compose exec api bin/rails db:seed:replant
```

To drop the database and rebuild it from the schema, then seed it: `cd api && bin/rails db:reset`.

The end-to-end suite reseeds its own `booking_kiosk_e2e` database on every run, so it never touches your development data. The test database is never seeded; specs build exactly the records they need.

## Recapture the screenshots

The README shows four screenshots in `docs/assets/`, all taken at a device pixel ratio of 2 (each file stays under 400 KB):

| File | Window | Theme | State |
|---|---|---|---|
| `screenshot-member.png` | 1280 × 800 | light | Booking page, tomorrow chosen, one hold counting down |
| `screenshot-member-dark.png` | 1280 × 800 | dark | The same page and state |
| `screenshot-templates.png` | 1280 × 800 | light | Messages page (manager) |
| `screenshot-kiosk.png` | 390 × 844, phone | light | Front desk, Expected list |

1. Reseed as above and run the stack (`make dev`).
2. In the member app (<http://localhost:5173>) sign in as **Robin (manager)**, pick tomorrow in the day strip and confirm **3D printer A, 12:00**, **3D printer B, 10:30** and **3D printer B, 17:00**. Sign out.
3. Sign in as **Sam (member)**, pick tomorrow, confirm **3D printer A, 14:00** and **3D printer B, 09:00**, then click **3D printer B, 15:30** and leave it held.
4. Within the five minutes of the hold, save the booking page in light and in dark mode (the theme button cycles system, light and dark).
5. Sign in as Robin, open **Messages** and save `screenshot-templates.png`.
6. In the kiosk (<http://localhost:5174>) with a phone-sized window, press **Jules (staff)** and save `screenshot-kiosk.png`.
