import type { HybridObject } from 'react-native-nitro-modules'
import type { ClinicalRecord, ClinicalTypeIdentifier } from '../types'
import type {
  QueryOptionsWithAnchor,
  QueryOptionsWithSortOrder,
} from '../types/QueryOptions'
import type { DeletedSample } from '../types/Shared'

export interface ClinicalRecordsWithAnchorResponse {
  readonly clinicalRecords: readonly ClinicalRecord[]
  readonly deletedSamples: readonly DeletedSample[]
  readonly newAnchor: string
}

export interface ClinicalRecordsModule extends HybridObject<{ ios: 'swift' }> {
  supportsHealthRecords(): boolean
  supportsHealthRecordsAsync(): Promise<boolean>

  queryClinicalRecords(
    typeIdentifier: ClinicalTypeIdentifier,
    options: QueryOptionsWithSortOrder,
  ): Promise<readonly ClinicalRecord[]>

  queryClinicalRecordsWithAnchor(
    typeIdentifier: ClinicalTypeIdentifier,
    options: QueryOptionsWithAnchor,
  ): Promise<ClinicalRecordsWithAnchorResponse>
}
