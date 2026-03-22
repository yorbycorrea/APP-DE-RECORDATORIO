/// <reference types="vite/client" />

// Este archivo le dice a TypeScript que import.meta.env existe y tiene estas variables.
// Sin esto, TS no reconocería import.meta.env.VITE_SUPABASE_URL y daría error de tipo.
// Vite genera este tipo automáticamente, pero al usar vite-plugin-pwa y typescript
// estricto a veces necesita declararse explícitamente.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
