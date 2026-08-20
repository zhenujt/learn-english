import { useDeferredValue, useState, type FormEvent, type ReactNode } from 'react'
import { Check, ChevronRight, Download, Headphones, LogIn, LogOut, Mail, Repeat2, RotateCcw, Search, Snail, Sparkles, Square, UserRound, Volume2 } from 'lucide-react'
import { authConfigured, supabase } from './auth'
import type { ReviewScheduler } from './services'
import type { ReviewGrade, StudyCard } from './types'

interface StudyViewProps {
  card: StudyCard | undefined
  current: number
  total: number
  revealed: boolean
  onReveal: () => void
  onGrade: (grade: ReviewGrade) => void
  preview: Record<ReviewGrade, string>
  onPlay: (source: string) => Promise<void>
  onToggleLoop: (sources: string[], onStateChange: (looping: boolean) => void) => void
  onRestart: () => void
}

/** Renders the active recall card and post-reveal review controls. */
export function StudyView({ card, current, total, revealed, onReveal, onGrade, preview, onPlay, onToggleLoop, onRestart }: StudyViewProps) {
  const [looping, setLooping] = useState(false)

  if (!card) {
    return (
      <section className="completion-view">
        <div className="completion-check"><Check size={38} /></div>
        <p className="eyebrow">今日完成</p>
        <h1>十句，已经进脑子了。</h1>
        <p>先休息一下。明天系统会把该复习的句子重新排到前面。</p>
        <button className="primary-button" type="button" onClick={onRestart}><RotateCcw size={19} /> 再来一组</button>
      </section>
    )
  }

  return (
    <section className="study-view">
      <div className="session-row">
        <div><span>今日复习</span><strong>{current + 1}<small> / {total}</small></strong></div>
        <div className="progress-track" aria-label={`学习进度 ${current + 1}/${total}`}><span style={{ width: `${((current + 1) / total) * 100}%` }}></span></div>
      </div>

      <article className={`study-card ${revealed ? 'is-revealed' : ''}`}>
        <div className="card-meta"><span>#{String(card.id).padStart(3, '0')}</span><span>{card.category}</span></div>
        {!revealed ? (
          <div className="recall-face">
            <p className="prompt-label">看到中文，先说出完整英文</p>
            <h1>{card.questionZh}</h1>
            <div className="reply-cue"><span>回答</span><p>{card.responseZh}</p></div>
            <button className="reveal-button" type="button" onClick={onReveal}>显示答案 <ChevronRight size={20} /></button>
            <p className="recall-tip"><Sparkles size={17} /> 想不起来也先开口，再翻面核对。</p>
          </div>
        ) : (
          <div className="answer-face">
            <div className="sentence-block"><span className="sentence-role">QUESTION</span><h1>{card.question}</h1><p>{card.questionZh}</p></div>
            <div className="sentence-block response-block"><span className="sentence-role">RESPONSE</span><h2>{card.response}</h2><p>{card.responseZh}</p></div>
            <AudioPanel card={card} looping={looping} onPlay={(source) => { setLooping(false); void onPlay(source) }} onToggleLoop={() => onToggleLoop([
              card.naturalAudio,
              card.clearAudio,
              card.jennyNaturalAudio,
              card.jennyClearAudio,
            ], setLooping)} />
            <VocabularyPanel card={card} />
            <GrammarPanel card={card} />
          </div>
        )}
      </article>

      {revealed && (
        <div className="grade-panel">
          <p>刚才能独立说出来吗？</p>
          <div className="grade-buttons">
            <button className="grade-again" type="button" onClick={() => onGrade('again')}><strong>重来</strong><small>{preview.again}</small></button>
            <button className="grade-hard" type="button" onClick={() => onGrade('hard')}><strong>困难</strong><small>{preview.hard}</small></button>
            <button className="grade-good" type="button" onClick={() => onGrade('good')}><strong>良好</strong><small>{preview.good}</small></button>
            <button className="grade-easy" type="button" onClick={() => onGrade('easy')}><strong>简单</strong><small>{preview.easy}</small></button>
          </div>
        </div>
      )}
    </section>
  )
}

function AudioPanel({ card, looping, onPlay, onToggleLoop }: { card: StudyCard; looping: boolean; onPlay: (source: string) => void; onToggleLoop: () => void }) {
  return (
    <section className="audio-panel" aria-label="发音播放控制">
      <div className="audio-panel-header">
        <span>发音</span>
        <button className={`loop-button ${looping ? 'is-playing' : ''}`} type="button" aria-pressed={looping} onClick={onToggleLoop}>
          {looping ? <Square size={15} /> : <Repeat2 size={17} />}{looping ? '停止循环' : '循环全部'}
        </button>
      </div>
      <div className="voice-row"><strong>Aria</strong><div className="audio-modes">
        <button className="natural-audio" type="button" onClick={() => onPlay(card.naturalAudio)}><Volume2 size={17} />连读</button>
        <button className="clear-audio" type="button" onClick={() => onPlay(card.clearAudio)}><Snail size={17} />分词</button>
      </div></div>
      <div className="voice-row"><strong>Jenny</strong><div className="audio-modes">
        <button className="natural-audio" type="button" onClick={() => onPlay(card.jennyNaturalAudio)}><Volume2 size={17} />连读</button>
        <button className="clear-audio" type="button" onClick={() => onPlay(card.jennyClearAudio)}><Snail size={17} />分词</button>
      </div></div>
    </section>
  )
}

function VocabularyPanel({ card }: { card: StudyCard }) {
  return (
    <details className="vocabulary-panel" open>
      <summary><span>全部词汇 · 美式 IPA / 英式 IPA / KK</span><small>{card.grammar.vocabulary.length} 词</small></summary>
      <div className="vocabulary-list">
        {card.grammar.vocabulary.map((item) => (
          <article key={item.word}>
            <div className="word-summary"><strong>{item.word}</strong><span>{item.partOfSpeech}</span><p>{item.meaning}</p></div>
            <div className="pronunciations">
              <div><span>美式 IPA</span>/{item.americanIpa}/</div>
              <div><span>英式 IPA</span>/{item.britishIpa}/</div>
              <div><span>KK</span>/{item.kk}/</div>
            </div>
          </article>
        ))}
      </div>
    </details>
  )
}

function GrammarPanel({ card }: { card: StudyCard }) {
  return (
    <div className="grammar-panel">
      <div className="grammar-heading"><span>句子拆解</span><small>先骨架，再替换</small></div>
      <dl className="grammar-grid">
        <div><dt>问句句型</dt><dd>{card.grammar.questionPattern}</dd></div>
        <div><dt>回答句型</dt><dd>{card.grammar.responsePattern}</dd></div>
        <div><dt>时态</dt><dd>{card.grammar.tense}</dd></div>
        <div className="chunk-row"><dt>意群切块</dt><dd>{card.grammar.chunks}</dd></div>
      </dl>
      <div className="memory-method"><Headphones size={19} /><p><strong>三遍影子跟读：</strong>先听清晰分词版，看文本跟读；再听自然连读版，不看文本复述；最后替换方括号内容造一个自己的句子。</p></div>
    </div>
  )
}

/** Displays and filters the complete sentence library. */
export function LibraryView({ cards, onPlay }: { cards: StudyCard[]; onPlay: (source: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.toLowerCase())
  const filteredCards = cards.filter((card) => `${card.question} ${card.response} ${card.questionZh} ${card.responseZh}`.toLowerCase().includes(deferredQuery))

  return (
    <section className="library-view">
      <div className="page-heading"><p className="eyebrow">完整句库</p><h1>100 个工作场景</h1><p>搜索中文、英文或软件术语，点喇叭直接复听。</p></div>
      <label className="search-box"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索句子，例如 PR、发布、阻塞…" /></label>
      <div className="result-count">找到 {filteredCards.length} 句</div>
      <div className="sentence-list">
        {filteredCards.map((card) => (
          <article key={card.id}>
            <div className="sentence-number">{String(card.id).padStart(3, '0')}</div>
            <div className="sentence-copy"><span>{card.category}</span><h2>{card.question}</h2><p>{card.questionZh}</p><strong>{card.response}</strong><small>{card.grammar.tense}</small></div>
            <button className="list-play" type="button" onClick={() => onPlay(card.naturalAudio)} title="播放自然连读"><Volume2 size={20} /></button>
          </article>
        ))}
      </div>
    </section>
  )
}

/** Shows spaced-repetition metrics, memory guidance, and install instructions. */
export function ProgressView({ cards, scheduler, onReset }: { cards: StudyCard[]; scheduler: ReviewScheduler; onReset: () => void }) {
  const [revision, setRevision] = useState(0)
  const stats = scheduler.getStats()
  const resetProgress = () => {
    if (!window.confirm('确定清空全部学习记录吗？句子和音频不会删除。')) return
    scheduler.reset()
    setRevision((value) => value + 1)
    onReset()
  }

  return (
    <section className="progress-view" data-revision={revision}>
      <div className="page-heading"><p className="eyebrow">复习节奏</p><h1>不是刷完，是记住。</h1><p>系统根据你的评分安排下一次出现时间。</p></div>
      <div className="stats-grid">
        <div className="stat-primary"><span>已学习</span><strong>{stats.learned}<small> / {cards.length}</small></strong><div className="progress-track"><span style={{ width: `${stats.learned}%` }}></span></div></div>
        <div><span>已掌握</span><strong>{stats.mastered}</strong><small>记忆强度超过 21 天</small></div>
        <div><span>待复习</span><strong>{stats.due}</strong><small>现在到期</small></div>
        <div><span>总复习</span><strong>{stats.totalReviews}</strong><small>每次开口都算</small></div>
        <div><span>真实保持率</span><strong>{Math.round(stats.retention * 100)}%</strong><small>目标 90%</small></div>
        <div><span>平均记忆强度</span><strong>{stats.averageStability.toFixed(1)}<small> 天</small></strong><small>越大越牢固</small></div>
        <div><span>顽固卡片</span><strong>{stats.leeches}</strong><small>遗忘 8 次以上</small></div>
        <div><span>连续天数</span><strong>{stats.streak}</strong><small>保持短而稳定</small></div>
      </div>
      <div className="method-section">
        <h2>推荐记忆法</h2>
        <ol>
          <li><span>01</span><div><strong>主动回忆</strong><p>只看中文，必须先开口，再显示答案。看懂不等于会说。</p></div></li>
          <li><span>02</span><div><strong>意群记忆</strong><p>按斜线分块，不背孤立单词：Can you / give us / an update?</p></div></li>
          <li><span>03</span><div><strong>双速影子跟读</strong><p>清晰分词听边界，自然连读练真实听力，每句各跟三遍。</p></div></li>
          <li><span>04</span><div><strong>替换造句</strong><p>把 [task]、[date]、[feature] 换成当天真实工作，记忆会更牢。</p></div></li>
        </ol>
      </div>
      <div className="install-note"><Download size={21} /><div><strong>安装到手机</strong><p>Android 用浏览器菜单选择“安装应用”；iPhone 在 Safari 点“分享”，再选“添加到主屏幕”。</p></div></div>
      <button className="reset-button" type="button" onClick={resetProgress}>清空学习记录</button>
    </section>
  )
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset'

/** Provides email/password login, registration, password reset, and logout. */
export function AuthView({ email, resetRequested, onSignedOut }: { email?: string; resetRequested: boolean; onSignedOut: () => void }) {
  const [mode, setMode] = useState<AuthMode>(resetRequested ? 'reset' : 'login')
  const [formEmail, setFormEmail] = useState(email ?? '')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!supabase) {
      setError('云端登录尚未配置，当前使用本地模式。')
      return
    }
    setPending(true)
    const result = mode === 'forgot'
      ? await supabase.auth.resetPasswordForEmail(formEmail, { redirectTo: window.location.origin })
      : mode === 'reset'
        ? await supabase.auth.updateUser({ password })
      : mode === 'signup'
        ? await supabase.auth.signUp({ email: formEmail, password })
        : await supabase.auth.signInWithPassword({ email: formEmail, password })
    setPending(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    if (mode === 'forgot') setMessage('重置密码邮件已发送，请检查邮箱。')
    if (mode === 'reset') setMessage('密码已更新，请使用新密码登录。')
    if (mode === 'signup') setMessage('注册成功，请检查邮箱完成验证。')
    if (mode === 'login') setMessage('登录成功。')
  }

  const title = mode === 'login' ? '登录账号' : mode === 'signup' ? '创建账号' : mode === 'forgot' ? '找回密码' : '设置新密码'

  return (
    <section className="auth-view">
      <div className="page-heading"><p className="eyebrow">云端同步</p><h1>{title}</h1><p>{mode === 'forgot' ? '输入注册邮箱，我们会发送密码重置链接。' : mode === 'reset' ? '请输入新的账号密码。' : '登录后可以在不同设备同步学习记录。'}</p></div>
      <form className="auth-form" onSubmit={submit}>
        {mode !== 'reset' && <label>邮箱<input type="email" autoComplete="email" value={formEmail} onChange={(event) => setFormEmail(event.target.value)} required placeholder="you@example.com" /></label>}
        {mode !== 'forgot' && <label>密码<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required placeholder="至少 6 位" /></label>}
        <button className="primary-button" type="submit" disabled={pending}>{pending ? '处理中…' : mode === 'login' ? <><LogIn size={18} /> 登录</> : mode === 'signup' ? <><UserRound size={18} /> 注册</> : mode === 'reset' ? <><UserRound size={18} /> 更新密码</> : <><Mail size={18} /> 发送重置邮件</>}</button>
      </form>
      {message && <p className="auth-message">{message}</p>}
      {error && <p className="auth-error">{error}</p>}
      {authConfigured ? (
        <div className="auth-links">
          {mode === 'login' && <><button type="button" onClick={() => setMode('forgot')}>忘记密码？</button><button type="button" onClick={() => setMode('signup')}>创建新账号</button></>}
          {mode !== 'login' && mode !== 'reset' && <button type="button" onClick={() => setMode('login')}>返回登录</button>}
        </div>
      ) : <p className="auth-config-note">管理员还没有配置 Supabase，网站目前仍可直接使用本地学习模式。</p>}
      {email && <button className="logout-button" type="button" onClick={async () => { await supabase?.auth.signOut(); onSignedOut() }}><LogOut size={17} /> 退出登录</button>}
    </section>
  )
}

/** A compact bottom-navigation action. */
export function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'active' : ''} type="button" onClick={onClick}>{icon}<span>{label}</span></button>
}