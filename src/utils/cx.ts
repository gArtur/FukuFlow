/**
 * Tiny className composer for CSS Modules.
 *
 * Joins truthy class-name strings into one space-separated string, dropping
 * anything falsy. Lets stateful modifier classes be expressed declaratively
 * instead of hand-built template strings:
 *
 *   className={cx(styles.tab, isActive && styles.active)}
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}
