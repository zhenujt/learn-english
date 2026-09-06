import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Cloud,
  Edit3,
  LogIn,
  Plus,
  Search,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { AuthDialog } from "../../shared/auth/AuthDialog";
import { auth } from "../../shared/auth/auth-client";
import { BasicRichTextEditor, RichTextContent } from "./BasicRichTextEditor";
import { JennySpeechClient } from "./shared/jenny-speech";
import { richTextToPlainText } from "./shared/rich-text";
import { WordStore, type SavedWord } from "./shared/word-store";
import { WordSyncClient } from "./shared/word-sync";

const jennySpeech = new JennySpeechClient();
const wordStore = new WordStore();
const wordSync = new WordSyncClient();

interface WordDraft {
  word: string;
  pronunciation: string;
  meaning: string;
  example: string;
  pronunciationNote: string;
}

interface SpeechFeedback {
  key: string;
  message: string;
  error: boolean;
}

const emptyDraft: WordDraft = {
  word: "",
  pronunciation: "",
  meaning: "",
  example: "",
  pronunciationNote: "",
};

/** Local-first vocabulary manager available at the /words route. */
export function WordsPage() {
  const [words, setWords] = useState(() => wordStore.readAll());
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<WordDraft>(emptyDraft);
  const [userEmail, setUserEmail] = useState<string>();
  const [authOpen, setAuthOpen] = useState(false);
  const [syncMessage, setSyncMessage] = useState(wordSync.configured ? "" : "仅保存在此设备");
  const [speechFeedback, setSpeechFeedback] = useState<SpeechFeedback>();
  const syncingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechRequestRef = useRef(0);

  const activeWords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return words
      .filter((word) => !word.deletedAt)
      .filter((word) => !normalized ||
        `${word.word} ${richTextToPlainText(word.meaning)} ${richTextToPlainText(word.example)} ${word.pronunciationNote}`
          .toLowerCase()
          .includes(normalized))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [query, words]);

  const sync = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      setSyncMessage("正在同步…");
      const user = await wordSync.user();
      if (!user) throw new Error("登录后即可跨设备同步");
      setUserEmail(user.email);
      const scopedWords = wordStore.setScope(user.id);
      const storageKey = wordStore.storageKey;
      await wordSync.push(scopedWords);
      const cloudWords = await wordSync.pull();
      if (wordStore.storageKey !== storageKey) return;
      const merged = wordStore.mergeCloud(cloudWords);
      await wordSync.push(merged);
      setWords(merged);
      setSyncMessage("已同步");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "同步失败");
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    if (!wordSync.configured) return;
    void wordSync.user().then((user) => {
      setUserEmail(user?.email);
      setWords(wordStore.setScope(user?.id));
      if (user) void sync();
    }).catch(() => setSyncMessage("无法读取登录状态"));
    return auth.onChange((_event, session) => {
      setUserEmail(session?.user.email);
      setWords(wordStore.setScope(session?.user.id));
      if (session?.user) void sync();
    });
  }, []);

  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === wordStore.storageKey) setWords(wordStore.readAll());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [userEmail]);

  useEffect(() => () => {
    speechRequestRef.current += 1;
    audioRef.current?.pause();
    if (audioRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
    window.speechSynthesis?.cancel();
  }, []);

  const openCreate = () => {
    setEditingId(undefined);
    setDraft(emptyDraft);
    setFormOpen(true);
  };

  const openEdit = (word: SavedWord) => {
    setEditingId(word.id);
    setDraft({
      word: word.word,
      pronunciation: word.pronunciation,
      meaning: word.meaning,
      example: word.example,
      pronunciationNote: word.pronunciationNote,
    });
    setFormOpen(true);
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedWord = draft.word.trim();
    if (!normalizedWord) return;
    const now = new Date().toISOString();
    const current = editingId ? words.find((word) => word.id === editingId) : undefined;
    const saved: SavedWord = {
      id: current?.id ?? crypto.randomUUID(),
      word: normalizedWord,
      pronunciation: draft.pronunciation.trim(),
      meaning: draft.meaning.trim(),
      example: draft.example.trim(),
      pronunciationNote: draft.pronunciationNote.trim(),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    setWords(wordStore.save(saved));
    setFormOpen(false);
    if (userEmail) window.setTimeout(() => void sync(), 0);
  };

  const remove = (word: SavedWord) => {
    if (!window.confirm(`删除“${word.word}”？此操作会同步到其他设备。`)) return;
    setWords(wordStore.remove(word.id));
    if (userEmail) window.setTimeout(() => void sync(), 0);
  };

  const waitForVoices = async () => {
    if (window.speechSynthesis.getVoices().length > 0) return;
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(finish, 1800);
      function finish() {
        window.clearTimeout(timeout);
        window.speechSynthesis.removeEventListener("voiceschanged", finish);
        resolve();
      }
      window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    });
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio?.src.startsWith("blob:")) URL.revokeObjectURL(audio.src);
    audioRef.current = null;
  };

  const speakWithSystem = async (
    text: string,
    language: "en-US" | "zh-CN",
    key: string,
    jennyFallback = false,
  ) => {
    if (!text.trim()) return;
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setSpeechFeedback({ key, message: "当前浏览器不支持备用语音播放", error: true });
      return;
    }
    const request = ++speechRequestRef.current;
    stopAudio();
    window.speechSynthesis.cancel();
    setSpeechFeedback({
      key,
      message: jennyFallback ? "Jenny 暂不可用，正在使用设备语音…" : "正在准备设备语音…",
      error: false,
    });
    await waitForVoices();
    if (request !== speechRequestRef.current) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = language === "en-US" ? 0.82 : 0.92;
    const languagePrefix = language.slice(0, 2).toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    const languageVoices = voices.filter((candidate) =>
      candidate.lang.toLowerCase().startsWith(languagePrefix));
    const voice = languageVoices.find((candidate) => candidate.lang.toLowerCase() === language.toLowerCase())
      ?? languageVoices[0];
    if (voice) utterance.voice = voice;
    let started = false;
    utterance.onstart = () => {
      started = true;
      setSpeechFeedback({
        key,
        message: jennyFallback ? "Jenny 暂不可用，已使用设备语音" : "设备语音正在播放",
        error: false,
      });
    };
    utterance.onend = () => {
      if (utteranceRef.current === utterance) setSpeechFeedback(undefined);
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        setSpeechFeedback({ key, message: "无法播放，请检查设备的英文语音设置", error: true });
      }
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume();
    window.setTimeout(() => {
      if (!started && utteranceRef.current === utterance) {
        window.speechSynthesis.cancel();
        setSpeechFeedback({ key, message: "Jenny 与设备语音均不可用", error: true });
      }
    }, 3000);
  };

  const speak = async (text: string, language: "en-US" | "zh-CN", key: string) => {
    const spokenText = richTextToPlainText(text);
    if (!spokenText) return;
    if (language !== "en-US") {
      await speakWithSystem(spokenText, language, key);
      return;
    }
    if (!jennySpeech.available) {
      await speakWithSystem(spokenText, language, key);
      return;
    }

    const request = ++speechRequestRef.current;
    stopAudio();
    window.speechSynthesis?.cancel();
    setSpeechFeedback({ key, message: "正在生成 Jenny 语音…", error: false });
    try {
      const blob = await jennySpeech.synthesize(spokenText);
      if (request !== speechRequestRef.current) return;
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplaying = () => setSpeechFeedback({ key, message: "Jenny 正在播放", error: false });
      audio.onended = () => {
        if (audioRef.current === audio) {
          stopAudio();
          setSpeechFeedback(undefined);
        }
      };
      audio.onerror = () => {
        if (audioRef.current === audio) void speakWithSystem(spokenText, language, key, true);
      };
      await audio.play();
    } catch {
      if (request === speechRequestRef.current) await speakWithSystem(spokenText, language, key, true);
    }
  };

  return (
    <div className="words-shell">
      <header className="topbar words-topbar">
        <a className="icon-button" href={import.meta.env.BASE_URL} aria-label="返回文档" title="返回文档">
          <ArrowLeft size={20} />
        </a>
        <a className="brand" href={import.meta.env.BASE_URL}>
          <span className="brand-mark"><BookOpen size={19} /></span>
          <span>Learn <strong>English</strong></span>
        </a>
        <div className="topbar-actions">
          <span className="words-sync-status" role="status">
            {syncMessage === "已同步" && <Check size={14} />}
            {syncMessage}
          </span>
          {wordSync.configured && userEmail ? (
            <button className="secondary-command" onClick={() => void sync()}>
              <Cloud size={16} /> 同步
            </button>
          ) : wordSync.configured ? (
            <button className="secondary-command" onClick={() => setAuthOpen(true)}>
              <LogIn size={16} /> 登录
            </button>
          ) : null}
          <button className="save-button" onClick={openCreate}>
            <Plus size={17} /> 添加单词
          </button>
        </div>
      </header>

      <main className="words-main">
        <div className="words-heading">
          <div>
            <span className="words-kicker">PERSONAL VOCABULARY</span>
            <h1>我的单词本</h1>
            <p>{activeWords.length} 个单词或短语</p>
          </div>
          <label className="words-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索单词、意思或例句" />
            {query && <button onClick={() => setQuery("")} aria-label="清除搜索"><X size={16} /></button>}
          </label>
        </div>

        {activeWords.length === 0 ? (
          <section className="words-empty">
            <BookOpen size={32} />
            <h2>{query ? "没有匹配的单词" : "从一个难记的词开始"}</h2>
            <p>{query ? "换一个关键词试试。" : "记录读音、意思、发音难点和真实例句。"}</p>
            {!query && <button className="save-button" onClick={openCreate}><Plus size={17} /> 添加第一个单词</button>}
          </section>
        ) : (
          <div className="word-list">
            {activeWords.map((word) => (
              <article className="word-row" key={word.id}>
                <div className="word-primary">
                  <div className="word-title-line">
                    <h2>{word.word}</h2>
                    <button className={`word-audio${speechFeedback?.key === `${word.id}:word` && !speechFeedback.error ? " is-speaking" : ""}`} onClick={() => void speak(word.word, "en-US", `${word.id}:word`)} aria-label={`朗读 ${word.word}`} title="朗读单词">
                      <Volume2 size={17} />
                    </button>
                  </div>
                  {word.pronunciation && <span className="word-pronunciation">{word.pronunciation}</span>}
                  {word.pronunciationNote && <p className="word-note">发音提示：{word.pronunciationNote}</p>}
                  {speechFeedback?.key.startsWith(`${word.id}:`) && (
                    <p className={`word-speech-status${speechFeedback.error ? " is-error" : ""}`} role="status">{speechFeedback.message}</p>
                  )}
                </div>
                <div className="word-detail">
                  <span className="word-field-label">意思</span>
                  {word.meaning ? (
                    <div className="word-spoken-line">
                      <RichTextContent value={word.meaning} />
                      <button className={`word-audio${speechFeedback?.key === `${word.id}:meaning` && !speechFeedback.error ? " is-speaking" : ""}`} onClick={() => void speak(word.meaning, /[\u3400-\u9fff]/.test(word.meaning) ? "zh-CN" : "en-US", `${word.id}:meaning`)} aria-label="朗读意思" title="朗读意思"><Volume2 size={16} /></button>
                    </div>
                  ) : <p className="word-missing">尚未添加意思</p>}
                </div>
                <div className="word-detail">
                  <span className="word-field-label">例句</span>
                  {word.example ? (
                    <div className="word-spoken-line">
                      <RichTextContent value={word.example} />
                      <button className={`word-audio${speechFeedback?.key === `${word.id}:example` && !speechFeedback.error ? " is-speaking" : ""}`} onClick={() => void speak(word.example, "en-US", `${word.id}:example`)} aria-label="朗读例句" title="朗读例句"><Volume2 size={16} /></button>
                    </div>
                  ) : <p className="word-missing">尚未添加例句</p>}
                </div>
                <div className="word-actions">
                  <button onClick={() => openEdit(word)} aria-label={`编辑 ${word.word}`} title="编辑"><Edit3 size={17} /></button>
                  <button className="danger" onClick={() => remove(word)} aria-label={`删除 ${word.word}`} title="删除"><Trash2 size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {formOpen && (
        <div className="word-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFormOpen(false);
        }}>
          <section className="word-dialog" role="dialog" aria-modal="true" aria-labelledby="word-dialog-title">
            <div className="word-dialog-header">
              <div><span className="words-kicker">WORD RECORD</span><h2 id="word-dialog-title">{editingId ? "编辑单词" : "添加单词"}</h2></div>
              <button className="icon-button" onClick={() => setFormOpen(false)} aria-label="关闭"><X size={20} /></button>
            </div>
            <form onSubmit={save}>
              <label><span className="word-field-heading">单词或短语 <small>必填</small></span><input autoFocus required value={draft.word} onChange={(event) => setDraft({ ...draft, word: event.target.value })} placeholder="例如：thorough" /></label>
              <div className="word-form-pair">
                <label><span className="word-field-heading">读音 / IPA <small>可选</small></span><input value={draft.pronunciation} onChange={(event) => setDraft({ ...draft, pronunciation: event.target.value })} placeholder="/ˈθʌrə/" /></label>
                <label><span className="word-field-heading">发音提示 <small>可选</small></span><input value={draft.pronunciationNote} onChange={(event) => setDraft({ ...draft, pronunciationNote: event.target.value })} placeholder="例如：THUR-oh，注意 th" /></label>
              </div>
              <label><span className="word-field-heading">意思 <small>可选</small></span><BasicRichTextEditor value={draft.meaning} onChange={(meaning) => setDraft((current) => ({ ...current, meaning }))} ariaLabel="意思" placeholder="输入中文或英文释义" /></label>
              <label><span className="word-field-heading">例句 <small>可选</small></span><BasicRichTextEditor value={draft.example} onChange={(example) => setDraft((current) => ({ ...current, example }))} ariaLabel="例句" placeholder="We need a thorough review before the demo." /></label>
              <div className="word-dialog-actions">
                <button type="button" className="cancel-button" onClick={() => setFormOpen(false)}>取消</button>
                <button type="submit" className="save-button"><Check size={16} /> 保存</button>
              </div>
            </form>
          </section>
        </div>
      )}

      <AuthDialog
        open={authOpen}
        email={userEmail}
        onClose={() => setAuthOpen(false)}
        onSignedIn={() => void sync()}
        onSignedOut={() => {
          setUserEmail(undefined);
          setWords(wordStore.setScope());
          setSyncMessage("已退出登录");
        }}
      />
    </div>
  );
}