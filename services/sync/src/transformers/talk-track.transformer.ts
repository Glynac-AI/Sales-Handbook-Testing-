import { BaseTransformer } from './base.transformer';
import type { TalkTrackEntry } from '../types/strapi.types';

export class TalkTrackTransformer extends BaseTransformer<TalkTrackEntry> {
    getPagePath(entry: TalkTrackEntry): string {
        return `talk-tracks/${entry.documentId}`;
    }

    getPageTitle(entry: TalkTrackEntry): string {
        return entry.title;
    }

    toMarkdown(entry: TalkTrackEntry): string {
        const syncDate = new Date().toISOString();
        const productName = entry.related_product?.name ?? '_Not set_';
        const personaName = entry.related_persona?.name ?? '_Not set_';

        const opener = entry.opener ?? '_Not provided_';
        const narrative = entry.narrative ?? '_Not provided_';
        const close = entry.close ?? '_Not provided_';

        const transitions =
            Array.isArray(entry.transitions) && entry.transitions.length > 0
                ? entry.transitions.map((t, i) => `${i + 1}. ${t}`).join('\n')
                : '_None listed_';

        const objectionsList =
            Array.isArray(entry.related_objections) && entry.related_objections.length > 0
                ? entry.related_objections.map((o) => `- [${o.objection_text}](/${`objections/${o.documentId}`})`).join('\n')
                : '_None linked_';

        const discoveryList =
            Array.isArray(entry.related_discovery_questions) && entry.related_discovery_questions.length > 0
                ? entry.related_discovery_questions.map((dq) => `- [${dq.question}](/${`discovery-questions/${dq.documentId}`})`).join('\n')
                : '_None linked_';

        return `# ${entry.title}

**Product:** ${productName} | **Persona:** ${personaName}

---

## Opener

${opener}

## Narrative

${narrative}

## Key Transitions

${transitions}

## Closing

${close}

---

## Related Objections

${objectionsList}

## Related Discovery Questions

${discoveryList}

---

_Synced from Strapi on ${syncDate}_
`;
    }
}
