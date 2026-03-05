// =============================================================================
// Strapi 5 Type Definitions
// Strapi 5 uses FLAT response format: response.data.name NOT .attributes.name
// =============================================================================

export interface StrapiResponse<T> {
    data: T;
    meta: StrapiMeta;
}

export interface StrapiMeta {
    pagination?: {
        page: number;
        pageSize: number;
        pageCount: number;
        total: number;
    };
}

// Base entry — all Strapi 5 entries have these fields
export interface StrapiEntry {
    id: number;
    documentId: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    locale: string | null;
}

// Webhook payload from Strapi 5
export interface StrapiWebhookPayload {
    event: 'entry.create' | 'entry.update' | 'entry.publish' | 'entry.unpublish' | 'entry.delete';
    createdAt: string;
    model: string;
    uid: string;
    entry: StrapiEntry & Record<string, unknown>;
}

// Strapi 5 model name → API plural name map
export type StrapiModelName =
    | 'objection'
    | 'discovery-question'
    | 'talk-track'
    | 'case-study'
    | 'product'
    | 'persona'
    | 'use-case'
    | 'proof-point'
    | 'asset';

export const STRAPI_PLURAL_NAMES: Record<StrapiModelName, string> = {
    objection: 'objections',
    'discovery-question': 'discovery-questions',
    'talk-track': 'talk-tracks',
    'case-study': 'case-studies',
    product: 'products',
    persona: 'personas',
    'use-case': 'use-cases',
    'proof-point': 'proof-points',
    asset: 'assets',
};

// Specific entry shapes (Strapi 5 flat format)
export interface ProductEntry extends StrapiEntry {
    name: string;
    description: string | null;
    positioning: string | null;
    key_features: unknown[] | null;
}

export interface PersonaEntry extends StrapiEntry {
    name: string;
    description: string | null;
    key_concerns: unknown[] | null;
    decision_criteria: string | null;
}

export interface ObjectionEntry extends StrapiEntry {
    objection_text: string;
    root_cause: string | null;
    response_script: string | null;
    do_not_say: string[] | null;
    stage: 'prospecting' | 'discovery' | 'proposal' | 'negotiation' | 'close' | null;
    effectiveness_score: number;
    last_used: string | null;
    related_product: ProductEntry | null;
    related_persona: PersonaEntry | null;
    proof_points: ProofPointEntry[] | null;
}

export interface DiscoveryQuestionEntry extends StrapiEntry {
    question: string;
    intent: string | null;
    why_ask: string | null;
    follow_up_questions: string[] | null;
    signals_to_listen_for: string[] | null;
    stage: 'prospecting' | 'discovery' | 'proposal' | null;
    related_product: ProductEntry | null;
    related_persona: PersonaEntry | null;
    related_use_case: UseCaseEntry | null;
}

export interface TalkTrackEntry extends StrapiEntry {
    title: string;
    opener: string | null;
    narrative: string | null;
    transitions: string[] | null;
    close: string | null;
    related_objections: ObjectionEntry[] | null;
    related_discovery_questions: DiscoveryQuestionEntry[] | null;
    related_product: ProductEntry | null;
    related_persona: PersonaEntry | null;
}

export interface CaseStudyEntry extends StrapiEntry {
    title: string;
    company_type: string | null;
    problem_statement: string | null;
    solution_description: string | null;
    results: string | null;
    metrics: Record<string, unknown> | null;
    constraints: string | null;
    what_made_it_work: string | null;
    related_product: ProductEntry | null;
    related_persona: PersonaEntry | null;
    related_use_case: UseCaseEntry | null;
}

export interface ProofPointEntry extends StrapiEntry {
    claim: string;
    evidence: string | null;
    source: string | null;
    compliance_safe_language: string | null;
    do_not_say: string[] | null;
    related_product: ProductEntry | null;
}

export interface UseCaseEntry extends StrapiEntry {
    title: string;
    problem_statement: string | null;
    why_it_matters: string | null;
    success_criteria: unknown[] | null;
}
