import { BaseTransformer } from './base.transformer';
import type { ObjectionEntry } from '../types/strapi.types';

export class ObjectionTransformer extends BaseTransformer<ObjectionEntry> {
    getPagePath(entry: ObjectionEntry): string {
        return `objections/${entry.documentId}`;
    }

    getPageTitle(entry: ObjectionEntry): string {
        return `Objection: ${entry.objection_text}`;
    }

    toMarkdown(entry: ObjectionEntry): string {
        const syncDate = new Date().toISOString();
        const productName = entry.related_product?.name ?? '_Not set_';
        const personaName = entry.related_persona?.name ?? '_Not set_';
        const stage = entry.stage ?? '_Not set_';
        const score = entry.effectiveness_score ?? 50;

        const doNotSayList =
            Array.isArray(entry.do_not_say) && entry.do_not_say.length > 0
                ? entry.do_not_say.map((item) => `- ${item}`).join('\n')
                : '_None listed_';

        const proofPointsSection =
            Array.isArray(entry.proof_points) && entry.proof_points.length > 0
                ? entry.proof_points
                    .map((pp) => `- **${pp.claim}**: ${pp.evidence ?? '_No evidence_'} _(Source: ${pp.source ?? 'Unknown'})_`)
                    .join('\n')
                : '_No proof points linked_';

        const rootCause = entry.root_cause ?? '_Not provided_';
        const responseScript = entry.response_script ?? '_Not provided_';

        return `# Objection: ${entry.objection_text}

**Stage:** ${stage} | **Effectiveness:** ${score}/100  
**Product:** ${productName} | **Persona:** ${personaName}

---

## Root Cause

${rootCause}

## Recommended Response

${responseScript}

## Avoid Saying

${doNotSayList}

## Proof Points

${proofPointsSection}

---

_Synced from Strapi on ${syncDate}_
`;
    }
}
