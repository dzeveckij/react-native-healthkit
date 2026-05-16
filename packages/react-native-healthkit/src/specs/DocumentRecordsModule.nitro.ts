import type { HybridObject } from 'react-native-nitro-modules'
import type { DocumentSample } from '../types'
import type { QueryOptionsWithSortOrder } from '../types/QueryOptions'

export interface DocumentRecordsModule extends HybridObject<{ ios: 'swift' }> {
  queryDocumentSamples(
    typeIdentifier: string,
    options: QueryOptionsWithSortOrder,
  ): Promise<readonly DocumentSample[]>
}
