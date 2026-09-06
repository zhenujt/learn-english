/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_REPOSITORY?: string;
  readonly VITE_GITHUB_BRANCH?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GITHUB_API_BASE?: string;
  readonly VITE_GITHUB_API_KEY?: string;
}

declare module "virtual:analysis-documents" {
  interface AnalysisDocument {
    path: string;
    title: string;
    section: string;
    content: string;
    revision: string;
    audioPath?: string;
    audioPlaylistPath?: string;
  }

  const documents: AnalysisDocument[];
  export default documents;
}
