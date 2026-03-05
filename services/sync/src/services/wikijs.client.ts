import { wikijsUrl, wikijsApiToken } from '../config';
import { createLogger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import type {
    UpsertPageInput,
    WikiJsPageSingleByPathResult,
    WikiJsCreatePageResult,
    WikiJsUpdatePageResult,
    WikiJsGraphQLResponse,
} from '../types/wikijs.types';

const logger = createLogger('wikijs.client');

const GRAPHQL_URL = `${wikijsUrl}/graphql`;

async function graphqlRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    return withRetry(async () => {
        const response = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${wikijsApiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            const body = await response.text();
            throw Object.assign(new Error(`Wiki.js GraphQL HTTP error ${response.status}: ${body}`), {
                status: response.status,
            });
        }

        const json = (await response.json()) as WikiJsGraphQLResponse<T>;

        if (json.errors && json.errors.length > 0) {
            const messages = json.errors.map((e) => e.message).join('; ');
            throw new Error(`Wiki.js GraphQL errors: ${messages}`);
        }

        if (!json.data) {
            throw new Error('Wiki.js GraphQL returned no data');
        }

        return json.data;
    });
}

/**
 * Look up an existing Wiki.js page by path.
 * Returns null if not found.
 */
async function getPageByPath(path: string, locale = 'en'): Promise<{ id: number; path: string; title: string } | null> {
    const query = `
    query GetPageByPath($path: String!, $locale: String!) {
      pages {
        singleByPath(path: $path, locale: $locale) {
          id
          path
          title
        }
      }
    }
  `;

    try {
        const data = await graphqlRequest<WikiJsPageSingleByPathResult['data']>(query, { path, locale });
        return data.pages.singleByPath;
    } catch (error) {
        logger.warn('Failed to query Wiki.js page by path', {
            path,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

/**
 * Create a new Wiki.js page.
 */
async function createPage(input: UpsertPageInput): Promise<void> {
    const query = `
    mutation CreatePage(
      $content: String!
      $description: String!
      $editor: String!
      $isPublished: Boolean!
      $isPrivate: Boolean!
      $locale: String!
      $path: String!
      $tags: [String]!
      $title: String!
    ) {
      pages {
        create(
          content: $content
          description: $description
          editor: $editor
          isPublished: $isPublished
          isPrivate: $isPrivate
          locale: $locale
          path: $path
          tags: $tags
          title: $title
        ) {
          responseResult {
            succeeded
            errorCode
            slug
            message
          }
          page {
            id
            path
          }
        }
      }
    }
  `;

    const data = await graphqlRequest<WikiJsCreatePageResult['data']>(query, {
        content: input.content,
        description: input.description ?? '',
        editor: 'markdown',
        isPublished: true,
        isPrivate: false,
        locale: input.locale ?? 'en',
        path: input.path,
        tags: input.tags ?? [],
        title: input.title,
    });

    const result = data.pages.create.responseResult;
    if (!result.succeeded) {
        throw new Error(`Wiki.js create page failed: [${result.errorCode ?? 'unknown'}] ${result.message ?? 'no message'}`);
    }

    logger.info('Wiki.js page created', { path: input.path, title: input.title });
}

/**
 * Update an existing Wiki.js page by its integer ID.
 */
async function updatePage(id: number, input: UpsertPageInput): Promise<void> {
    const query = `
    mutation UpdatePage(
      $id: Int!
      $content: String!
      $description: String!
      $editor: String!
      $isPublished: Boolean!
      $isPrivate: Boolean!
      $tags: [String]!
      $title: String!
    ) {
      pages {
        update(
          id: $id
          content: $content
          description: $description
          editor: $editor
          isPublished: $isPublished
          isPrivate: $isPrivate
          tags: $tags
          title: $title
        ) {
          responseResult {
            succeeded
            errorCode
            slug
            message
          }
          page {
            id
            path
          }
        }
      }
    }
  `;

    const data = await graphqlRequest<WikiJsUpdatePageResult['data']>(query, {
        id,
        content: input.content,
        description: input.description ?? '',
        editor: 'markdown',
        isPublished: true,
        isPrivate: false,
        tags: input.tags ?? [],
        title: input.title,
    });

    const result = data.pages.update.responseResult;
    if (!result.succeeded) {
        throw new Error(`Wiki.js update page failed: [${result.errorCode ?? 'unknown'}] ${result.message ?? 'no message'}`);
    }

    logger.info('Wiki.js page updated', { id, path: input.path, title: input.title });
}

/**
 * Upsert a Wiki.js page: update if exists (by path), create if not.
 * Returns the action performed.
 */
export async function upsertPage(input: UpsertPageInput): Promise<'created' | 'updated'> {
    const existing = await getPageByPath(input.path, input.locale ?? 'en');

    if (existing !== null) {
        await updatePage(existing.id, input);
        return 'updated';
    } else {
        await createPage(input);
        return 'created';
    }
}
