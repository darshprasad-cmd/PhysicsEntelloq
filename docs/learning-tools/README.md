# Learning tools inside Physics

The existing Physics shell now opens equation editing in Solve, motion graphs and concept search in Learn, circuits and notebooks in Lab, notebooks in Research, and a retrieval queue in Practice and Progress. Direct links use `#learning:equations`, `graphs`, `circuits`, `review`, `notebook` or `search`.

MathLive drafts can be explicitly transferred to the existing Symbolic Workbench. The handoff fills the expression without running it; unsupported notation stays visible for editing. JSXGraph uses SI units and the documented ideal projectile assumptions. CircuitJS opens its official hosted simulator only after Launch.

The review queue uses ts-fsrs with explicit recall ratings and eight curated concepts. Yjs supports same-browser/site tabs and exported document merging. Concept search covers eight curated explanations, with keyword search by default and optional Transformers.js/MiniLM inference. It does not search the entire app, generate answers or provide online classroom rooms. The optional model downloads from Hugging Face after Enable.

Pinned source, upstream notices, model licences and component tests live under `learning-tools-source/`. Published files and SHA-256 manifests live under `assets/learning-tools/`. Preserve exact asset bytes across platforms. Rebuild runtime copies with `python scripts/sync-learning-tools.py`; use `--check` for parity. Rebuild the host with `node .github/build-experience.js`.

Validation on 24 October 2026: all 156 existing static tests passed; 11 integrated Chromium checks passed with no page errors. Checks cover actual MathLive draft transfer, no automatic calculation, interactive JSXGraph controls, live palette transfer, navigation cleanup, explicit circuit activation, review and notebook persistence, opt-in model loading, mobile layout, and missing-asset recovery. Component tests additionally exercise FSRS, Yjs merge, actual semantic inference and the hosted CircuitJS canvas. Evidence is saved beside this document and in component QA files. Local verification is distinct from CI and deployment verification.
