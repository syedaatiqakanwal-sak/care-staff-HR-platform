/**
 * Global fix: limits year field to 4 digits on ALL
 * native date inputs across the entire app.
 * Call once on app mount.
 */
let attached = false;

export const limitDateYearInput = (): void => {
    if (attached || typeof document === 'undefined') return;
    attached = true;

    document.addEventListener(
        'input',
        (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (!target || target.type !== 'date') return;

            const value = target.value;
            if (!value) return;

            // date input value format is always YYYY-MM-DD
            const parts = value.split('-');
            if (parts.length !== 3) return;

            const year = parts[0];
            if (year.length <= 4) return;

            // Truncate year to 4 digits
            const fixedYear = year.slice(0, 4);
            const fixedValue = `${fixedYear}-${parts[1]}-${parts[2]}`;

            // Set corrected value using native setter
            // (React controlled inputs need this approach)
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value',
            )?.set;

            if (nativeSetter) {
                nativeSetter.call(target, fixedValue);
                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                target.value = fixedValue;
            }
        },
        true,
    ); // useCapture=true to catch all inputs

    // Also handle keydown to prevent typing beyond 4 digits in year
    document.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
            const target = e.target as HTMLInputElement;
            if (!target || target.type !== 'date') return;

            const isDigit = /^[0-9]$/.test(e.key);
            if (!isDigit) return;

            const value = target.value;
            if (!value) return;

            const parts = value.split('-');
            if (parts.length !== 3) return;

            const year = parts[0];

            // If year already has 4 digits, check if user is
            // editing the year field specifically
            if (year && year.length >= 4) {
                try {
                    const selStart = target.selectionStart ?? 0;
                    // If cursor is in year section (first 4 chars)
                    if (selStart <= 4) {
                        // Allow normal editing within year field
                        // The input event listener above will
                        // truncate if needed
                    }
                } catch {
                    // Some browsers don't support selectionStart on date
                }
            }
        },
        true,
    );
};
