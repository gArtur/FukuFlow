import { useState } from 'react';
import { ApiClient } from '../lib/apiClient';

interface MigrationToolProps {
    onComplete: () => void;
}

export default function MigrationTool({ onComplete }: MigrationToolProps) {
    const [isMigrating, setIsMigrating] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleMigration = async () => {
        setIsMigrating(true);
        setStatus('Starting migration...');

        try {
            // 1. Get persons from localStorage
            const storedPersons = localStorage.getItem('wealth-persons');
            if (storedPersons) {
                const persons = JSON.parse(storedPersons);
                setStatus(`Migrating ${persons.length} persons...`);
                for (const person of persons) {
                    await ApiClient.addPerson(person.name);
                }
            }

            // 2. Get assets from localStorage
            const storedAssets = localStorage.getItem('wealth-portfolio');
            if (storedAssets) {
                const assets = JSON.parse(storedAssets);
                setStatus(`Migrating ${assets.length} assets...`);
                for (const asset of assets) {
                    // Remove id to let backend generate a new one or keep it
                    // Actually, backend accepts id if provided
                    await ApiClient.addAsset(asset);
                }
            }

            setStatus('Migration complete! Cleaning up local data...');
            // Optional: localStorage.clear();
            // Better to keep it for safety but rename keys
            localStorage.setItem('wealth-persons-backup', storedPersons || '');
            localStorage.setItem('wealth-portfolio-backup', storedAssets || '');
            localStorage.removeItem('wealth-persons');
            localStorage.removeItem('wealth-portfolio');

            setStatus('Success!');
            setTimeout(onComplete, 1500);
        } catch (error) {
            console.error('Migration failed:', error);
            setStatus('Error during migration. Check console.');
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div
            style={{
                padding: '20px',
                background: 'var(--card-bg)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                marginTop: '20px',
                textAlign: 'center',
            }}
        >
            <h3>Migrate Data to Database</h3>
            <p>
                We found existing data in your browser. Would you like to migrate it to the new
                central database?
            </p>
            {status && <p style={{ color: 'var(--accent-color)' }}>{status}</p>}
            <button onClick={handleMigration} disabled={isMigrating} className="btn-primary">
                {isMigrating ? 'Migrating...' : 'Start Migration'}
            </button>
        </div>
    );
}
