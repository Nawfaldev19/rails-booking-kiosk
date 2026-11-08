# Getting started: your first booking

This tutorial takes you from a fresh clone to holding, confirming and checking a booking as a member, then marking the arrival at the front desk. It takes about fifteen minutes, most of it installing.

## 1. Start Booking Kiosk

With Docker:

```bash
docker compose up
```

Wait until the logs show the Vite servers ready (the first start installs gems and packages, which takes a few minutes).

Without Docker (Ruby 3.4, Node 22.12 or later, and Postgres 14 or later reachable through the `PG*` variables):

```bash
make setup   # creates and seeds the database, installs packages and Chromium
make dev     # API on :3300, member app on :5173, kiosk on :5174
```

**Expected:** <http://localhost:3300/up> answers with a 200 page, and <http://localhost:5173> shows "Book the laser cutter without the clipboard."

## 2. Sign in as a member

On <http://localhost:5173>, press **Sam (member)** under "Demo accounts".

**Expected:** the header shows "Sam Okafor", and the Book page lists the Larkspur Makerspace machines with today's slots. Slots that have started read "already started".

## 3. Hold a slot

1. In the day strip, press the second chip (tomorrow), where every slot is in the future.
2. Click a slot on **Laser cutter** whose label ends in "free".

**Expected:** a status message says the slot is held for 5 minutes, and the "Your holds" tray appears with a countdown and a focused **Confirm** button. The slot now reads "held by you".

## 4. Confirm it

Press **Confirm** in the tray.

**Expected:** the tray empties with a success message, the slot reads "booked by you", and a confirmation email is recorded in the outbox (in development it is also written to `api/tmp/mails`).

## 5. Find it in My bookings

Open **My bookings**.

**Expected:** the booking is listed under upcoming bookings with status "Confirmed" and a **Cancel** button. Leave it there for now.

## 6. See the manager's view

Sign out, then press **Robin (manager)**. Open **Outbox**.

**Expected:** the newest message is "You're booked on the Laser cutter, …" to `sam@example.com` (Larkspur's seeded template), with status Delivered. Open **Messages** to see and edit that template.

## 7. Mark an arrival at the front desk

Open <http://localhost:5174> and press **Jules (staff)**.

**Expected:** today's list for Larkspur Makerspace with an "arrived" progress count. Type `ines` in the search box. Ines has two bookings today, so each **Arrived** button names its machine and time; press the one for the Wood lathe. The count goes up by one and the entry moves to Arrived. Press **Undo** to put it back.

In development both apps share `localhost` cookies, so signing in on one port signs you in on the other.

## 8. Invite a team member (optional)

As Robin, open **Team**, enter a name and a new `@example.com` address, leave the password empty and press **Add to team**.

**Expected:** "Invitation sent to …", and the person is listed with "Invitation sent". In development the message, with its one-time link, is written to `api/tmp/mails/<address>`; open the link to choose a password as that person.

## Where next

- Reset the data: [how-to/reset-demo-data.md](../how-to/reset-demo-data.md)
- Run the checks: [how-to/run-the-tests.md](../how-to/run-the-tests.md)
- How double booking is prevented: [explanation/concurrency-and-holds.md](../explanation/concurrency-and-holds.md)
