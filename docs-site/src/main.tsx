import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@toast-ui/editor/dist/toastui-editor.css";
import { App } from "./App";
import { WordsPage } from "./WordsPage";
import "./styles.css";

const isWordsRoute = /\/words\/?$/.test(window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isWordsRoute ? <WordsPage /> : <App />}
  </StrictMode>,
);
