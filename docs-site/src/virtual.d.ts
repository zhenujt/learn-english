/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_REPOSITORY?: string;
  readonly VITE_GITHUB_BRANCH?: string;
}

declare module "virtual:analysis-documents" {
  interface AnalysisDocument {
    path: string;
    title: string;
    section: string;
    content: string;
    revision: string;
  }

  const documents: AnalysisDocument[];
  export default documents;
}
