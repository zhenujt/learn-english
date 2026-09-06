import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, Hash, Volume2 } from "lucide-react";
import { JennySpeechClient } from "./shared/jenny-speech";

const jennySpeech = new JennySpeechClient();
const lessonAudioPath = "audio/documents/326bdc791d130c143374.mp3";

interface SpokenItem {
  label: string;
  text: string;
  note?: string;
}

interface LessonSection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: SpokenItem[];
}

const sections: LessonSection[] = [
  {
    id: "basics",
    eyebrow: "0-20",
    title: "基础数字",
    description: "先熟记这些不规则读法，它们是所有大数的积木。",
    items: [
      "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
      "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
      "eighteen", "nineteen", "twenty",
    ].map((text, index) => ({ label: String(index), text })),
  },
  {
    id: "large-numbers",
    eyebrow: "21-100,000,000",
    title: "整十与大数",
    description: "英语每三位分一组：million → thousand → 最后三位。",
    items: [
      ["30", "thirty"], ["40", "forty"], ["50", "fifty"], ["60", "sixty"],
      ["70", "seventy"], ["80", "eighty"], ["90", "ninety"], ["100", "one hundred"],
      ["1,000", "one thousand"], ["10,000", "ten thousand"],
      ["100,000", "one hundred thousand"], ["1,000,000", "one million"],
      ["10,000,000", "ten million"], ["100,000,000", "one hundred million"],
    ].map(([label, text]) => ({ label, text })),
  },
  {
    id: "years",
    eyebrow: "YEARS",
    title: "年份",
    description: "四位年份通常拆成前后两个两位数；2000-2009 常用 two thousand。",
    items: [
      { label: "1900", text: "nineteen hundred" },
      { label: "1905", text: "nineteen oh five" },
      { label: "1984", text: "nineteen eighty-four" },
      { label: "2000", text: "two thousand" },
      { label: "2008", text: "two thousand and eight" },
      { label: "2010", text: "twenty ten", note: "也可以说 two thousand and ten" },
      { label: "2026", text: "twenty twenty-six", note: "也可以说 two thousand and twenty-six" },
    ],
  },
  {
    id: "months",
    eyebrow: "MONTHS",
    title: "月份",
    description: "月份首字母必须大写，月份前使用 in。",
    items: [
      ["一月", "January"], ["二月", "February"], ["三月", "March"],
      ["四月", "April"], ["五月", "May"], ["六月", "June"],
      ["七月", "July"], ["八月", "August"], ["九月", "September"],
      ["十月", "October"], ["十一月", "November"], ["十二月", "December"],
    ].map(([label, text]) => ({ label, text })),
  },
  {
    id: "weekdays",
    eyebrow: "WEEKDAYS",
    title: "星期",
    description: "星期首字母必须大写，星期前使用 on。",
    items: [
      ["星期一", "Monday"], ["星期二", "Tuesday"], ["星期三", "Wednesday"],
      ["星期四", "Thursday"], ["星期五", "Friday"], ["星期六", "Saturday"],
      ["星期日", "Sunday"],
    ].map(([label, text]) => ({ label, text })),
  },
];

const examples: SpokenItem[] = [
  { label: "21", text: "twenty-one", note: "整十 + 个位" },
  { label: "105", text: "one hundred and five", note: "美式英语也常省略 and" },
  { label: "2,026", text: "two thousand and twenty-six", note: "这里读普通数字" },
  { label: "45,678", text: "forty-five thousand six hundred and seventy-eight" },
  { label: "3,405,019", text: "three million four hundred and five thousand and nineteen" },
  { label: "例句", text: "The new office will open in twenty twenty-six.", note: "新办公室将在 2026 年启用。" },
  { label: "例句", text: "My birthday is in September.", note: "我的生日在九月。" },
  { label: "例句", text: "The meeting is on Wednesday.", note: "会议在星期三。" },
  { label: "例句", text: "Today is September sixth, twenty twenty-six.", note: "今天是 2026 年 9 月 6 日。" },
];

interface SpeechState {
  key: string;
  error: boolean;
}

/** Interactive reference for English numbers, years, months, and weekdays. */
export function NumberPage() {
  const [speech, setSpeech] = useState<SpeechState>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef(0);

  useEffect(() => () => {
    requestRef.current += 1;
    audioRef.current?.pause();
    if (audioRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
    window.speechSynthesis?.cancel();
  }, []);

  const stopAudio = () => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio?.src.startsWith("blob:")) URL.revokeObjectURL(audio.src);
    audioRef.current = null;
  };

  const speakWithSystem = (text: string, key: string) => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setSpeech({ key, error: true });
      return;
    }
    requestRef.current += 1;
    stopAudio();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === "en-us")
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en"))
      ?? null;
    utterance.onend = () => setSpeech((current) => current?.key === key ? undefined : current);
    utterance.onerror = () => setSpeech({ key, error: true });
    setSpeech({ key, error: false });
    window.speechSynthesis.speak(utterance);
  };

  const speak = async (text: string, key: string) => {
    if (!jennySpeech.available) {
      speakWithSystem(text, key);
      return;
    }
    const request = ++requestRef.current;
    stopAudio();
    window.speechSynthesis?.cancel();
    setSpeech({ key, error: false });
    try {
      const blob = await jennySpeech.synthesize(text);
      if (request !== requestRef.current) return;
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current === audio) {
          stopAudio();
          setSpeech(undefined);
        }
      };
      audio.onerror = () => speakWithSystem(text, key);
      await audio.play();
    } catch {
      if (request === requestRef.current) speakWithSystem(text, key);
    }
  };

  const spokenItem = (item: SpokenItem, key: string) => (
    <article className="number-item" key={key}>
      <span className="number-item-label">{item.label}</span>
      <div>
        <strong>{item.text}</strong>
        {item.note && <small>{item.note}</small>}
      </div>
      <button
        className={`word-audio${speech?.key === key && !speech.error ? " is-speaking" : ""}`}
        onClick={() => void speak(item.text, key)}
        aria-label={`朗读 ${item.text}`}
        title="朗读"
      >
        <Volume2 size={17} />
      </button>
    </article>
  );

  return (
    <div className="number-shell">
      <header className="topbar number-topbar">
        <a className="icon-button" href={import.meta.env.BASE_URL} aria-label="返回文档" title="返回文档">
          <ArrowLeft size={20} />
        </a>
        <a className="brand" href={import.meta.env.BASE_URL}>
          <span className="brand-mark"><BookOpen size={19} /></span>
          <span>Learn <strong>English</strong></span>
        </a>
        <nav className="number-jump" aria-label="页面目录">
          <a href="#years">年份</a>
          <a href="#months">月份</a>
          <a href="#weekdays">星期</a>
          <a href="#practice">练习</a>
        </nav>
      </header>

      <main className="number-main">
        <section className="number-hero">
          <div>
            <span className="words-kicker">NUMBER & CALENDAR LAB</span>
            <h1>从 zero 到 one hundred million</h1>
            <p>数字、年份、月份、星期，一页听懂并练会。</p>
          </div>
          <div className="number-audio-panel">
            <div><Volume2 size={20} /><span><strong>完整课程音频</strong><small>中文提示 + 英文三遍跟读</small></span></div>
            <audio controls preload="metadata" src={`${import.meta.env.BASE_URL}${lessonAudioPath}`}>
              当前浏览器不支持音频播放。
            </audio>
          </div>
        </section>

        <aside className="number-rule">
          <Hash size={22} />
          <div><strong>核心规则：每三位分组</strong><span>3 | 405 | 019 = three million | four hundred and five thousand | nineteen</span></div>
        </aside>

        {sections.map((section) => (
          <section className="number-section" id={section.id} key={section.id}>
            <header>
              <span>{section.eyebrow}</span>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </header>
            <div className="number-grid">
              {section.items.map((item, index) => spokenItem(item, `${section.id}-${index}`))}
            </div>
          </section>
        ))}

        <section className="number-section number-examples">
          <header><span>PUT IT TOGETHER</span><h2>组合读法与例句</h2><p>从数字规则过渡到真实表达。</p></header>
          <div className="number-grid number-example-grid">
            {examples.map((item, index) => spokenItem(item, `example-${index}`))}
          </div>
        </section>

        <section className="number-practice" id="practice">
          <div className="number-practice-heading"><CheckCircle2 size={24} /><div><span>SELF CHECK</span><h2>练习题</h2></div></div>
          <div className="number-questions">
            <div><strong>A. 读出数字</strong><p>16 · 108 · 2,026 · 75,300 · 6,020,014 · 100,000,000</p></div>
            <div><strong>B. 读出年份</strong><p>1905 · 1987 · 2000 · 2008 · 2026</p></div>
            <div><strong>C. 填空</strong><p>The day after Monday is ____.<br />Christmas is in ____.<br />The meeting is ____ Friday.</p></div>
          </div>
          <details>
            <summary>查看答案</summary>
            <p><strong>A.</strong> sixteen; one hundred and eight; two thousand and twenty-six; seventy-five thousand three hundred; six million twenty thousand and fourteen; one hundred million</p>
            <p><strong>B.</strong> nineteen oh five; nineteen eighty-seven; two thousand; two thousand and eight; twenty twenty-six</p>
            <p><strong>C.</strong> Tuesday; December; on</p>
          </details>
        </section>

        {speech?.error && <p className="number-speech-error" role="alert">无法播放，请检查浏览器的英文语音设置。</p>}
      </main>
    </div>
  );
}