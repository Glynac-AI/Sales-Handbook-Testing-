import { BaseTransformer } from './base.transformer';
import type { CaseStudyEntry } from '../types/strapi.types';

export class CaseStudyTransformer extends BaseTransformer<CaseStudyEntry> {
    getPagePath(entry: CaseStudyEntry): string {
        return `case-studies/${entry.documentId}`;
    }

    getPageTitle(entry: CaseStudyEntry): string {
        return entry.title;
    }

    toMarkdown(entry: CaseStudyEntry): string {
        const syncDate = new Date().toISOString();
        const productName = entry.related_product?.name ?? '_Not set_';
        const personaName = entry.related_persona?.name ?? '_Not set_';
        const useCaseTitle = entry.related_use_case?.title ?? '_Not set_';
        const companyType = entry.company_type ?? '_Not specified_';

        const problemStatement = entry.problem_statement ?? '_Not provided_';
        const solutionDescription = entry.solution_description ?? '_Not provided_';
        const results = entry.results ?? '_Not provided_';
        const constraints = entry.constraints ?? '_Not provided_';
        const whatMadeItWork = entry.what_made_it_work ?? '_Not provided_';

        const metricsSection =
            entry.metrics !== null && typeof entry.metrics === 'object' && Object.keys(entry.metrics).length > 0
                ? Object.entries(entry.metrics)
                    .map(([key, value]) => `- **${key}**: ${String(value)}`)
                    .join('\n')
                : '_No metrics recorded_';

        return `# Case Study: ${entry.title}

**Company Type:** ${companyType}  
**Product:** ${productName} | **Persona:** ${personaName} | **Use Case:** ${useCaseTitle}

---

## Problem Statement

${problemStatement}

## Our Solution

${solutionDescription}

## Results

${results}

## Key Metrics

${metricsSection}

## Constraints

${constraints}

## What Made It Work

${whatMadeItWork}

---

_Synced from Strapi on ${syncDate}_
`;
    }
}
