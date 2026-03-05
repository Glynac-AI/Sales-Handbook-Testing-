// =============================================================================
// Event Types for RabbitMQ messages
// =============================================================================

export type EventType =
    | 'sync.completed'
    | 'sync.skipped'
    | 'sync.failed'
    | 'page.created'
    | 'page.updated';

export interface EventEnvelope {
    event_id: string;
    event_type: EventType;
    timestamp: string; // ISO 8601
    source: 'sync-service';
    data: Record<string, unknown>;
}

export interface SyncCompletedEventData {
    model: string;
    documentId: string;
    wikiPath: string;
    action: 'created' | 'updated';
}

export interface SyncSkippedEventData {
    model: string;
    documentId: string;
    reason: 'already_processed' | 'unsupported_model';
    idempotencyKey: string;
}

export interface SyncFailedEventData {
    model: string;
    documentId: string;
    error: string;
    retryCount: number;
}
