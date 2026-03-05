// =============================================================================
// Wiki.js 2.5 Type Definitions (GraphQL API)
// =============================================================================

export interface WikiJsPage {
    id: number;
    path: string;
    title: string;
    description?: string;
    content?: string;
    isPublished: boolean;
}

export interface WikiJsPageSingleByPathResult {
    data: {
        pages: {
            singleByPath: WikiJsPage | null;
        };
    };
}

export interface WikiJsResponseResult {
    succeeded: boolean;
    errorCode: number | null;
    slug: string | null;
    message: string | null;
}

export interface WikiJsCreatePageResult {
    data: {
        pages: {
            create: {
                responseResult: WikiJsResponseResult;
                page: WikiJsPage | null;
            };
        };
    };
}

export interface WikiJsUpdatePageResult {
    data: {
        pages: {
            update: {
                responseResult: WikiJsResponseResult;
                page: WikiJsPage | null;
            };
        };
    };
}

export interface WikiJsGraphQLError {
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
}

export interface WikiJsGraphQLResponse<T> {
    data?: T;
    errors?: WikiJsGraphQLError[];
}

export interface UpsertPageInput {
    path: string;
    title: string;
    content: string;
    description?: string;
    tags?: string[];
    locale?: string;
}
