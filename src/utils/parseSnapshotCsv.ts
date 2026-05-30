export interface ParsedSnapshot {
    date: string;
    value: number;
    investmentChange: number;
    notes: string;
}

/**
 * Build a UTC-anchored Date from Y/M/D parts, or null if the calendar date is
 * invalid. Anchoring to UTC midnight keeps `toISOString()` on the same calendar
 * day regardless of the runner's timezone.
 */
function utcDate(year: string, month: string, day: string): Date | null {
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
    const date = new Date(iso);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse a flexible date string into a Date, or null if unparseable.
 * Supports ISO (YYYY-MM-DD), DD/MM/YYYY and DD-MM-YYYY. Parsing is explicit
 * (not locale-dependent) and UTC-anchored so a calendar date round-trips.
 */
function parseDateFlexible(dateStr: string): Date | null {
    if (!dateStr || !dateStr.trim()) return null;

    const cleaned = dateStr.trim();

    // ISO date (YYYY-MM-DD), optionally with a time component.
    const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        const date = utcDate(year, month, day);
        if (date) return date;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        const date = utcDate(year, month, day);
        if (date) return date;
    }

    return null;
}

/**
 * Parse CSV text into snapshot rows. Pure function (no DOM / network).
 *
 * Columns: Date, Value, Invested (investmentChange), Notes. An optional header
 * row is detected when the first line contains "date".
 *
 * Rows are intentionally dropped when:
 *   - the date is missing or unparseable, or
 *   - the value is <= 0 (a snapshot must record a positive total worth).
 * This drop is deliberate, not silent — see the `value > 0` test.
 */
export function parseSnapshotCsv(text: string): ParsedSnapshot[] {
    const lines = text.split('\n');
    // The first line is a header only when its first column is the literal
    // "date" label — not merely any line containing the substring "date"
    // (e.g. a notes field like "Monthly update").
    const firstCell = lines[0]?.split(',')[0]?.trim().toLowerCase();
    const hasHeader = firstCell === 'date';
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines
        .filter(line => {
            const trimmed = line.trim();
            // Skip empty lines or lines with only commas
            return trimmed && trimmed.replace(/,/g, '').length > 0;
        })
        .map(line => {
            // Handle quoted fields properly
            const parts: string[] = [];
            let current = '';
            let inQuotes = false;

            for (const char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    parts.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            parts.push(current.trim());

            const [dateStr, valueStr, investmentChangeStr, ...notesParts] = parts;
            const notes = notesParts.join(',').replace(/^"|"$/g, '').replace(/""/g, '"');

            const parsedDate = parseDateFlexible(dateStr);

            return {
                date: parsedDate ? parsedDate.toISOString() : '',
                value: parseFloat(valueStr) || 0,
                investmentChange: parseFloat(investmentChangeStr) || 0,
                notes: notes || '',
            };
        })
        .filter(s => {
            // Drop entries with invalid dates or a non-positive value.
            return s.date && !isNaN(new Date(s.date).getTime()) && s.value > 0;
        });
}
