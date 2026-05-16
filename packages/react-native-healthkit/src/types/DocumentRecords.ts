import type { BaseSample } from './Shared'

/**
 * @see {@link https://developer.apple.com/documentation/healthkit/hkdocumenttypeidentifier Apple Docs }
 */
export type DocumentTypeIdentifier = 'HKDocumentTypeIdentifierCDA'

export interface DocumentSample extends BaseSample {
  readonly documentType: string
  readonly documentData?: string
  readonly title?: string
  readonly patientName?: string
  readonly custodianName?: string
  readonly authorName?: string
}
