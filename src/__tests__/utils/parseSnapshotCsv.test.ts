import { describe, it, expect } from 'vitest';
import { parseSnapshotCsv } from '../../utils/parseSnapshotCsv';

describe('parseSnapshotCsv', () => {
    it('parses a header row and ISO dates', () => {
        const csv = ['Date,Value,Invested,Notes', '2024-01-15,10000,5000,Initial deposit'].join(
            '\n'
        );
        const rows = parseSnapshotCsv(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].value).toBe(10000);
        expect(rows[0].investmentChange).toBe(5000);
        expect(rows[0].notes).toBe('Initial deposit');
        expect(rows[0].date.startsWith('2024-01-15')).toBe(true);
    });

    it('parses DD/MM/YYYY dates', () => {
        const rows = parseSnapshotCsv('15/02/2024,10500,0,Monthly update');
        expect(rows).toHaveLength(1);
        expect(rows[0].date.startsWith('2024-02-15')).toBe(true);
    });

    it('handles quoted fields containing commas', () => {
        const rows = parseSnapshotCsv('2024-03-15,11000,1000,"Added funds, again"');
        expect(rows).toHaveLength(1);
        expect(rows[0].notes).toBe('Added funds, again');
    });

    it('drops rows with value <= 0 (explicit behaviour)', () => {
        const csv = ['2024-01-01,0,0,zero', '2024-02-01,-5,0,negative', '2024-03-01,100,0,ok'].join(
            '\n'
        );
        const rows = parseSnapshotCsv(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].value).toBe(100);
    });

    it('drops rows with an unparseable date', () => {
        const csv = ['not-a-date,100,0,bad', '2024-03-01,200,0,good'].join('\n');
        const rows = parseSnapshotCsv(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].value).toBe(200);
    });

    it('returns an empty array for empty input', () => {
        expect(parseSnapshotCsv('')).toEqual([]);
        expect(parseSnapshotCsv('Date,Value,Invested,Notes')).toEqual([]);
    });
});
