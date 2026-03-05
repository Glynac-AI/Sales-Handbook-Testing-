import { createLogger } from './logger';

const logger = createLogger('retry');

interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
}

// Error codes that indicate transient network failures worth retrying
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);

function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code !== undefined && RETRYABLE_CODES.has(nodeError.code)) {
            return true;
        }
    }
    return false;
}

function isRetryableStatusCode(status: number): boolean {
    return status >= 500;
}

function calculateBackoffMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
    const exponential = baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponential + jitter, maxDelayMs);
}

/**
 * Retry an async operation with exponential backoff and jitter.
 * Throws immediately on 4xx HTTP errors (client errors are not retryable).
 * Retries on 5xx HTTP errors and transient network failures.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: unknown) {
            lastError = error;

            // Check if this is a non-retryable 4xx HTTP error
            if (
                error instanceof Error &&
                'status' in error &&
                typeof (error as { status: unknown }).status === 'number'
            ) {
                const status = (error as { status: number }).status;
                if (!isRetryableStatusCode(status)) {
                    logger.warn('Non-retryable HTTP error, throwing immediately', {
                        status,
                        attempt: attempt + 1,
                    });
                    throw error;
                }
            }

            // Check if this is a retryable network error
            const retryable = isRetryableError(error) ||
                (error instanceof Error && 'status' in error && isRetryableStatusCode((error as { status: number }).status));

            if (!retryable) {
                throw error;
            }

            if (attempt < maxAttempts - 1) {
                const delayMs = calculateBackoffMs(attempt, baseDelayMs, maxDelayMs);
                logger.warn(`Attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${Math.round(delayMs)}ms`, {
                    error: error instanceof Error ? error.message : String(error),
                    attempt: attempt + 1,
                    delayMs: Math.round(delayMs),
                });
                await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError;
}
