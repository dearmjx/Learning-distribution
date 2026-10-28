# Course content packs

Course materials are grouped as versioned, reusable packs. The first pack is `biology-m4-ecosystem` in `src/data/course/ecosystem/content-pack.ts`.

Each pack contains:

- a stable pack ID, course ID, version, and display title;
- activities with their own optional `contentVersion`;
- teacher-approved knowledge chunks scoped to the course, chapter, and optionally activity.

The pack validator rejects duplicate activity/chunk IDs, course mismatches, and unapproved knowledge chunks. The memory repository and approved knowledge registry consume this pack. Retrieval continues to filter chunks against the requested activity scope.

## Updating content

Treat a released pack version as immutable. For a material change to a prompt, activity context, rubric anchor, or approved knowledge, review the change and increment the pack version. Keep source titles/sections and approval metadata on every knowledge chunk. Do not add student work as knowledge content unless it has been de-identified and separately approved as an example.

For a new course, create a new directory under `src/data/course/`, export its activity and knowledge collections, define a content pack, and register its approved knowledge collection in `src/data/course/knowledge-base.ts`. Keep activity IDs unique within the application and preserve existing IDs when editing content so saved work continues to resolve.

## Scope

This is a static, code-reviewed content-pack boundary. It does not yet provide browser-based teacher authoring or database-managed content versioning. Supabase activity rows may not have a `contentVersion` yet; those legacy rows are marked `unversioned` in Coach feedback events. Add database version columns only as part of a reviewed migration and backfill plan.
