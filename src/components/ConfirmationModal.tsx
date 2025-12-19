import React from 'react';
import ModalBase from './ModalBase';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDangerous = false
}: ConfirmationModalProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} title={title}>
            <div className={styles.content}>
                <div className={styles.message}>
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>
                <div className={styles.actions}>
                    <button type="button" className={styles.btnSecondary} onClick={onClose}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={isDangerous ? styles.btnDanger : styles.btnPrimary}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </ModalBase>
    );
}
