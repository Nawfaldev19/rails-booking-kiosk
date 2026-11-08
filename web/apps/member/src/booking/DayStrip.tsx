// The strip of day buttons above the booking grid.
import { addDays, formatDay } from '@booking-kiosk/ui';

/**
 * Today and the following days up to the booking horizon, as toggle buttons.
 *
 * @remarks
 * Each chip is a native button with `aria-pressed`, inside a labelled group, so
 * the chosen day is announced without a custom widget.
 */
export function DayStrip({
  today,
  days,
  selected,
  onSelect,
}: {
  /** Today in the workspace's zone, `YYYY-MM-DD`. */
  today: string;
  /** How many chips to show (the workspace's `bookingHorizonDays`). */
  days: number;
  /** The chosen date, `YYYY-MM-DD`. */
  selected: string;
  /** Called with the date of the chip that was pressed. */
  onSelect: (date: string) => void;
}) {
  return (
    <div className="day-strip" role="group" aria-label="Choose a day">
      {Array.from({ length: days }, (_, i) => {
        const date = addDays(today, i);
        return (
          <button
            key={date}
            type="button"
            className="day-chip"
            aria-pressed={date === selected}
            onClick={() => {
              onSelect(date);
            }}
          >
            {i === 0 ? 'Today' : formatDay(date)}
          </button>
        );
      })}
    </div>
  );
}
