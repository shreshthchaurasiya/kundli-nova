/**
 * Utility to calculate numeric UTC offset float (e.g. 5.5 for IST, -4.0 for EDT)
 * for a given IANA timezone at a specific date and time using Node.js built-in Intl APIs.
 */
export function getUTCOffsetHours(timezone: string, dateStr: string, timeStr: string): number {
  try {
    // Standardize time string (HH:MM -> HH:MM:00)
    const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    const isoString = `${dateStr}T${normalizedTime}Z`; // Treat initial parse as UTC reference point
    const targetDate = new Date(isoString);

    if (isNaN(targetDate.getTime())) {
      throw new Error(`Invalid date/time format: ${dateStr} ${timeStr}`);
    }

    // Use Intl.DateTimeFormat to format the date in the specified IANA timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(targetDate);
    const getPart = (type: string) => {
      const part = parts.find((p) => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };

    // Construct local date components in target timezone
    const tzYear = getPart('year');
    const tzMonth = getPart('month') - 1; // 0-indexed
    const tzDay = getPart('day');
    const tzHour = getPart('hour') === 24 ? 0 : getPart('hour');
    const tzMin = getPart('minute');
    const tzSec = getPart('second');

    // Create UTC Date representation of local time in target timezone
    const localAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin, tzSec);
    const utcTime = targetDate.getTime();

    // Difference in milliseconds converted to hours
    const diffHours = (localAsUtc - utcTime) / (1000 * 60 * 60);

    // Round to 2 decimal places to prevent floating point noise (e.g., 5.5, -4, 5.75)
    return Math.round(diffHours * 100) / 100;
  } catch (error) {
    // If numeric offset string was passed directly (e.g., "5.5" or "+05:30"), parse it
    const parsedFloat = parseFloat(timezone);
    if (!isNaN(parsedFloat) && parsedFloat >= -14 && parsedFloat <= 14) {
      return parsedFloat;
    }
    throw new Error(`Invalid IANA timezone or offset: '${timezone}'`);
  }
}
