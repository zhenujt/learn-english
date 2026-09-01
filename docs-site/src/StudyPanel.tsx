import { useState } from "react";
import {
  BookmarkPlus,
  CheckCircle2,
  Cloud,
  LogIn,
  LogOut,
  MessageSquarePlus,
  RotateCcw,
  Target,
  Trash2,
  X,
} from "lucide-react";
import type { TextAnnotation } from "./shared/annotation-store";
import type { DocumentStudyState, LearningStatus } from "./shared/workspace-store";

interface TaskDocument {
  path: string;
  title: string;
}

interface StudyPanelProps {
  open: boolean;
  path: string;
  activeHeading: string;
  state: DocumentStudyState;
  exerciseCount: number;
  dailyTasks: TaskDocument[];
  syncConfigured: boolean;
  userEmail?: string;
  syncMessage: string;
  exerciseMode: boolean;
  wrongOnly: boolean;
  annotations: TextAnnotation[];
  onClose: () => void;
  onSelectDocument: (path: string) => void;
  onUpdate: (update: Partial<Omit<DocumentStudyState, "updatedAt">>) => void;
  onMagicLink: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onSync: () => Promise<void>;
  onExerciseMode: (enabled: boolean) => void;
  onWrongOnly: (enabled: boolean) => void;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

const statuses: { value: LearningStatus; label: string }[] = [
  { value: "not-started", label: "Not started" },
  { value: "learning", label: "Learning" },
  { value: "completed", label: "Completed" },
  { value: "review", label: "Review" },
];

/** Provides document-level study controls without modifying the Markdown source. */
export function StudyPanel(props: StudyPanelProps) {
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const exerciseResults = Object.values(props.state.exerciseResults);
  const correct = exerciseResults.filter(Boolean).length;

  const addBookmark = () => {
    const bookmark = {
      id: crypto.randomUUID(),
      heading: props.activeHeading || "Document",
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    props.onUpdate({ bookmarks: [...props.state.bookmarks, bookmark] });
    setNote("");
  };

  return (
    <aside
      className={`study-panel ${props.open ? "is-open" : ""}`}
      aria-label="Study tools"
      aria-hidden={!props.open}
      inert={!props.open}
    >
      <header>
        <div>
          <span className="pane-label">Study tools</span>
          <strong>{Math.round(props.state.progress)}% read</strong>
        </div>
        <button className="icon-button" onClick={props.onClose} aria-label="Close study tools">
          <X size={19} />
        </button>
      </header>

      <section>
        <label className="study-label" htmlFor="learning-status">Learning status</label>
        <select
          id="learning-status"
          value={props.state.status}
          onChange={(event) => props.onUpdate({ status: event.target.value as LearningStatus })}
        >
          {statuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}
        </select>
        <div className="progress-track" aria-label={`${Math.round(props.state.progress)} percent read`}>
          <span style={{ width: `${props.state.progress}%` }} />
        </div>
      </section>

      {props.annotations.length > 0 && (
        <section>
          <div className="study-section-title"><MessageSquarePlus size={16} /> Text notes</div>
          <div className="annotation-list">
            {props.annotations.map((annotation) => (
              <article key={annotation.id}>
                <button type="button" onClick={() => props.onSelectAnnotation(annotation.id)}>
                  <strong>{annotation.quote}</strong>
                  <span>{annotation.note || "No note"}</span>
                </button>
                <button className="icon-button" type="button" aria-label={`Delete note for ${annotation.quote}`} onClick={() => props.onDeleteAnnotation(annotation.id)}><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="study-section-title"><BookmarkPlus size={16} /> Bookmark & note</div>
        <strong className="current-heading">{props.activeHeading || "Current position"}</strong>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
        <button className="secondary-command" onClick={addBookmark}><BookmarkPlus size={15} /> Add bookmark</button>
        <div className="bookmark-list">
          {props.state.bookmarks.map((bookmark) => (
            <article key={bookmark.id}>
              <div><strong>{bookmark.heading}</strong>{bookmark.note && <p>{bookmark.note}</p>}</div>
              <button
                className="icon-button"
                aria-label={`Delete bookmark ${bookmark.heading}`}
                onClick={() => props.onUpdate({ bookmarks: props.state.bookmarks.filter((item) => item.id !== bookmark.id) })}
              ><Trash2 size={15} /></button>
            </article>
          ))}
        </div>
      </section>

      {props.exerciseCount > 0 && (
        <section>
          <div className="study-section-title"><Target size={16} /> Exercise mode</div>
          <p>{correct}/{props.exerciseCount} marked correct</p>
          <label className="toggle-row">
            <input type="checkbox" checked={props.exerciseMode} onChange={(event) => props.onExerciseMode(event.target.checked)} />
            Hide answers until opened
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={props.wrongOnly} onChange={(event) => props.onWrongOnly(event.target.checked)} />
            Wrong answers only
          </label>
          <div className="exercise-grid">
            {Array.from({ length: props.exerciseCount }, (_, index) => {
              const key = String(index);
              const result = props.state.exerciseResults[key];
              return (
                <div className={result === true ? "correct" : result === false ? "wrong" : ""} key={key}>
                  <span>{index + 1}</span>
                  <button aria-label={`Mark exercise ${index + 1} correct`} onClick={() => props.onUpdate({ exerciseResults: { ...props.state.exerciseResults, [key]: true } })}>✓</button>
                  <button aria-label={`Mark exercise ${index + 1} wrong`} onClick={() => props.onUpdate({ exerciseResults: { ...props.state.exerciseResults, [key]: false } })}>×</button>
                </div>
              );
            })}
          </div>
          <button className="secondary-command" onClick={() => props.onUpdate({ exerciseResults: {} })}><RotateCcw size={15} /> Reset answers</button>
        </section>
      )}

      <section>
        <div className="study-section-title"><CheckCircle2 size={16} /> Today</div>
        <div className="daily-list">
          {props.dailyTasks.map((task) => (
            <button key={task.path} className={task.path === props.path ? "active" : ""} onClick={() => props.onSelectDocument(task.path)}>{task.title}</button>
          ))}
        </div>
      </section>

      {props.syncConfigured && (
        <section>
          <div className="study-section-title"><Cloud size={16} /> Cross-device sync</div>
          {props.userEmail ? (
            <>
              <p>{props.userEmail}</p>
              <div className="sync-actions">
                <button className="secondary-command" onClick={() => void props.onSync()}><Cloud size={15} /> Sync now</button>
                <button className="icon-button" onClick={() => void props.onSignOut()} aria-label="Sign out"><LogOut size={16} /></button>
              </div>
            </>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void props.onMagicLink(email); }}>
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email for magic link" />
              <button className="secondary-command" type="submit"><LogIn size={15} /> Send link</button>
            </form>
          )}
          {props.syncMessage && <small>{props.syncMessage}</small>}
        </section>
      )}
    </aside>
  );
}