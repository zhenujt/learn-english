import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@toast-ui/editor/dist/toastui-editor.css";
import { App } from "./App";
import { NumberPage } from "./NumberPage";
import { WordsPage } from "./WordsPage";
import "./styles.css";

const isWordsRoute = /\/words\/?$/.test(window.location.pathname);
const isNumberRoute = /\/number\/?$/.test(window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isWordsRoute ? <WordsPage /> : isNumberRoute ? <NumberPage /> : <App />}
  </StrictMode>,
);
