/**
 * ErrorDefinition — Represents a structured machine-readable error specification.
 *
 * Architecture ref: Phase 9.1 §4
 */
export interface ErrorDefinition {
  /** Unique machine-readable code, e.g. 'AUTH_201' */
  code: string;
  /** Associated HTTP status code, e.g. 401 */
  status: number;
  /** Translation/i18n message key, e.g. 'auth.token_invalid' */
  messageKey: string;
  /** Developer-facing description of the error cause */
  description: string;
}
