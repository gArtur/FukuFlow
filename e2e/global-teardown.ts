import * as fs from 'fs';
import * as path from 'path';

export default async function globalTeardown() {
    // Delete auth state file
    const authState = path.join(__dirname, '.auth', 'state.json');
    if (fs.existsSync(authState)) {
        fs.unlinkSync(authState);
    }

    // Delete E2E test database (relative to server/ directory)
    const dbPath = path.join(__dirname, '..', 'server', 'db', 'e2e-test.db');
    try {
        fs.rmSync(dbPath, { force: true });
    } catch {
        // File may already be deleted or still locked by the OS
    }
}
