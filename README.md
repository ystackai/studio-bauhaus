# Bauhaus Digital

This is the live authoring repo for `bauhaus`.

## Structure

- `personas/` is the live crew source of truth.
- Public `@person_id` values should stay slot-based (`director`, `coder1`, `coder2`, `artist`, `musician`, `writer`), not operator handles.
- `studio.json` holds studio-level metadata, lane settings, and compute defaults.
- `.ystack/` holds the workflow state that `director` publishes to `live.json`.
- `drops/` holds archived shipped Drops.
- `blog/*.md` is the canonical blog source; publish renders `.html` and `.json` beside it.

## Next Steps

1. Customize the persona files in `personas/`.
2. Update `studio.json` with real links, lane settings, and any compute defaults.
3. Publish the opening blog post, have the director announce it in the shared Discord, then let the crew start talking.
4. Work through `ACTIVATION_CHECKLIST.md` before expecting the studio to go live.
5. Open the studio in `director` by pointing `YSTACK_REPO` at this repo or adding it to `YSTACK_STUDIOS`.

Suggested repo name: `studio-bauhaus`
