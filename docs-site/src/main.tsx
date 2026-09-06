import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@toast-ui/editor/dist/toastui-editor.css";
import { App } from "./App";
import { NumberPage } from "./NumberPage";
import { WordsPage } from "./WordsPage";
import "./styles.css";

const isWordsRoute = /\/words\/?$/.test(window.location.pathname);
const isNumberRoute = /\/number\/?$/.test(window.location.pathname);
const isPrepositionRoute = /\/preposition\/?$/.test(window.location.pathname);
const prepositionDocumentPath = "zero-to-work-english/04-工作沟通B1/software-workplace-prepositions.zh.md";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isWordsRoute
      ? <WordsPage />
      : isNumberRoute
        ? <NumberPage />
        : <App initialDocumentPath={isPrepositionRoute ? prepositionDocumentPath : undefined} />}
  </StrictMode>,
);
