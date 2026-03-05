// =============================================================================
// Base Transformer — abstract class for all content type transformers
// =============================================================================

export abstract class BaseTransformer<T> {
    /**
     * Returns the Wiki.js page path (without leading slash).
     * Example: "objections/abc123def456"
     */
    abstract getPagePath(entry: T): string;

    /**
     * Returns the Wiki.js page title.
     */
    abstract getPageTitle(entry: T): string;

    /**
     * Returns the full Markdown content for the Wiki.js page.
     */
    abstract toMarkdown(entry: T): string;
}
