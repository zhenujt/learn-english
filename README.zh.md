# 成人零基础英语语法大全（中文主教材）

**对象**：30 岁以上、从零开始，希望能在生活与软件开发工作中听说读写的人。

**使用方法**：按编号学习。每课先读“定义”和“公式”，大声读例句，再完成测验；测验错误时回到“常见错误”。不要只背中文意思，要把公式替换成自己的真实信息。

## 学习路线

### 基础篇：先造出正确的简单句

1. [01 词类与句子成分](01-foundations/01-word-classes-and-sentence-parts.zh.md)
2. [02 名词、冠词与限定词](01-foundations/02-nouns-articles-determiners.zh.md)
3. [03 五大基本句型](01-foundations/03-five-basic-sentence-patterns.zh.md)
4. [04 三大基本时态](01-foundations/04-three-basic-tenses.zh.md)
5. [05 否定、疑问与祈使句](01-foundations/05-questions-negatives-imperatives.zh.md)
6. [06 代词、形容词、副词与比较](01-foundations/06-pronouns-modifiers-comparison.zh.md)
7. [07 情态动词、介词和连词](01-foundations/07-modals-prepositions-conjunctions.zh.md)

### 进阶篇：把简单句连接成准确的信息

8. [08 完成、进行、被动与主谓一致](02-intermediate/08-aspect-passive-agreement.zh.md)
9. [09 不定式、动名词与分词](02-intermediate/09-nonfinite-verbs.zh.md)
10. [10 名词性从句](02-intermediate/10-noun-clauses.zh.md)
11. [11 定语从句](02-intermediate/11-relative-clauses.zh.md)
12. [12 状语从句](02-intermediate/12-adverbial-clauses.zh.md)
13. [13 间接引语与长句组织](02-intermediate/13-reported-speech-and-long-sentences.zh.md)

### 高级篇：表达假设、重点与正式论证

14. [14 条件句与虚拟语气](03-advanced/14-conditionals-and-subjunctive.zh.md)
15. [15 倒装与强调句](03-advanced/15-inversion-and-emphasis.zh.md)
16. [16 省略、替代与平行结构](03-advanced/16-ellipsis-substitution-parallelism.zh.md)
17. [17 独立主格与分词结构](03-advanced/17-absolute-constructions-and-participles.zh.md)
18. [18 正式写作、衔接与综合复盘](03-advanced/18-formal-writing-and-review.zh.md)

每一课都有英文复习版，路径相同但去掉 `.zh`：例如 `01-word-classes-and-sentence-parts.md`。

## 文档音频

文档网站会在每篇 Markdown 标题下显示音频区域。生成后的音频依次朗读每组已有中英例句：中文一遍，然后使用慢速 `en-US-MichelleNeural` 朗读英文三遍。

安装 `edge-tts` 和 FFmpeg 后，可以生成单篇文档音频：

```sh
npm --prefix docs-site run audio:document -- "path/to/lesson.zh.md"
```

也可以增量生成所有符合条件的文档：

```sh
npm --prefix docs-site run audio:all
```

语音分段缓存位于 `docs-site/.audio-cache`，最终 MP3 位于 `docs-site/public/audio/documents`。

## 达标标准

- 基础篇后：能介绍自己、描述日程、询问和回答工作中的简单问题。
- 进阶篇后：能解释 bug、写清晰 issue、阅读常见技术文档，并在会议中说明原因与条件。
- 高级篇后：能写有逻辑的邮件、设计说明和英语考试中的论证段落。