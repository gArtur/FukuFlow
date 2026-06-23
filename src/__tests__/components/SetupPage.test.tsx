import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetupPage from '../../components/SetupPage';

const setupMock = vi.fn().mockResolvedValue({ success: true });
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ setup: setupMock }),
}));

describe('SetupPage', () => {
    beforeEach(() => setupMock.mockClear());

    it('keeps submit disabled for a weak password', () => {
        render(<SetupPage />);
        const submit = screen.getByTestId('setup-submit');
        expect(submit).toBeDisabled();

        fireEvent.change(screen.getByTestId('setup-password'), { target: { value: 'short' } });
        fireEvent.change(screen.getByTestId('setup-confirm-password'), {
            target: { value: 'short' },
        });
        expect(submit).toBeDisabled();
    });

    it('marks all requirements met and enables submit for a valid matching password', () => {
        render(<SetupPage />);
        fireEvent.change(screen.getByTestId('setup-password'), {
            target: { value: 'TestPass1234' },
        });

        // The four policy requirements all tick green ("met").
        const requirements = screen.getAllByRole('listitem');
        expect(requirements).toHaveLength(4);
        requirements.forEach(li => expect(li.className).toContain('met'));

        const submit = screen.getByTestId('setup-submit');
        expect(submit).toBeDisabled(); // confirm not entered yet
        fireEvent.change(screen.getByTestId('setup-confirm-password'), {
            target: { value: 'TestPass1234' },
        });
        expect(submit).toBeEnabled();
    });

    it('calls setup with the password on submit', () => {
        render(<SetupPage />);
        fireEvent.change(screen.getByTestId('setup-password'), {
            target: { value: 'TestPass1234' },
        });
        fireEvent.change(screen.getByTestId('setup-confirm-password'), {
            target: { value: 'TestPass1234' },
        });
        fireEvent.submit(screen.getByTestId('setup-form'));
        expect(setupMock).toHaveBeenCalledWith('TestPass1234');
    });
});
