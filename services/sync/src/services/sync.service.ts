import { createLogger } from '../utils/logger';
import { fetchStrapiEntry } from './strapi.client';
import { upsertPage } from './wikijs.client';
import { isProcessed, markProcessed } from './cache.service';
import { publishEvent, sendToDLQ } from './event.publisher';
import { ObjectionTransformer } from '../transformers/objection.transformer';
import { DiscoveryQuestionTransformer } from '../transformers/discovery-question.transformer';
import { TalkTrackTransformer } from '../transformers/talk-track.transformer';
import { CaseStudyTransformer } from '../transformers/case-study.transformer';
import type {
    StrapiWebhookPayload,
    StrapiEntry,
    ObjectionEntry,
    DiscoveryQuestionEntry,
    TalkTrackEntry,
    CaseStudyEntry,
    StrapiModelName,
} from '../types/strapi.types';

const logger = createLogger('sync.service');

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

const SUPPORTED_MODELS = new Set<StrapiModelName>([
    'objection',
    'discovery-question',
    'talk-track',
    'case-study',
]);

function isSupportedModel(model: string): model is StrapiModelName {
    return SUPPORTED_MODELS.has(model as StrapiModelName);
}

/**
 * Process a Strapi webhook payload.
 * Handles entry.publish, entry.update events for supported models.
 * Idempotent: skips processing if the event key was already handled.
 */
export async function processWebhook(payload: StrapiWebhookPayload): Promise<void> {
    const { event, model, entry } = payload;

    // Only process publish/update events
    if (event !== 'entry.publish' && event !== 'entry.update') {
        logger.info('Ignoring non-publish/update event', { event, model });
        return;
    }

    // Skip unsupported content types
    if (!isSupportedModel(model)) {
        logger.info('Unsupported model, skipping sync', { model });
        publishEvent('sync.skipped', `sync.skipped.${model}`, {
            model,
            documentId: entry.documentId,
            reason: 'unsupported_model',
            idempotencyKey: '',
        });
        return;
    }

    const idempotencyKey = `sync:${model}:${entry.documentId}:${event}`;

    // Idempotency check
    const alreadyProcessed = await isProcessed(idempotencyKey);
    if (alreadyProcessed) {
        logger.info('Event already processed, skipping', { idempotencyKey });
        publishEvent('sync.skipped', `sync.skipped.${model}`, {
            model,
            documentId: entry.documentId,
            reason: 'already_processed',
            idempotencyKey,
        });
        return;
    }

    let fullEntry: StrapiEntry & Record<string, unknown>;
    try {
        fullEntry = await fetchStrapiEntry(model, entry.documentId);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to fetch full entry from Strapi', { model, documentId: entry.documentId, error: errorMsg });
        sendToDLQ({ model, documentId: entry.documentId, event }, errorMsg);
        publishEvent('sync.failed', `sync.failed.${model}`, {
            model,
            documentId: entry.documentId,
            error: errorMsg,
            retryCount: 0,
        });
        throw error;
    }

    let wikiPath: string;
    let wikiTitle: string;
    let wikiContent: string;

    try {
        const result = resolveTransformer(model, fullEntry);
        wikiPath = result.path;
        wikiTitle = result.title;
        wikiContent = result.content;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Transformer error', { model, documentId: entry.documentId, error: errorMsg });
        sendToDLQ({ model, documentId: entry.documentId, event }, errorMsg);
        throw error;
    }

    let action: 'created' | 'updated';
    try {
        action = await upsertPage({
            path: wikiPath,
            title: wikiTitle,
            content: wikiContent,
            description: `Auto-synced from Strapi: ${model} ${entry.documentId}`,
            tags: [model, 'auto-synced'],
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to upsert Wiki.js page', { wikiPath, model, error: errorMsg });
        sendToDLQ({ model, documentId: entry.documentId, event, wikiPath }, errorMsg);
        publishEvent('sync.failed', `sync.failed.${model}`, {
            model,
            documentId: entry.documentId,
            error: errorMsg,
            retryCount: 0,
        });
        throw error;
    }

    // Mark as processed in Redis
    await markProcessed(idempotencyKey, IDEMPOTENCY_TTL_SECONDS);

    // Publish success event
    publishEvent('sync.completed', `sync.completed.${model}`, {
        model,
        documentId: entry.documentId,
        wikiPath,
        action,
    });

    logger.info('Sync completed', { model, documentId: entry.documentId, wikiPath, action });
}

function resolveTransformer(
    model: StrapiModelName,
    entry: StrapiEntry & Record<string, unknown>,
): { path: string; title: string; content: string } {
    switch (model) {
        case 'objection': {
            const transformer = new ObjectionTransformer();
            const typed = entry as unknown as ObjectionEntry;
            return {
                path: transformer.getPagePath(typed),
                title: transformer.getPageTitle(typed),
                content: transformer.toMarkdown(typed),
            };
        }
        case 'discovery-question': {
            const transformer = new DiscoveryQuestionTransformer();
            const typed = entry as unknown as DiscoveryQuestionEntry;
            return {
                path: transformer.getPagePath(typed),
                title: transformer.getPageTitle(typed),
                content: transformer.toMarkdown(typed),
            };
        }
        case 'talk-track': {
            const transformer = new TalkTrackTransformer();
            const typed = entry as unknown as TalkTrackEntry;
            return {
                path: transformer.getPagePath(typed),
                title: transformer.getPageTitle(typed),
                content: transformer.toMarkdown(typed),
            };
        }
        case 'case-study': {
            const transformer = new CaseStudyTransformer();
            const typed = entry as unknown as CaseStudyEntry;
            return {
                path: transformer.getPagePath(typed),
                title: transformer.getPageTitle(typed),
                content: transformer.toMarkdown(typed),
            };
        }
        default: {
            const exhaustiveCheck: never = model;
            throw new Error(`No transformer found for model: ${exhaustiveCheck}`);
        }
    }
}
