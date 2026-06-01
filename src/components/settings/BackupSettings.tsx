import { ApiClient } from '../../lib/apiClient';
import { toast } from 'react-hot-toast';
import { getTodayString } from '../../utils';
import styles from './Settings.module.css';

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
            a.download = `FukuFlow-backup-${getTodayString()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Backup downloaded successfully');
        } catch (error) {
            console.error('Backup failed:', error);
            toast.error('Backup failed');
        }
    };

    return (
        <section id="backup" className={styles.settingsSection}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderLeft}>
                    <h2 className={styles.sectionTitle}>Backup</h2>
                </div>
            </div>
            <div className={styles.settingsGroupCard}>
                <div className={styles.dataRow}>
                    <div className={styles.dataBlock}>
                        <div className={styles.dataBlockInfo}>
                            <h3>Backup Data</h3>
                            <p>Download a JSON file of your portfolio.</p>
                        </div>
                        <button
                            onClick={handleBackup}
                            className={styles.btnDataAction}
                            data-testid="backup-download-btn"
                        >
                            Backup Data
                            <span className={styles.iconRight}>↓</span>
                        </button>
                    </div>

                    <div className={styles.dataBlock}>
                        <div className={styles.dataBlockInfo}>
                            <h3>Restore Data</h3>
                            <p>Overwrite current data with a backup file.</p>
                        </div>
                        <button
                            onClick={onShowRestoreModal}
                            className={styles.btnDataAction}
                            data-testid="restore-data-btn"
                        >
                            Restore Data
                            <span className={styles.iconRight}>↑</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
