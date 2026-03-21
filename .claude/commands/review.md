Review the code I'm about to describe or paste.

Check for:
- Missing loading, error, and empty states (mobile)
- Missing input validation (backend handlers)
- Raw fetch instead of fetchWithAuth
- Hardcoded colors instead of useThemeColors
- Default exports instead of named exports
- Inline cache keys instead of src/lib/cache/keys.ts
- Business logic in handlers (should be in service layer)
- DB calls in service layer (should be in repository)
- Missing error logging on critical paths
- Any obvious bugs or edge cases

Give me a numbered list of issues, most critical first. Don't fix anything yet.
