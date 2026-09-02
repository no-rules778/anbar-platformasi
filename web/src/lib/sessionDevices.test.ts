import { describe, it, expect } from 'vitest'
import { deviceLabel, isCurrentDevice, formatLastSeen, formatSince, shortDeviceId } from './sessionDevices'
import type { SessionDevice } from '../api/session.api'

/* The fixture below is the EXACT shape SQL 026's register_session() builds:
   jsonb_build_object('device_id', device_id, 'label', device_label,
                      'since', created_at, 'last_seen', updated_at)
   — verified against the live function definition. A regression that
   renames these keys (e.g. back to device_label/started_at) must fail here. */
const serverDevice: SessionDevice = {
  device_id: 'dev_abc123def456ghi',
  label: 'Chrome · Windows',
  since: '2026-09-02T08:00:00+00:00',
  last_seen: '2026-09-02T09:00:00+00:00',
}

describe('deviceLabel', () => {
  it('uses the server-sent label', () => {
    expect(deviceLabel(serverDevice)).toBe('Chrome · Windows')
  })
  it('falls back to "Naməlum cihaz" when the label is null', () => {
    expect(deviceLabel({ ...serverDevice, label: null })).toBe('Naməlum cihaz')
  })
  it('falls back when the label is an empty string', () => {
    expect(deviceLabel({ ...serverDevice, label: '' })).toBe('Naməlum cihaz')
  })
})

describe('isCurrentDevice', () => {
  it('is true only for the caller´s own device id', () => {
    expect(isCurrentDevice(serverDevice, 'dev_abc123def456ghi')).toBe(true)
    expect(isCurrentDevice(serverDevice, 'dev_other')).toBe(false)
  })
})

describe('formatLastSeen', () => {
  const now = new Date('2026-09-02T09:00:00+00:00').getTime()
  it('shows "indi" under two minutes', () => {
    expect(formatLastSeen('2026-09-02T08:59:30+00:00', now)).toBe('indi')
  })
  it('shows minutes elapsed from two minutes on', () => {
    expect(formatLastSeen('2026-09-02T08:55:00+00:00', now)).toBe('5 dəq əvvəl')
  })
  it('never goes negative for a clock skew into the future', () => {
    expect(formatLastSeen('2026-09-02T09:30:00+00:00', now)).toBe('indi')
  })
  it('returns "—" for missing or unparseable values', () => {
    expect(formatLastSeen(null, now)).toBe('—')
    expect(formatLastSeen(undefined, now)).toBe('—')
    expect(formatLastSeen('not-a-date', now)).toBe('—')
  })
})

describe('formatSince', () => {
  it('returns "—" when the server sent no start time', () => {
    expect(formatSince(null)).toBe('—')
    expect(formatSince('not-a-date')).toBe('—')
  })
  it('renders a real timestamp', () => {
    expect(formatSince(serverDevice.since)).not.toBe('—')
  })
})

describe('shortDeviceId', () => {
  it('truncates to 12 characters like the original', () => {
    expect(shortDeviceId('dev_abc123def456ghi')).toBe('dev_abc123de')
  })
  it('tolerates null/undefined', () => {
    expect(shortDeviceId(null)).toBe('')
    expect(shortDeviceId(undefined)).toBe('')
  })
})
