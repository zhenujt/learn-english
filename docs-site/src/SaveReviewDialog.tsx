import { diffLines } from "diff";
import { Check, X } from "lucide-react";

export interface DocumentDiff {
  path: string;
  before: string;
  after: string;
}

interface SaveReviewDialogProps {
  documents: DocumentDiff[];
  saving: boolean;
  errors: string[];
  onCancel: () => void;
  onConfirm: () => void;
}

/** Renders a final line-level review before Markdown changes are saved. */
export function SaveReviewDialog({
  documents,
  saving,
  errors,
  onCancel,
  onConfirm,
}: SaveReviewDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="save-review" role="dialog" aria-modal="true" aria-labelledby="save-review-title">
        <header>
          <div>
            <span className="pane-label">Review changes</span>
            <h2 id="save-review-title">
              {documents.length} document{documents.length === 1 ? "" : "s"} ready to save
            </h2>
          </div>
          <button className="icon-button" onClick={onCancel} aria-label="Close save review">
            <X size={19} />
          </button>
        </header>
        {errors.length > 0 && (
          <div className="validation-errors" role="alert">
            <strong>Save blocked</strong>
            {errors.map((error) => <span key={error}>{error}</span>)}
          </div>
        )}
        <div className="diff-documents">
          {documents.map((document) => (
            <details key={document.path} open={documents.length === 1}>
              <summary>{document.path}</summary>
              <pre className="diff-view" aria-label={`Changes in ${document.path}`}>
                {diffLines(document.before, document.after).map((part, index) => (
                  <span
                    className={part.added ? "added" : part.removed ? "removed" : "unchanged"}
                    key={`${index}-${part.value.length}`}
                  >
                    {part.value}
                  </span>
                ))}
              </pre>
            </details>
          ))}
        </div>
        <footer>
          <button className="cancel-button" onClick={onCancel} disabled={saving}>Back</button>
          <button className="save-button" onClick={onConfirm} disabled={saving}>
            <Check size={16} /> {saving ? "Saving…" : "Confirm save"}
          </button>
        </footer>
      </section>
    </div>
  );
}