import { ApiClient } from '../../lib/apiClient';

interface BackupSettingsProps {
    onShowRestoreModal: () => void;
}

export default function BackupSettings({ onShowRestoreModal }: BackupSettingsProps) {
    const handleBackup = async () => {
        try {
            const blob = await ApiClient.getBackup();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wealth-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Backup failed:', error);
            alert('Backup failed');
        }
    };

    return (
        <section id="data" className="settings-section">
            <div className="movers-header">
                <div className="movers-header-left">
                    <h2 className="movers-title">Backup</h2>
                </div>
            </div>
            <div className="settings-group-card">
                <div className="data-row">
                    <div className="data-block">
                        <div className="data-block-info">
                            <h3>Backup Data</h3>
                            <p>Download a JSON file of your portfolio.</p>
                        </div>
                        <button onClick={handleBackup} className="btn-data-action">
                            Backup Data
                            <span className="icon-right">↓</span>
                        </button>
                    </div>

                    <div className="data-block">
                        <div className="data-block-info">
                            <h3>Restore Data</h3>
                            <p>Overwrite current data with a backup file.</p>
                        </div>
                        <button onClick={onShowRestoreModal} className="btn-data-action">
                            Restore Data
                            <span className="icon-right">↑</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
