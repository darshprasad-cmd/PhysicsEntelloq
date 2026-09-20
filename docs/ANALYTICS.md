# Analytics contract

No canonical PostHog instrumentation was found on the default branch when this document was created. Do not add analytics calls directly to simulations or UI handlers.

If analytics is introduced:
- create one adapter and keep product logic independent;
- document consent and disabled/offline behavior;
- never capture camera frames, hand landmarks, prompts, notebooks, identities, or free-form student input;
- use lowercase `object_action` event names and `snake_case` properties;
- add every event to the catalog before implementation.

## Event catalog
| Event | Trigger | Properties | Owner | Status |
|---|---|---|---|---|
| _None yet_ | | | | |

Event renames or semantic changes require an entry in `docs/DECISIONS.md`.
