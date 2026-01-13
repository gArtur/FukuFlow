import React from 'react';

interface ModalBaseProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Called when the modal should close (clicking overlay or close button) */
    onClose: () => void;
    /** Modal title displayed in the header */
    title: string;
    /** Modal content */
    children: React.ReactNode;
    /** Additional CSS class names for the modal container */
    className?: string;
    /** Whether the modal content uses a form (uses modal-form class) */
    isForm?: boolean;
}

/**
 * Base modal component providing consistent overlay, container, and header structure.
 *
 * @example
 * ```tsx
 * <ModalBase isOpen={isOpen} onClose={onClose} title="Add Item">
 *   <form className="modal-body" onSubmit={handleSubmit}>
 *     ...form content...
 *   </form>
 * </ModalBase>
 * ```
 */
export default function ModalBase({
    isOpen,
    onClose,
    title,
    children,
    className = '',
    isForm = false,
}: ModalBaseProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal ${className}`.trim()} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        type="button"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>
                {isForm ? <div className="modal-form">{children}</div> : children}
            </div>
        </div>
    );
}
