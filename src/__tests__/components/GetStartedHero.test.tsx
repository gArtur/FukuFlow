import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GetStartedHero from '../../components/GetStartedHero';

describe('GetStartedHero', () => {
    it('triggers onGetStarted from the primary button', () => {
        const onGetStarted = vi.fn();
        render(<GetStartedHero onGetStarted={onGetStarted} onDismiss={vi.fn()} />);
        fireEvent.click(screen.getByTestId('get-started-btn'));
        expect(onGetStarted).toHaveBeenCalledTimes(1);
    });

    it('triggers onDismiss from the dismiss (×) control', () => {
        const onDismiss = vi.fn();
        render(<GetStartedHero onGetStarted={vi.fn()} onDismiss={onDismiss} />);
        fireEvent.click(screen.getByTestId('get-started-dismiss'));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('triggers onDismiss from the "I\'ll do this later" link', () => {
        const onDismiss = vi.fn();
        render(<GetStartedHero onGetStarted={vi.fn()} onDismiss={onDismiss} />);
        fireEvent.click(screen.getByText(/do this later/i));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
