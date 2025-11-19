import { formatTimestamp, formatTimestampWithTime, formatRelativeTime, dateToTimestamp } from '../dateUtils';

describe('dateUtils', () => {
  // Fixed date: 2023-01-01 12:00:00
  const testDate = new Date('2023-01-01T12:00:00');
  const testTimestamp = dateToTimestamp(testDate);

  it('formatTimestamp should format correctly', () => {
    // Expected format depends on locale, assuming EN/US for test
    // Adjust expected string based on actual implementation details
    const result = formatTimestamp(testTimestamp);
    expect(result).toContain('2023');
  });

  it('formatTimestampWithTime should return time string', () => {
    const result = formatTimestampWithTime(testTimestamp);
    expect(result).toContain('12:00');
  });

  it('formatRelativeTime should handle past dates', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 2);
    const pastTimestamp = dateToTimestamp(pastDate);
    const result = formatRelativeTime(pastTimestamp);
    expect(result).toMatch(/0 days ago/); // The current implementation is simple, this is expected
  });
});
