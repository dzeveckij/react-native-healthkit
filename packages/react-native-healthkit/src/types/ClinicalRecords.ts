import type { AnyMap } from 'react-native-nitro-modules'
import type { BaseSample } from './Shared'

/**
 * @see {@link https://developer.apple.com/documentation/healthkit/hkclinicaltypeidentifier Apple Docs }
 */
export type ClinicalTypeIdentifier =
  | 'HKClinicalTypeIdentifierAllergyRecord'
  | 'HKClinicalTypeIdentifierConditionRecord'
  | 'HKClinicalTypeIdentifierImmunizationRecord'
  | 'HKClinicalTypeIdentifierLabResultRecord'
  | 'HKClinicalTypeIdentifierMedicationRecord'
  | 'HKClinicalTypeIdentifierProcedureRecord'
  | 'HKClinicalTypeIdentifierVitalSignRecord'

export interface ClinicalRecord extends BaseSample {
  readonly clinicalType: ClinicalTypeIdentifier
  readonly displayName: string
  readonly fhirRecord?: AnyMap
  readonly fhirResource?: AnyMap
  readonly fhirResourceData?: string
  readonly fhirResourceIdentifier?: string
  readonly fhirResourceType?: string
  readonly fhirResourceSourceURL?: string
}
