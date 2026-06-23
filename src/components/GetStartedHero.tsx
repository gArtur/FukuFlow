interface GetStartedHeroProps {
    /** Open the guided setup wizard. */
    onGetStarted: () => void;
    /** Permanently hide this prompt (the dashboard shows normally afterwards). */
    onDismiss: () => void;
}

/**
 * Prominent first-run welcome shown on the dashboard while the portfolio is
 * empty. Replaces the empty charts with a single clear call to action, can be
 * dismissed, and disappears on its own once the first investment is added.
 */
export default function GetStartedHero({ onGetStarted, onDismiss }: GetStartedHeroProps) {
    return (
        <section className="get-started-hero" data-testid="get-started-hero">
            <button
                className="get-started-dismiss"
                onClick={onDismiss}
                aria-label="Dismiss getting started"
                data-testid="get-started-dismiss"
            >
                ×
            </button>
            <img src="/logo.svg" alt="" className="get-started-logo" />
            <h2 className="get-started-title">Welcome to FukuFlow</h2>
            <p className="get-started-text">
                Track your investments and watch your wealth grow over time. Let&apos;s add your
                first one - it only takes a minute.
            </p>
            <button className="get-started-btn" onClick={onGetStarted} data-testid="get-started-btn">
                Get Started
            </button>
            <button className="get-started-later" onClick={onDismiss}>
                I&apos;ll do this later
            </button>
        </section>
    );
}
