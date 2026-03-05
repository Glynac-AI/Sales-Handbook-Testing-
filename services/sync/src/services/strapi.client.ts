import { strapiUrl, strapiApiToken } from '../config';
import { createLogger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import type { StrapiResponse, StrapiEntry } from '../types/strapi.types';
import { STRAPI_PLURAL_NAMES, type StrapiModelName } from '../types/strapi.types';

const logger = createLogger('strapi.client');

class HttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

/**
 * Fetch a full Strapi 5 entry by documentId with all relations populated.
 * Uses native fetch() (Node 22). Response is FLAT (no .attributes wrapper).
 */
export async function fetchStrapiEntry<T extends StrapiEntry>(
    model: StrapiModelName,
    documentId: string,
): Promise<T> {
    const pluralName = STRAPI_PLURAL_NAMES[model];
    const url = `${strapiUrl}/api/${pluralName}/${documentId}?populate=*`;

    return withRetry(
        async () => {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${strapiApiToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const body = await response.text();
                const error = new HttpError(
                    response.status,
                    `Strapi responded ${response.status} for ${url}: ${body}`,
                );
                logger.error('Strapi fetch failed', {
                    status: response.status,
                    url,
                    model,
                    documentId,
                });
                throw error;
            }

            const json = (await response.json()) as StrapiResponse<T>;

            if (!json.data) {
                throw new Error(`Strapi returned empty data for ${model}/${documentId}`);
            }

            return json.data;
        },
        { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
    );
}
