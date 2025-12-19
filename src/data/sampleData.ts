import type { Asset } from '../types';
import { DEFAULT_PERSON_IDS } from '../types';

// Sample data for demo purposes
export const SAMPLE_ASSETS: Asset[] = [
    {
        id: 'sample-1',
        name: 'Amundi MSCI World ETF',
        category: 'etf',
        ownerId: DEFAULT_PERSON_IDS.self,
        purchaseDate: '2023-01-15',
        purchaseAmount: 50000,
        currentValue: 62230,

        valueHistory: [
            { date: '2023-01-15', value: 50000 },
            { date: '2023-03-01', value: 51200 },
            { date: '2023-06-01', value: 54500 },
            { date: '2023-09-01', value: 52800 },
            { date: '2023-12-01', value: 56400 },
            { date: '2024-03-01', value: 58900 },
            { date: '2024-06-01', value: 57200 },
            { date: '2024-09-01', value: 60100 },
            { date: '2024-12-01', value: 62230 }
        ]
    },
    {
        id: 'sample-2',
        name: 'Bitcoin',
        category: 'crypto',
        ownerId: DEFAULT_PERSON_IDS.self,
        purchaseDate: '2022-06-20',
        purchaseAmount: 15000,
        currentValue: 18230,

        valueHistory: [
            { date: '2022-06-20', value: 15000 },
            { date: '2022-09-01', value: 12500 },
            { date: '2022-12-01', value: 10800 },
            { date: '2023-03-01', value: 14200 },
            { date: '2023-06-01', value: 16500 },
            { date: '2023-09-01', value: 15800 },
            { date: '2023-12-01', value: 19200 },
            { date: '2024-06-01', value: 17500 },
            { date: '2024-12-01', value: 18230 }
        ]
    },
    {
        id: 'sample-3',
        name: 'Apartment Krakow',
        category: 'real_estate',
        ownerId: DEFAULT_PERSON_IDS.self,
        purchaseDate: '2020-03-10',
        purchaseAmount: 450000,
        currentValue: 535800,

        valueHistory: [
            { date: '2020-03-10', value: 450000 },
            { date: '2021-01-01', value: 465000 },
            { date: '2022-01-01', value: 495000 },
            { date: '2023-01-01', value: 520000 },
            { date: '2024-01-01', value: 530000 },
            { date: '2024-12-01', value: 535800 }
        ]
    },
    {
        id: 'sample-4',
        name: 'Apple Inc.',
        category: 'stocks',
        ownerId: DEFAULT_PERSON_IDS.wife,
        purchaseDate: '2023-05-12',
        purchaseAmount: 8000,
        currentValue: 10530,

        valueHistory: [
            { date: '2023-05-12', value: 8000 },
            { date: '2023-08-01', value: 8800 },
            { date: '2023-11-01', value: 9200 },
            { date: '2024-02-01', value: 9800 },
            { date: '2024-05-01', value: 10100 },
            { date: '2024-08-01', value: 9900 },
            { date: '2024-12-01', value: 10530 }
        ]
    },
    {
        id: 'sample-5',
        name: 'Emergency Fund',
        category: 'cash',
        ownerId: DEFAULT_PERSON_IDS.self,
        purchaseDate: '2021-01-01',
        purchaseAmount: 25000,
        currentValue: 25000,

        valueHistory: [
            { date: '2021-01-01', value: 20000 },
            { date: '2022-01-01', value: 22000 },
            { date: '2023-01-01', value: 24000 },
            { date: '2024-01-01', value: 25000 },
            { date: '2024-12-01', value: 25000 }
        ]
    },
    {
        id: 'sample-6',
        name: 'Treasury Bonds',
        category: 'bonds',
        ownerId: DEFAULT_PERSON_IDS.wife,
        purchaseDate: '2022-09-01',
        purchaseAmount: 30000,
        currentValue: 33450,

        valueHistory: [
            { date: '2022-09-01', value: 30000 },
            { date: '2023-03-01', value: 30900 },
            { date: '2023-09-01', value: 31800 },
            { date: '2024-03-01', value: 32700 },
            { date: '2024-09-01', value: 33200 },
            { date: '2024-12-01', value: 33450 }
        ]
    },
    {
        id: 'sample-7',
        name: 'Education Savings',
        category: 'cash',
        ownerId: DEFAULT_PERSON_IDS.daughter,
        purchaseDate: '2019-06-15',
        purchaseAmount: 5000,
        currentValue: 12500,

        valueHistory: [
            { date: '2019-06-15', value: 5000 },
            { date: '2020-06-01', value: 6500 },
            { date: '2021-06-01', value: 8000 },
            { date: '2022-06-01', value: 9500 },
            { date: '2023-06-01', value: 11000 },
            { date: '2024-06-01', value: 12000 },
            { date: '2024-12-01', value: 12500 }
        ]
    },
    {
        id: 'sample-8',
        name: 'Ethereum',
        category: 'crypto',
        ownerId: DEFAULT_PERSON_IDS.daughter,
        purchaseDate: '2023-12-01',
        purchaseAmount: 2000,
        currentValue: 2580,

        valueHistory: [
            { date: '2023-12-01', value: 2000 },
            { date: '2024-03-01', value: 2800 },
            { date: '2024-06-01', value: 2400 },
            { date: '2024-09-01', value: 2200 },
            { date: '2024-12-01', value: 2580 }
        ]
    }
];
