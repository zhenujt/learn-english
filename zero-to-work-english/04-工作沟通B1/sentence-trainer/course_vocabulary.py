import re
from typing import Any

import eng_to_ipa


class CourseVocabulary:
    """Resolve vocabulary metadata and phonetics for the workplace course."""

    MEANINGS = {
        "shall": "将；……好吗", "we": "我们", "get": "使进入；获得", "started": "开始；着手",
        "yes": "是的；好的", "let's": "让我们……吧", "you": "你；你们", "me": "我（宾格）",
        "loud": "响亮的；大声地", "and": "和；并且", "clear": "清楚的", "see": "看见；明白",
        "my": "我的", "i": "我", "it": "它；这件事", "is": "是；处于", "here": "这里；在场",
        "are": "是；处于", "still": "仍然", "for": "为了；给；对于", "name": "姓名；名称",
        "what": "什么", "the": "这个；那个（定冠词）", "topic": "主题；议题", "on": "在……上；关于",
        "next": "下一个；接下来", "how": "怎样；多少", "much": "许多；很", "do": "做；助动词",
        "have": "有；进行", "about": "大约；关于", "minutes": "分钟", "move": "移动；继续",
        "to": "到；向；用于不定式", "does": "做；助动词", "anything": "任何事物", "add": "添加；补充",
        "nothing": "没有什么", "from": "来自；从", "this": "这个；这件事", "offline": "离线的；未上线的",
        "sure": "当然；确定的", "message": "消息；给……发消息", "after": "在……之后", "share": "分享",
        "notes": "笔记；会议记录", "send": "发送", "them": "他们；它们（宾格）", "shortly": "很快；不久",
        "that": "那个；那件事", "please": "请", "said": "说了", "key": "关键的；关键点",
        "speak": "说话", "a": "一个（不定冠词）", "little": "一点；少量的", "more": "更多；更加",
        "of": "……的；属于", "course": "当然；课程", "by": "通过；由", "term": "术语；期限",
        "simple": "简单的", "explanation": "解释；说明", "again": "再次", "let": "让；允许",
        "another": "另一个", "way": "方式；方法", "give": "给；提供", "an": "一个（不定冠词）",
        "did": "做了；助动词", "correct": "正确的；纠正", "or": "或者", "b": "B；第二项",
        "am": "是；处于", "put": "放置；写入", "in": "在……里", "chat": "聊天；聊天窗口",
        "post": "发布；帖子", "now": "现在", "was": "是；处于（过去式）", "last": "上一个；持续",
        "make": "使得；制作", "sense": "意义；道理", "current": "当前的", "status": "状态；进度",
        "progress": "进展；进度", "track": "跟踪；轨道", "date": "日期", "when": "什么时候；当……时",
        "be": "是；成为", "left": "剩余的；离开了", "need": "需要", "access": "访问权限；访问",
        "api": "应用程序接口", "any": "任何；一些", "with": "和；带有；使用", "who": "谁",
        "finished": "已完成的；完成了", "not": "不；没有", "yet": "还；尚未", "expect": "预计；期望",
        "us": "我们（宾格）", "done": "完成的", "remaining": "剩余的", "take": "花费；拿取",
        "friday": "星期五", "works": "可行；有效", "which": "哪一个；哪个", "has": "有；已经",
        "highest": "最高的", "top": "最高的；首要的", "wait": "等待", "until": "直到",
        "week": "星期；周", "long": "长的；长时间", "two": "二；两个", "three": "三；三个",
        "days": "天；工作日", "reduce": "减少", "start": "开始", "create": "创建",
        "one": "一；一个", "problem": "问题", "solving": "解决", "helping": "帮助",
        "users": "用户（复数）", "goal": "目标", "mainly": "主要地", "group": "群体；组",
        "acceptance": "验收；接受", "criteria": "标准（复数）", "part": "部分", "required": "必需的；被要求的",
        "first": "第一；首先", "no": "不；没有", "later": "稍后；更晚", "if": "如果",
        "fails": "失败；出错", "backward": "向后的；向后", "compatible": "兼容的", "needs": "需要",
        "action": "行动；操作", "changed": "已改变；已变更", "added": "已添加", "yesterday": "昨天",
        "sends": "发送", "returns": "返回", "result": "结果", "why": "为什么",
        "easier": "更容易的", "risks": "风险（复数）", "main": "主要的", "trade-offs": "取舍（复数）",
        "but": "但是", "uses": "使用", "use": "使用", "alternative": "替代方案；可替代的",
        "affect": "影响", "clients": "客户端；客户（复数）", "worker": "工作进程；工作者", "instances": "实例（复数）",
        "happens": "发生", "case": "情况；案例", "retried": "已重试", "reuse": "复用",
        "code": "代码", "most": "大部分；最", "pushed": "已推送", "your": "你的；你们的",
        "pr": "拉取请求", "fixes": "修复；修复项", "bug": "缺陷；错误", "adds": "添加",
        "unit": "单元；单位", "check": "检查", "prevents": "防止", "invalid": "无效的",
        "state": "状态", "resolve": "解决", "rebase": "变基；重新基于", "addressed": "已处理；已回应",
        "updates": "更新（复数）", "comment": "评论；评审意见", "only": "只；仅仅", "step": "步骤",
        "then": "然后", "page": "页面", "actually": "实际上", "happened": "发生了",
        "showed": "显示了", "incorrect": "不正确的", "using": "正在使用", "local": "本地的；本地环境",
        "known": "已知的", "already": "已经", "blocker": "阻塞问题", "affects": "影响",
        "fix": "修复；解决", "been": "已经；曾经", "tested": "已测试", "qa": "质量保证；测试团队",
        "verified": "已验证", "temporary": "临时的", "attach": "附加；附上", "show": "显示；表明",
        "going": "正在进行；将要", "fixed": "已修复的", "all": "全部", "checks": "检查项",
        "passing": "通过的；正在通过", "plan": "计划", "succeed": "成功", "completed": "已完成",
        "metrics": "指标（复数）", "look": "看起来；查看", "number": "数量；编号", "think": "认为",
        "good": "好的", "concerns": "担忧（复数）", "concerned": "担心的", "because": "因为",
        "decide": "决定", "decided": "已决定", "follow": "跟随；跟进", "up": "向上；完成",
        "back": "回来；返回", "there": "那里；有", "else": "其他；另外",
    }

    POS_GROUPS = {
        "modal v. · 情态动词": {"shall", "can", "could", "would", "will", "should", "must"},
        "pron. · 代词": {"we", "you", "me", "i", "it", "what", "anything", "nothing", "this", "them", "that", "another", "who", "us", "which", "one", "anyone", "everyone"},
        "det. · 限定词": {"my", "the", "a", "an", "any", "your", "all", "most"},
        "prep. · 介词": {"for", "on", "to", "about", "from", "after", "of", "by", "in", "with", "until"},
        "conj. · 连词": {"and", "or", "but", "if", "because"},
        "interj. · 感叹词": {"yes", "no", "please", "sure"},
        "contr. · 缩写": {"let's"},
        "adv. · 副词": {"here", "still", "how", "much", "shortly", "more", "again", "now", "not", "yet", "later", "mainly", "backward", "then", "actually", "already", "only", "up", "back", "there", "else"},
        "adj. · 形容词": {"loud", "clear", "offline", "key", "little", "simple", "current", "left", "remaining", "highest", "top", "long", "main", "compatible", "required", "first", "easier", "alternative", "invalid", "incorrect", "local", "known", "temporary", "fixed", "passing", "good", "concerned"},
        "num. · 数词": {"two", "three"},
        "v. · 动词": {"get", "started", "see", "is", "are", "do", "have", "move", "does", "add", "share", "send", "said", "speak", "let", "give", "did", "correct", "am", "put", "post", "was", "make", "be", "need", "finished", "expect", "done", "take", "works", "has", "wait", "reduce", "start", "create", "solving", "helping", "fails", "needs", "changed", "added", "sends", "returns", "uses", "use", "affect", "happens", "retried", "reuse", "pushed", "fixes", "adds", "check", "prevents", "resolve", "rebase", "addressed", "updates", "happened", "showed", "using", "affects", "fix", "been", "tested", "verified", "attach", "show", "going", "checks", "succeed", "completed", "look", "think", "decide", "decided", "follow"},
    }

    POS_ABBREVIATIONS = {
        "名词": "n. · 名词", "动词": "v. · 动词", "形容词": "adj. · 形容词", "副词": "adv. · 副词",
        "代词": "pron. · 代词", "情态动词": "modal v. · 情态动词", "动词/名词": "v./n. · 动词/名词",
        "名词/动词": "n./v. · 名词/动词", "形容词/动词": "adj./v. · 形容词/动词",
        "形容词/副词": "adj./adv. · 形容词/副词", "副词/名词": "adv./n. · 副词/名词",
        "动词/形容词": "v./adj. · 动词/形容词", "名词/形容词": "n./adj. · 名词/形容词",
        "形容词比较级": "adj. · 形容词比较级", "形容词/副词比较级": "adj./adv. · 比较级",
    }

    PHONETIC_OVERRIDES = {
        "api": ("ˌeɪ piː ˈaɪ", "ˌeɪ piː ˈaɪ", "͵e pi ˋaɪ"),
        "pr": ("ˌpiːˈɑːr", "ˌpiːˈɑː", "͵piˋɑr"),
        "rebase": ("ˌriːˈbeɪs", "ˌriːˈbeɪs", "͵riˋbes"),
        "qa": ("ˌkjuːˈeɪ", "ˌkjuːˈeɪ", "͵kjuˋe"),
        "workaround": ("ˈwɜːrkəraʊnd", "ˈwɜːkəraʊnd", "ˋwɝkəraʊnd"),
    }

    BRITISH_BATH_WORDS = {"after", "answer", "asking", "branch", "example", "faster", "last", "task"}

    @classmethod
    def tokenize(cls, card: dict[str, Any]) -> list[str]:
        """Return unique card words in original reading order."""
        return list(dict.fromkeys(
            word.lower().replace("’", "'")
            for word in re.findall(
                r"[A-Za-z]+(?:['’-][A-Za-z]+)*",
                f"{card['question']} {card['response']}",
            )
        ))

    @classmethod
    def metadata(cls, word: str, known_items: dict[str, dict[str, str]]) -> tuple[str, str]:
        """Return normalized POS and Chinese meaning for one word."""
        known = known_items.get(word)
        if known:
            raw_pos = known["partOfSpeech"]
            pos = cls.POS_ABBREVIATIONS.get(raw_pos, raw_pos)
            return pos, known["meaning"]
        meaning = cls.MEANINGS.get(word)
        if not meaning:
            raise ValueError(f"Missing Chinese meaning for vocabulary word: {word}")
        pos = next((label for label, words in cls.POS_GROUPS.items() if word in words), "n. · 名词")
        return pos, meaning

    @classmethod
    def phonetics(cls, word: str) -> tuple[str, str, str]:
        """Return American IPA, British IPA, and KK notation."""
        if word in cls.PHONETIC_OVERRIDES:
            return cls.PHONETIC_OVERRIDES[word]
        american = eng_to_ipa.convert(word)
        if american.endswith("*"):
            raise ValueError(f"Missing pronunciation for vocabulary word: {word}")
        american = cls._normalize_american(american)
        british = cls._to_british(word, american)
        kk = cls._to_kk(american)
        return american, british, kk

    @staticmethod
    def _normalize_american(value: str) -> str:
        return value.replace("ɑr", "ɑːr").replace("ɔr", "ɔːr")

    @classmethod
    def _to_british(cls, word: str, value: str) -> str:
        british = value.replace("ɝ", "ɜː").replace("ɚ", "ə")
        british = re.sub(r"ɑːr(?=($|[^aeiouɑæɛɪɔʊuəɜ]))", "ɑː", british)
        british = re.sub(r"ɔːr(?=($|[^aeiouɑæɛɪɔʊuəɜ]))", "ɔː", british)
        if word in cls.BRITISH_BATH_WORDS:
            british = british.replace("æ", "ɑː")
        return british

    @staticmethod
    def _to_kk(value: str) -> str:
        return (value.replace("ˈ", "ˋ").replace("ˌ", "͵").replace("ɑːr", "ɑr")
                .replace("ɔːr", "ɔr").replace("iː", "i").replace("uː", "u"))