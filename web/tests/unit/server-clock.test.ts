import { ApolloLink, gql } from '@apollo/client';
import {
  recordServerTime,
  serverClockLink,
  serverClockMeasuredAt,
  serverClockOffset,
  subscribeToServerClock,
} from '@booking-kiosk/api';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('server clock', () => {
  beforeEach(() => {
    recordServerTime(new Date(1_000).toISOString(), 1_000);
  });

  it('measures the offset against the moment a response arrives', () => {
    recordServerTime('2026-03-11T13:02:00Z', Date.parse('2026-03-11T13:00:00Z'));
    expect(serverClockOffset()).toBe(120_000);
    expect(serverClockMeasuredAt()).toBe(Date.parse('2026-03-11T13:00:00Z'));
  });

  it('ignores a value that is not a time, keeping the last good offset', () => {
    recordServerTime('2026-03-11T13:00:05Z', Date.parse('2026-03-11T13:00:00Z'));
    recordServerTime('soon');
    expect(serverClockOffset()).toBe(5_000);
  });

  it('tells subscribers about each new offset until they unsubscribe', () => {
    const listener = vi.fn();
    const stop = subscribeToServerClock(listener);
    recordServerTime('2026-03-11T13:00:00Z');
    stop();
    recordServerTime('2026-03-11T13:00:00Z');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('records serverTime from results that pass through the link, and only those', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-11T13:00:00Z'));
    const network = (data: Record<string, unknown>) =>
      ApolloLink.from([serverClockLink, new ApolloLink(() => of({ data }))]);
    const request = { query: gql('query Test { serverTime }') };

    await firstValueFrom(
      ApolloLink.execute(network({ serverTime: '2026-03-11T13:00:30Z' }), request, {
        client: {} as never,
      }),
    );
    expect(serverClockOffset()).toBe(30_000);
    await firstValueFrom(
      ApolloLink.execute(network({ other: 1 }), request, { client: {} as never }),
    );
    expect(serverClockOffset()).toBe(30_000);
    vi.useRealTimers();
  });
});
