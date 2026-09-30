#!/usr/bin/env node
/**
 * fetch-launches.mjs
 * Fetches upcoming and recent previous global rocket launches from Launch Library 2 (The Space Devs API).
 * Transforms and caches the result to src/data/launches.json.
 * No API key required for low-frequency queries.
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = resolve(__dirname, '../src/data/launches.json');

// Up to 35 upcoming launches (~90+ days of spaceflight activity)
const UPCOMING_URL = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=35';
// Last 15 completed launches
const PREVIOUS_URL = 'https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=15';

function mapPayloadTag(missionType = '', description = '') {
  const typeLower = missionType.toLowerCase();
  const descLower = description.toLowerCase();

  if (typeLower.includes('human') || descLower.includes('astronaut') || descLower.includes('crewed')) {
    return { tag: 'CREWED', label: 'Crewed / Astronauts', icon: '🧑‍🚀' };
  }
  if (typeLower.includes('rideshare') || descLower.includes('cubesat') || descLower.includes('microsatellite') || descLower.includes('nanosatellite')) {
    return { tag: 'RIDESHARE', label: 'Rideshare / Smallsats', icon: '🛰️' };
  }
  if (typeLower.includes('science') || typeLower.includes('astrophysics') || typeLower.includes('planetary') || descLower.includes('rover') || descLower.includes('sample')) {
    return { tag: 'SCIENCE', label: 'Deep Space / Science', icon: '🔭' };
  }
  if (typeLower.includes('secret') || typeLower.includes('government') || descLower.includes('reconnaissance') || descLower.includes('space force')) {
    return { tag: 'DEFENSE', label: 'Gov / Defense', icon: '🛡️' };
  }
  if (typeLower.includes('communications') || descLower.includes('starlink') || descLower.includes('broadband') || descLower.includes('constellation')) {
    return { tag: 'COMMS', label: 'Communications / Constellation', icon: '📡' };
  }
  if (typeLower.includes('resupply') || descLower.includes('cargo') || descLower.includes('iss')) {
    return { tag: 'RESUPPLY', label: 'Space Station Cargo', icon: '📦' };
  }
  if (typeLower.includes('test')) {
    return { tag: 'TEST_FLIGHT', label: 'Test Flight', icon: '🧪' };
  }
  return { tag: 'PAYLOAD', label: missionType || 'General Payload', icon: '🚀' };
}

function transformLaunch(item, isPast = false) {
  const missionDesc = item.mission?.description || 'No mission description provided.';
  const missionType = item.mission?.type || 'General Mission';
  const payloadTag = mapPayloadTag(missionType, missionDesc);

  return {
    id: item.id,
    name: item.name,
    isPast,
    status: {
      id: item.status?.id,
      name: item.status?.name || (isPast ? 'Completed' : 'TBD'),
      abbrev: item.status?.abbrev || (isPast ? 'Done' : 'TBD'),
      description: item.status?.description || ''
    },
    net: item.net,
    windowStart: item.window_start || item.net,
    windowEnd: item.window_end || item.net,
    rocket: {
      name: item.rocket?.configuration?.name || 'Unknown Rocket',
      family: item.rocket?.configuration?.family || ''
    },
    agency: {
      name: item.launch_service_provider?.name || 'Unknown Provider',
      type: item.launch_service_provider?.type?.name || 'Commercial'
    },
    pad: {
      name: item.pad?.name || 'Unknown Pad',
      location: item.pad?.location?.name || 'Unknown Location',
      country: item.pad?.country?.name || '',
      latitude: item.pad?.latitude || null,
      longitude: item.pad?.longitude || null,
      timezone: item.pad?.location?.timezone_name || 'UTC'
    },
    mission: {
      name: item.mission?.name || item.name,
      type: missionType,
      description: missionDesc,
      orbit: item.mission?.orbit?.name || 'Orbital'
    },
    payloadTag,
    image: item.image?.thumbnail_url || item.image?.image_url || null,
    webcastUrl: item.vid_urls && item.vid_urls.length > 0 ? item.vid_urls[0].url : null,
    fetchedAt: new Date().toISOString()
  };
}

async function fetchLaunches() {
  console.log('[fetch-launches] Querying Launch Library 2 for upcoming & previous launches...');

  const headers = {
    'User-Agent': 'PaperTrail-LaunchRadar/1.0 (+https://github.com/Karan-bhandari/paper-trail)'
  };
  const signal = AbortSignal.timeout(10000);

  const [upcomingRes, previousRes] = await Promise.all([
    fetch(UPCOMING_URL, { headers, signal }),
    fetch(PREVIOUS_URL, { headers, signal })
  ]);

  if (!upcomingRes.ok) {
    throw new Error(`Failed to fetch upcoming launches: HTTP ${upcomingRes.status} ${upcomingRes.statusText}`);
  }
  if (!previousRes.ok) {
    throw new Error(`Failed to fetch previous launches: HTTP ${previousRes.status} ${previousRes.statusText}`);
  }

  const [upcomingData, previousData] = await Promise.all([
    upcomingRes.json(),
    previousRes.json()
  ]);

  const upcoming = (upcomingData.results || []).map((item) => transformLaunch(item, false));
  const previous = (previousData.results || []).map((item) => transformLaunch(item, true));

  const payload = {
    updatedAt: new Date().toISOString(),
    count: upcoming.length,
    upcomingCount: upcoming.length,
    previousCount: previous.length,
    launches: upcoming, // backwards compatibility
    upcoming,
    previous
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  console.log(`[fetch-launches] Saved ${upcoming.length} upcoming and ${previous.length} previous launches to ${OUTPUT_FILE}`);
}

fetchLaunches().catch((err) => {
  console.warn(`[fetch-launches] Warning: Could not fetch fresh launches: ${err.message}`);
  console.warn('[fetch-launches] Preserving existing cached launches.json snapshot.');
  // Exit cleanly so GitHub Actions or local builds proceed with existing data
  process.exit(0);
});
