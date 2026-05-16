import HealthKit
import NitroModules

private func anyValueFromJSON(_ value: Any) throws -> AnyValue {
  if value is NSNull {
    return .null
  }

  if let number = value as? NSNumber {
    if CFGetTypeID(number) == CFBooleanGetTypeID() {
      return .bool(number.boolValue)
    }

    return .number(number.doubleValue)
  }

  if let array = value as? [Any] {
    return .array(try array.map(anyValueFromJSON))
  }

  if let dictionary = value as? [String: Any] {
    return .object(try dictionary.mapValues(anyValueFromJSON))
  }

  return try AnyValue.fromAny(value)
}

private func anyMapFromDictionary(_ dictionary: [String: Any]) throws -> AnyMap {
  let map = AnyMap()

  for (key, value) in dictionary {
    try map.setAny(key: key, value: try anyValueFromJSON(value))
  }

  return map
}

@available(iOS 12.0, *)
private func serializeFHIRResource(_ resource: HKFHIRResource?) -> AnyMap? {
  guard let resource else {
    return nil
  }

  do {
    let json = try JSONSerialization.jsonObject(with: resource.data, options: [])

    if let dictionary = json as? [String: Any] {
      return try anyMapFromDictionary(dictionary)
    }

    warnWithPrefix("serializeFHIRResource: expected a top-level JSON object")
  } catch {
    warnWithPrefix("serializeFHIRResource: \(error.localizedDescription)")
  }

  return nil
}

@available(iOS 12.0, *)
private func serializeClinicalRecord(_ record: HKClinicalRecord) throws -> ClinicalRecord {
  guard let clinicalType = ClinicalTypeIdentifier(fromString: record.clinicalType.identifier) else {
    throw runtimeErrorWithPrefix(
      "Unable to recognize clinicalType: \(record.clinicalType.identifier)")
  }

  let fhirResource = serializeFHIRResource(record.fhirResource)

  return ClinicalRecord(
    clinicalType: clinicalType,
    displayName: record.displayName,
    fhirRecord: fhirResource,
    fhirResource: fhirResource,
    sampleType: serializeSampleType(record.sampleType),
    startDate: record.startDate,
    endDate: record.endDate,
    hasUndeterminedDuration: record.hasUndeterminedDuration,
    metadata: serializeMetadata(record.metadata),
    uuid: record.uuid.uuidString,
    sourceRevision: serializeSourceRevision(record.sourceRevision),
    device: serializeDevice(hkDevice: record.device)
  )
}

class ClinicalRecordsModule: HybridClinicalRecordsModuleSpec {
  func supportsHealthRecords() -> Bool {
    if #available(iOS 12.0, *) {
      return store.supportsHealthRecords()
    }

    return false
  }

  func supportsHealthRecordsAsync() -> Promise<Bool> {
    return Promise.resolved(withResult: supportsHealthRecords())
  }

  func queryClinicalRecords(
    typeIdentifier: ClinicalTypeIdentifier,
    options: QueryOptionsWithSortOrder
  ) -> Promise<[ClinicalRecord]> {
    return Promise.async {
      guard #available(iOS 12.0, *) else {
        throw runtimeErrorWithPrefix("Clinical records require iOS 12.0 or later")
      }

      let sampleType = try initializeClinicalType(typeIdentifier.stringValue)

      let samples = try await sampleQueryAsync(
        sampleType: sampleType,
        limit: options.limit,
        predicate: createPredicateForSamples(options.filter),
        sortDescriptors: getSortDescriptors(ascending: options.ascending)
      )

      return try samples.compactMap { sample -> ClinicalRecord? in
        guard let clinicalRecord = sample as? HKClinicalRecord else {
          return nil
        }

        return try serializeClinicalRecord(clinicalRecord)
      }
    }
  }

  func queryClinicalRecordsWithAnchor(
    typeIdentifier: ClinicalTypeIdentifier,
    options: QueryOptionsWithAnchor
  ) -> Promise<ClinicalRecordsWithAnchorResponse> {
    return Promise.async {
      guard #available(iOS 12.0, *) else {
        throw runtimeErrorWithPrefix("Clinical records require iOS 12.0 or later")
      }

      let sampleType = try initializeClinicalType(typeIdentifier.stringValue)

      let response = try await sampleAnchoredQueryAsync(
        sampleType: sampleType,
        limit: options.limit,
        queryAnchor: options.anchor,
        predicate: createPredicateForSamples(options.filter)
      )

      let clinicalRecords = try response.samples.compactMap { sample -> ClinicalRecord? in
        guard let clinicalRecord = sample as? HKClinicalRecord else {
          return nil
        }

        return try serializeClinicalRecord(clinicalRecord)
      }

      return ClinicalRecordsWithAnchorResponse(
        clinicalRecords: clinicalRecords,
        deletedSamples: response.deletedSamples,
        newAnchor: response.newAnchor
      )
    }
  }
}
