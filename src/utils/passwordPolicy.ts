/**
 * Password policy for first-run setup. Mirrors the backend Joi rule in
 * server/validation/schemas.js (authSetup): min 12, max 128, and at least one
 * lowercase letter, one uppercase letter, and one number. Keeping the rule here
 * lets the client guide the user before the request is ever sent.
 */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordChecks {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
}

export function getPasswordChecks(password: string): PasswordChecks {
    return {
        length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
    };
}

export function isPasswordValid(password: string): boolean {
    const checks = getPasswordChecks(password);
    return checks.length && checks.uppercase && checks.lowercase && checks.number;
}
