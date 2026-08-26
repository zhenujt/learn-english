import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const courseDirectory = path.resolve(projectDirectory, '..')
const documentPath = path.join(courseDirectory, 'software-business-english-must-know.zh.md')
const outputPath = path.join(projectDirectory, 'src', 'data', 'cards.json')
const publicAudioPath = path.join(projectDirectory, 'public', 'audio')

const lexicon = [
  ['get started', '动词短语', '开始'],
  ['loud and clear', '形容词短语', '清楚响亮地'],
  ['make sense', '动词短语', '说得通；有道理'],
  ['on track', '形容词短语', '按计划进行'],
  ['acceptance criteria', '名词短语', '验收标准'],
  ['backward compatible', '形容词短语', '向后兼容的'],
  ['get back to', '动词短语', '回复'],
  ['in progress', '形容词短语', '进行中'],
  ['move on', '动词短语', '继续；进入下一项'],
  ['follow up', '动词短语', '跟进'],
  ['workaround', '名词', '临时解决方法'],
  ['deployment', '名词', '部署'],
  ['requirement', '名词', '需求'],
  ['implementation', '名词', '实现；开发'],
  ['environment', '名词', '环境'],
  ['performance', '名词', '性能'],
  ['documentation', '名词', '文档'],
  ['automatically', '副词', '自动地'],
  ['consistently', '副词', '稳定地；一致地'],
  ['successfully', '副词', '成功地'],
  ['realistic', '形容词', '现实可行的'],
  ['existing', '形容词', '现有的'],
  ['expected', '形容词', '预期的'],
  ['affected', '形容词', '受影响的'],
  ['blocking', '动词/形容词', '阻塞；造成阻碍的'],
  ['staging', '名词/形容词', '预发布环境（的）'],
  ['production', '名词', '生产环境'],
  ['priority', '名词', '优先级'],
  ['deadline', '名词', '截止日期'],
  ['estimate', '动词/名词', '估计'],
  ['postpone', '动词', '推迟'],
  ['feature', '名词', '功能'],
  ['behavior', '名词', '行为'],
  ['release', '动词/名词', '发布'],
  ['request', '动词/名词', '请求'],
  ['maintain', '动词', '维护'],
  ['trade-off', '名词', '取舍'],
  ['impact', '名词/动词', '影响'],
  ['instance', '名词', '实例'],
  ['reused', '动词', '被复用'],
  ['review', '动词/名词', '评审'],
  ['integration', '名词/形容词', '集成（的）'],
  ['prevent', '动词', '防止'],
  ['conflict', '名词', '冲突'],
  ['suggestion', '名词', '建议'],
  ['reproduce', '动词', '复现'],
  ['verify', '动词', '验证'],
  ['rollback', '名词', '回滚'],
  ['restore', '动词', '恢复'],
  ['metric', '名词', '指标'],
  ['approach', '名词', '方案；方法'],
  ['decision', '名词', '决定'],
  ['agenda', '名词', '议程'],
  ['anyone', '代词', '任何人'],
  ['mean', '动词', '意思是'],
  ['asking', '动词', '正在询问'],
  ['point', '名词', '要点'],
  ['else', '副词', '其他；另外'],
  ['begin', '动词', '开始'],
  ['hear', '动词', '听见'],
  ['everyone', '代词', '每个人'],
  ['time', '名词', '时间'],
  ['today', '副词/名词', '今天'],
  ['help', '动词/名词', '帮助'],
  ['task', '名词', '任务'],
  ['work', '动词/名词', '工作；处理'],
  ['user', '名词', '用户'],
  ['system', '名词', '系统'],
  ['option', '名词', '选项；方案'],
  ['change', '动词/名词', '改变；变更'],
  ['happen', '动词', '发生'],
  ['choose', '动词', '选择'],
  ['simpler', '形容词比较级', '更简单的'],
  ['faster', '形容词/副词比较级', '更快的（地）'],
  ['small', '形容词', '小的'],
  ['continue', '动词', '继续'],
  ['morning', '名词', '早晨'],
  ['update', '动词/名词', '更新；进度汇报'],
  ['flow', '名词', '流程'],
  ['latest', '形容词', '最新的'],
  ['previous', '形容词', '之前的'],
  ['normal', '形容词', '正常的'],
  ['agree', '动词', '同意'],
  ['concern', '动词/名词', '担忧'],
  ['enough', '形容词/副词', '足够的（地）'],
  ['discuss', '动词', '讨论'],
  ['meeting', '名词', '会议'],
  ['explain', '动词', '解释'],
  ['example', '名词', '例子'],
  ['correctly', '副词', '正确地'],
  ['understand', '动词', '理解'],
  ['working', '动词', '正在工作；正在处理'],
  ['complete', '形容词/动词', '完成的；完成'],
  ['testing', '名词', '测试'],
  ['ready', '形容词', '准备好的'],
  ['finish', '动词', '完成'],
  ['waiting', '动词', '正在等待'],
  ['owner', '名词', '负责人'],
  ['urgent', '形容词', '紧急的'],
  ['scope', '名词', '范围'],
  ['support', '动词', '支持'],
  ['error', '名词', '错误'],
  ['client', '名词', '客户端'],
  ['server', '名词', '服务器'],
  ['risk', '名词', '风险'],
  ['memory', '名词', '内存'],
  ['scale', '动词', '扩展'],
  ['logic', '名词', '逻辑'],
  ['changes', '名词', '变更'],
  ['tests', '名词', '测试'],
  ['branch', '名词', '分支'],
  ['comments', '名词', '评审意见'],
  ['issue', '名词', '问题'],
  ['ticket', '名词', '工单'],
  ['logs', '名词', '日志'],
  ['screen', '名词', '屏幕'],
  ['version', '名词', '版本'],
  ['build', '名词', '构建版本'],
  ['stable', '形容词', '稳定的'],
  ['customers', '名词', '客户'],
  ['prefer', '动词', '更倾向于'],
  ['information', '名词', '信息'],
  ['steps', '名词', '步骤'],
  ['clarify', '动词', '澄清'],
  ['repeat', '动词', '重复'],
  ['slowly', '副词', '缓慢地'],
  ['should', '情态动词', '应该'],
  ['could', '情态动词', '可以；能否（委婉）'],
  ['would', '情态动词', '会；愿意'],
  ['will', '情态动词', '将会'],
  ['must', '情态动词', '必须'],
  ['can', '情态动词', '能够；可以'],
]

class GrammarAnalyzer {
  analyze(question, response) {
    const combined = `${question} ${response}`
    return {
      questionPattern: this.questionPattern(question),
      responsePattern: this.responsePattern(response),
      tense: this.detectTenses(combined),
      chunks: `${this.chunk(question)}  →  ${this.chunk(response)}`,
      vocabulary: this.pickVocabulary(combined),
    }
  }

  questionPattern(sentence) {
    const rules = [
      [/^What (?:do|does|did)/i, 'What + do/does/did + 主语 + 动词原形 ...?'],
      [/^What (?:is|are|was|were)/i, 'What + be + 主语/表语 ...?'],
      [/^Wh(?:en|y|ich|o) /i, '特殊疑问词 + 助动词/be + 主语 + ...?'],
      [/^How /i, 'How + 助动词/be + 主语 + ...?'],
      [/^Can /i, 'Can + 主语 + 动词原形 ...?'],
      [/^Could /i, 'Could + 主语 + 动词原形 ...?（委婉请求）'],
      [/^Shall /i, 'Shall + we + 动词原形 ...?（提出建议）'],
      [/^Will /i, 'Will + 主语 + 动词原形 ...?'],
      [/^Do(?:es)? /i, 'Do/Does + 主语 + 动词原形 ...?'],
      [/^Did /i, 'Did + 主语 + 动词原形 ...?'],
      [/^(?:Have|Has) /i, 'Have/Has + 主语 + 过去分词 ...?'],
      [/^(?:Is|Are) /i, 'Be + 主语 + 表语/现在分词 ...?'],
    ]
    return rules.find(([pattern]) => pattern.test(sentence))?.[1] ?? '疑问词/助动词 + 主语 + 谓语 ...?'
  }

  responsePattern(sentence) {
    if (/^(Yes|No|Not yet|Sure|Of course|Nothing)/i.test(sentence)) return '简短回应 + 主语 + 谓语 + 宾语/补语'
    if (/^There (?:is|are)/i.test(sentence)) return 'There be + 名词 + 状语'
    if (/\b(?:can|could|will|should|must)\b/i.test(sentence)) return '主语 + 情态动词 + 动词原形 + 宾语/补语'
    if (/\b(?:am|is|are)\b/i.test(sentence)) return '主语 + be + 表语/现在分词'
    return '主语 + 谓语 + 宾语/补语'
  }

  detectTenses(sentence) {
    const tenses = []
    if (/\b(?:have|has)\b[^.!?]*(?:ed\b|been\b|done\b|finished\b|tested\b|changed\b)/i.test(sentence)) tenses.push('现在完成时')
    if (/\b(?:am|is|are)\b[^.!?]{0,28}\b\w+ing\b/i.test(sentence)) tenses.push('现在进行时')
    if (/\b(?:will|shall)\b/i.test(sentence)) tenses.push('一般将来时')
    if (/\b(?:did|was|were|yesterday|worked|said|chose|showed|added|fixed|pushed)\b/i.test(sentence)) tenses.push('一般过去时')
    if (/\b(?:can|could|should|must|need to)\b/i.test(sentence)) tenses.push('情态动词结构')
    if (tenses.length === 0 || /\b(?:do|does|am|is|are)\b/i.test(sentence)) tenses.unshift('一般现在时')
    return [...new Set(tenses)].join(' + ')
  }

  chunk(sentence) {
    const words = sentence.split(/\s+/)
    const chunks = []
    for (let index = 0; index < words.length; index += 4) chunks.push(words.slice(index, index + 4).join(' '))
    return chunks.join(' / ')
  }

  pickVocabulary(sentence) {
    const normalized = sentence.toLowerCase().replaceAll('-', ' ')
    return lexicon
      .filter(([word]) => normalized.includes(word.replaceAll('-', ' ')))
      .slice(0, 5)
      .map(([word, partOfSpeech, meaning]) => ({ word, partOfSpeech, meaning }))
  }
}

class CourseParser {
  constructor(analyzer) {
    this.analyzer = analyzer
  }

  parse(markdown) {
    const lines = markdown.split('\n')
    const cards = []
    let category = ''

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      if (line === '## 日常英文会议实战脚本') break
      const categoryMatch = line.match(/^## \d+\. (.+)$/)
      if (categoryMatch) category = categoryMatch[1]

      const questionMatch = line.match(/^(\d{1,3})\. \*\*(.+?)\*\* (.+)$/)
      if (!questionMatch) continue
      const responseMatch = lines[index + 1]?.match(/^\s+- \*\*(.+?)\*\* (.+)$/)
      if (!responseMatch) throw new Error(`Missing response for card ${questionMatch[1]}`)

      const id = Number(questionMatch[1])
      const question = questionMatch[2].replaceAll('`', '')
      const response = responseMatch[1].replaceAll('`', '')
      cards.push({
        id,
        category,
        question,
        questionZh: questionMatch[3].replaceAll('`', ''),
        response,
        responseZh: responseMatch[2].replaceAll('`', ''),
        naturalAudio: `audio/${String(id).padStart(3, '0')}.mp3`,
        clearAudio: `audio/no-linking/${String(id).padStart(3, '0')}.mp3`,
        jennyNaturalAudio: `audio/jenny/${String(id).padStart(3, '0')}.mp3`,
        jennyClearAudio: `audio/jenny/no-linking/${String(id).padStart(3, '0')}.mp3`,
        michelleNaturalAudio: `audio/michelle/${String(id).padStart(3, '0')}.mp3`,
        michelleClearAudio: `audio/michelle/no-linking/${String(id).padStart(3, '0')}.mp3`,
        grammar: this.analyzer.analyze(question, response),
      })
    }
    return cards
  }
}

async function generateIcons() {
  const iconSvg = (size) => Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="112" fill="#ed5b42"/>
      <rect x="92" y="86" width="328" height="340" rx="48" fill="#fffdf8" stroke="#17231f" stroke-width="20"/>
      <path d="M146 176h220M146 246h170M146 316h220" stroke="#17231f" stroke-width="24" stroke-linecap="round"/>
      <circle cx="366" cy="360" r="54" fill="#f5c84c" stroke="#17231f" stroke-width="16"/>
      <path d="M345 360l15 16 29-35" fill="none" stroke="#17231f" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`)
  const iconDirectory = path.join(projectDirectory, 'public', 'icons')
  fs.mkdirSync(iconDirectory, { recursive: true })
  await Promise.all([192, 512].map((size) => sharp(iconSvg(size)).png().toFile(path.join(iconDirectory, `app-${size}.png`))))

  const iosIconPath = path.join(projectDirectory, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png')
  if (fs.existsSync(path.dirname(iosIconPath))) {
    await sharp(iconSvg(1024)).png().toFile(iosIconPath)
  }
}

const cards = new CourseParser(new GrammarAnalyzer()).parse(fs.readFileSync(documentPath, 'utf8'))
if (cards.length !== 100) throw new Error(`Expected 100 cards, found ${cards.length}`)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(cards, null, 2)}\n`)
fs.rmSync(publicAudioPath, { recursive: true, force: true })
fs.cpSync(path.join(courseDirectory, 'audio', 'software-business-english'), publicAudioPath, { recursive: true })
await generateIcons()
console.log(`Generated ${cards.length} cards with six offline audio tracks each.`)