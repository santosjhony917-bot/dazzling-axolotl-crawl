# Codex Project Context

This directory is the application root for the project. Treat it as trusted for normal local development work.

Proceed without asking for confirmation for ordinary development tasks: reading files, editing scoped code changes, running tests, running builds, starting local dev servers, inspecting logs, and non-destructive Supabase reads.

Ask the user before destructive or irreversible actions, including database drops, mass deletes, destructive migrations, resetting production data, rotating or exposing secrets, deleting branches, force-pushes, or removing generated/user data.

Default Supabase cloud project:

- project_ref/project_id: `gaawiewmlhorzbaixoqo`
- URL: `https://gaawiewmlhorzbaixoqo.supabase.co`
- local linked project file: `supabase\.temp\project-ref`

Use `gaawiewmlhorzbaixoqo` by default for Supabase connector reads and normal development operations unless the user explicitly points to another project.

OpenAI/API key handling:

- Prefer `OPENAI_API_KEY` for server-side/local tooling.
- Do not print, copy, or expose API keys in chat.
- Use the Codex/OpenAI secure API-key setup flow for new keys or rotations.

Chrome notes:

- The project extension is at `public\chrome-extension`.
- Existing notes for real Chrome testing are in `EXTENSION_REAL_CHROME_TESTING.md`.
- Prefer a Chrome profile outside the watched project tree when running Vite, to avoid watcher issues with locked Chrome profile files.
