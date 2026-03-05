import { BaseTransformer } from './base.transformer';
import type { DiscoveryQuestionEntry } from '../types/strapi.types';

export class DiscoveryQuestionTransformer extends BaseTransformer<DiscoveryQuestionEntry> {
    getPagePath(entry: DiscoveryQuestionEntry): string {
        return `discovery-questions/${entry.documentId}`;
    }

    getPageTitle(entry: DiscoveryQuestionEntry): string {
        return `Discovery: ${entry.question}`;
    }

    toMarkdown(entry: DiscoveryQuestionEntry): string {
        const syncDate = new Date().toISOString();
        const productName = entry.related_product?.name ?? '_Not set_';
        const personaName = entry.related_persona?.name ?? '_Not set_';
        const useCaseTitle = entry.related_use_case?.title ?? '_Not set_';
        const stage = entry.stage ?? '_Not set_';

        const followUps =
            Array.isArray(entry.follow_up_questions) && entry.follow_up_questions.length > 0
                ? entry.follow_up_questions.map((q) => `- ${q}`).join('\n')
                : '_None listed_';

        const signals =
            Array.isArray(entry.signals_to_listen_for) && entry.signals_to_listen_for.length > 0
                ? entry.signals_to_listen_for.map((s) => `- ${s}`).join('\n')
                : '_None listed_';

        const intent = entry.intent ?? '_Not provided_';
        const whyAsk = entry.why_ask ?? '_Not provided_';

        return `# Discovery Question: ${entry.question}

**Stage:** ${stage}  
**Product:** ${productName} | **Persona:** ${personaName} | **Use Case:** ${useCaseTitle}

---

## Intent

${intent}

## Why Ask This Question

${whyAsk}

## Follow-Up Questions

${followUps}

## Signals to Listen For

${signals}

---

_Synced from Strapi on ${syncDate}_
`;
    }
}
