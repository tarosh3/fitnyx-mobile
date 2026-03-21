Add a full-stack feature to Fitnyx.

Steps:
1. Ask me what the feature is if I haven't described it
2. Show me a plan (backend + mobile) before writing any code
3. Wait for my approval before starting
4. Backend: create Handler → Service → Repository following existing patterns in internal/handlers/, internal/service/, internal/repository/
5. Mobile: create the API call in src/lib/api/, add cache key in src/lib/cache/keys.ts, build the screen in app/ or src/features/, use fetchWithAuth + useCachedQuery + useThemeColors
6. After finishing, list what was created and what to test
