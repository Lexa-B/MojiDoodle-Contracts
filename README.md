# mojidoodle-contracts

MojiDoodle's shared domain contracts: the collection-sample schema versions,
the backend-grading wire protocol, and the kana-matching rules that give them
meaning. Consumed by the MojiDoodle app, its worker backend, and the analytics
dashboard so the contract exists exactly once.

Pure types + pure functions. Zero runtime dependencies. Ships ESM **and** CJS.

## Install

    npm install mojidoodle-contracts

## Surface

- `kanaMatch(target, candidate)` / `kanaMatchAnswer(target, candidate)` — kana-aware
  character/answer matching (small↔big kana, chōon variants, wave-dash variants),
  plus the underlying tables.
- Grading wire protocol: `GradeRequest`, `GradePayload`, `FuguVerdict`,
  `FUGU_VERDICTS`, `FuguAnalysisInfo`, `GradingError`, `Point`,
  `EndingType`/`EndingFeatures`/`EndingClassification`.
- Sample schemas: `CollectionSampleV3`…`CollectionSampleV7`,
  `CollectionSampleLatest`, and their component types.
