import { describe, it, expect } from 'vitest';
import launchesData from '../src/data/launches.json';

describe('Launch Radar Data', () => {
  it('validates upcoming launches schema and fields', () => {
    expect(launchesData.upcoming).toBeDefined();
    expect(launchesData.upcoming.length).toBeGreaterThan(0);

    for (const launch of launchesData.upcoming) {
      expect(launch.id).toBeTruthy();
      expect(launch.name).toBeTruthy();
      expect(launch.status?.name).toBeTruthy();
      expect(launch.net).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(launch.rocket?.name).toBeTruthy();
      expect(launch.agency?.name).toBeTruthy();
      expect(launch.pad?.name).toBeTruthy();
      expect(launch.pad?.location).toBeTruthy();
      expect(launch.pad?.timezone).toBeTruthy();
      expect(launch.mission?.name).toBeTruthy();
      expect(launch.payloadTag?.tag).toBeTruthy();
      expect(launch.payloadTag?.label).toBeTruthy();
    }
  });

  it('validates previous completed launches schema and outcomes', () => {
    expect(launchesData.previous).toBeDefined();
    expect(launchesData.previous.length).toBeGreaterThan(0);

    for (const launch of launchesData.previous) {
      expect(launch.id).toBeTruthy();
      expect(launch.name).toBeTruthy();
      expect(launch.isPast).toBe(true);
      expect(launch.status?.name).toBeTruthy();
      expect(launch.net).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(launch.rocket?.name).toBeTruthy();
      expect(launch.agency?.name).toBeTruthy();
      expect(launch.pad?.timezone).toBeTruthy();
    }
  });

  it('checks that pad timezones can be parsed by Intl.DateTimeFormat for all launches', () => {
    const all = [...(launchesData.upcoming || []), ...(launchesData.previous || [])];
    for (const launch of all) {
      expect(() => {
        new Intl.DateTimeFormat('en-US', {
          timeZone: launch.pad.timezone,
        }).format(new Date(launch.net));
      }).not.toThrow();
    }
  });
});
