import HealthKit
import NitroModules

private func serializeDocumentSample(_ sample: HKDocumentSample) throws -> DocumentSample? {
  let documentType = sample.documentType.identifier

  guard #available(iOS 11.0, *) else {
    return DocumentSample(
      documentType: documentType,
      documentData: nil,
      title: nil,
      patientName: nil,
      custodianName: nil,
      authorName: nil,
      sampleType: serializeSampleType(sample.sampleType),
      startDate: sample.startDate,
      endDate: sample.endDate,
      hasUndeterminedDuration: sample.hasUndeterminedDuration,
      metadata: serializeMetadata(sample.metadata),
      uuid: sample.uuid.uuidString,
      sourceRevision: serializeSourceRevision(sample.sourceRevision),
      device: serializeDevice(hkDevice: sample.device)
    )
  }

  guard let document = (sample as? HKCDADocumentSample)?.document else {
    return nil
  }

  return DocumentSample(
    documentType: documentType,
    documentData: document.documentData?.base64EncodedString(),
    title: document.title,
    patientName: document.patientName,
    custodianName: document.custodianName,
    authorName: document.authorName,
    sampleType: serializeSampleType(sample.sampleType),
    startDate: sample.startDate,
    endDate: sample.endDate,
    hasUndeterminedDuration: sample.hasUndeterminedDuration,
    metadata: serializeMetadata(sample.metadata),
    uuid: sample.uuid.uuidString,
    sourceRevision: serializeSourceRevision(sample.sourceRevision),
    device: serializeDevice(hkDevice: sample.device)
  )
}

class DocumentRecordsModule: HybridDocumentRecordsModuleSpec {
  func queryDocumentSamples(
    typeIdentifier: String,
    options: QueryOptionsWithSortOrder
  ) -> Promise<[DocumentSample]> {
    return Promise.async {
      let documentType = try initializeDocumentType(typeIdentifier)
      let limit = getQueryLimit(options.limit)

      return try await withCheckedThrowingContinuation {
        (continuation: CheckedContinuation<[DocumentSample], Error>) in
        let query = HKDocumentQuery(
          documentType: documentType,
          predicate: createPredicateForSamples(options.filter),
          limit: limit,
          sortDescriptors: getSortDescriptors(ascending: options.ascending),
          includeDocumentData: true
        ) { (_: HKDocumentQuery, documents: [HKDocumentSample]?, _: Bool, error: Error?) in
          DispatchQueue.main.async {
            if let error = error {
              return continuation.resume(throwing: error)
            }

            do {
              let samples = try (documents ?? []).compactMap(serializeDocumentSample)
              return continuation.resume(returning: samples)
            } catch {
              return continuation.resume(throwing: error)
            }
          }
        }

        store.execute(query)
      }
    }
  }
}
