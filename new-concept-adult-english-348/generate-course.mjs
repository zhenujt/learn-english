import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const ROOT = new URL('.', import.meta.url).pathname;

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR KNOWLEDGE BASE — 32 grammar points with rules, examples, errors
// ═══════════════════════════════════════════════════════════════════════════════

const G = {
  be: {
    t: 'be 动词：am / is / are',
    r: `主语决定 be 的形式：I → am；he / she / it / 单数名词 → is；you / we / they / 复数名词 → are。
缩写：I'm, he's, she's, it's, you're, we're, they're。
否定：在 be 后加 not → am not, isn't, aren't。
疑问：把 be 提前 → Is she a developer? Are they ready?`,
    ex: [['I am a software developer.','我是软件开发者。'],['She is from Shanghai.','她来自上海。'],['They are in the meeting room.','他们在会议室里。'],['Is he your manager?','他是你的经理吗？'],['We are not late.','我们没有迟到。']],
    err: [['I is tired.','I am tired.','I 永远搭配 am'],['She am happy.','She is happy.','第三人称单数用 is'],['My name Lin.','My name is Lin.','英语不能省略 be 动词']],
  },
  poss: {
    t: '物主代词与指示代词',
    r: `形容词性物主代词放在名词前：my, your, his, her, its, our, their。
名词性物主代词独立使用：mine, yours, his, hers, ours, theirs。
指示代词：this/that（单数）these/those（复数）。
注意 its（它的）和 it's（it is）的区别。`,
    ex: [['This is my laptop.','这是我的笔记本电脑。'],['That ticket is yours.','那张票是你的。'],['Her team is on the third floor.','她的团队在三楼。'],['These are our test results.','这些是我们的测试结果。'],['Is that his phone?','那是他的手机吗？']],
    err: [["It's screen is broken.",'Its screen is broken.','its 表示"它的"，不加撇号'],['This is mine laptop.','This is my laptop.','名词前用 my 不用 mine'],['Those is good.','Those are good.','复数指示代词搭配 are']],
  },
  spr: {
    t: '一般现在时',
    r: `表示习惯、事实和固定安排。主语为第三人称单数时，动词加 -s / -es。
否定：do not (don't) + 动词原形；does not (doesn't) + 动词原形。
疑问：Do you ...? Does she ...?
常搭配频率副词：always, usually, often, sometimes, never。`,
    ex: [['I check my email every morning.','我每天早上查邮件。'],['She writes code from nine to six.','她从九点写代码到六点。'],['We do not work on Sundays.','我们周日不工作。'],['Does he attend the daily standup?','他参加每日站会吗？'],['The server restarts at midnight.','服务器在午夜重启。']],
    err: [['She write code.','She writes code.','第三人称单数加 -s'],['He don\'t like bugs.','He doesn\'t like bugs.','第三人称用 doesn\'t'],['Do she work here?','Does she work here?','第三人称疑问用 Does']],
  },
  prep: {
    t: '介词：in / on / at / to / from',
    r: `时间：at + 钟点 (at nine); on + 日/星期 (on Monday); in + 月/年/早午晚 (in June, in the morning)。
地点：at + 具体点 (at the office); in + 封闭空间 (in the room); on + 表面 (on the desk)。
方向：to (去向), from (来源)。`,
    ex: [['The meeting is at three o\'clock.','会议在三点。'],['I work in a small office.','我在一间小办公室工作。'],['The file is on your desktop.','文件在你的桌面上。'],['She goes to the gym after work.','她下班后去健身房。'],['He is from the QA team.','他来自质量保证团队。']],
    err: [['I wake up in 7 AM.','I wake up at 7 AM.','钟点用 at'],['See you in Monday.','See you on Monday.','星期用 on'],['She is on the meeting.','She is in the meeting.','会议是抽象空间用 in']],
  },
  there: {
    t: 'there is / there are',
    r: `用来说明某处存在某物。单数或不可数 → there is；复数 → there are。
否定：there isn't / there aren't。
疑问：Is there ...? Are there ...?
注意：there 本身不是主语，真正主语在后面。`,
    ex: [['There is a bug in the code.','代码里有一个缺陷。'],['There are three meetings today.','今天有三个会议。'],['Is there a coffee machine nearby?','附近有咖啡机吗？'],['There aren\'t any empty desks.','没有空桌子了。'],['There is a new update available.','有一个新的更新可用。']],
    err: [['There are a problem.','There is a problem.','单数名词用 is'],['It has a bug in the code.','There is a bug in the code.','表示存在用 there is，不用 it has'],['There is many tasks.','There are many tasks.','复数名词用 are']],
  },
  prc: {
    t: '现在进行时',
    r: `结构：am/is/are + 动词-ing。表示此刻正在发生或近期临时安排。
否定：am/is/are + not + doing。
疑问：Is she working? Are they testing?
注意拼写：write → writing (去e); run → running (双写); lie → lying (ie→y)。`,
    ex: [['I am writing a unit test right now.','我正在写一个单元测试。'],['She is not attending today\'s standup.','她今天不参加站会。'],['Are you deploying the fix?','你在部署修复吗？'],['They are moving to a new office next week.','他们下周搬到新办公室。'],['The system is processing your request.','系统正在处理你的请求。']],
    err: [['I writing code.','I am writing code.','进行时必须有 be 动词'],['She is work now.','She is working now.','进行时动词要加 -ing'],['He is runing.','He is running.','短元音+辅音结尾要双写']],
  },
  count: {
    t: '可数与不可数名词 / some & any',
    r: `可数名词有单复数：a task / tasks; an error / errors。
不可数名词无复数：information, software, advice, progress, equipment。
some 用于肯定句和请求；any 用于否定句和疑问句。
量词：a piece of advice, a cup of coffee, some water。`,
    ex: [['I need some information about the API.','我需要一些关于这个 API 的信息。'],['There aren\'t any available servers.','没有可用的服务器。'],['Could I have some water?','我能喝点水吗？'],['She gave us two pieces of advice.','她给了我们两条建议。'],['Do you have any questions?','你有问题吗？']],
    err: [['I need an information.','I need some information.','information 不可数'],['She has many softwares.','She has a lot of software.','software 不可数'],['I don\'t have some time.','I don\'t have any time.','否定句用 any']],
  },
  past: {
    t: '一般过去时',
    r: `表示过去完成的动作。规则动词加 -ed：worked, checked, deployed。
不规则动词需记忆：go→went, have→had, write→wrote, see→saw, make→made, take→took。
否定：did not (didn't) + 动词原形。疑问：Did you ...?
时间标志：yesterday, last week, two days ago, in 2023。`,
    ex: [['I fixed the bug yesterday.','我昨天修了那个缺陷。'],['She did not reply to the email.','她没有回复那封邮件。'],['Did you finish the task?','你完成任务了吗？'],['We went to the client\'s office last Monday.','上周一我们去了客户的办公室。'],['The meeting took two hours.','会议开了两小时。']],
    err: [['I goed home early.','I went home early.','go 的过去式是 went'],['She didn\'t finished.','She didn\'t finish.','didn\'t 后用原形'],['Did he went?','Did he go?','Did 后用原形']],
  },
  modal: {
    t: '情态动词：can / should / must',
    r: `can 表示能力或许可：I can write Python. Can I leave early?
should 表示建议：You should test before deploying.
must 表示必须/强烈推断：We must fix this before release. He must be tired.
否定：cannot (can't), should not (shouldn't), must not (mustn't)。
情态动词后接动词原形，无人称变化。`,
    ex: [['I can speak English and Chinese.','我会说英语和中文。'],['You should back up your files.','你应该备份文件。'],['We must finish this before Friday.','我们必须在周五前完成。'],['She can\'t access the database.','她无法访问数据库。'],['You shouldn\'t skip code review.','你不应该跳过代码审查。']],
    err: [['She can speaks English.','She can speak English.','情态动词后用原形'],['You should to check it.','You should check it.','should 后不加 to'],['I must to go.','I must go.','must 后直接加原形']],
  },
  future: {
    t: '将来时：be going to / will',
    r: `be going to + 动词原形：已计划好的将来行动。I am going to deploy tomorrow.
will + 动词原形：临时决定、预测、承诺。I'll help you with that.
否定：isn't going to / won't。
疑问：Are you going to ...? Will she ...?
区别：going to 强调计划；will 强调当下决定或推测。`,
    ex: [['I am going to start the migration next week.','我下周要开始迁移。'],['Don\'t worry, I will fix it.','别担心，我会修复的。'],['She isn\'t going to attend the demo.','她不打算参加演示。'],['Will the release be on time?','发布会准时吗？'],['It is going to rain — take an umbrella.','要下雨了——带把伞。']],
    err: [['I will going to help.','I am going to help. / I will help.','不要混用两个结构'],['She is going to goes.','She is going to go.','going to 后用原形'],['I won\'t to come.','I won\'t come.','won\'t 后直接加原形']],
  },
  pastc: {
    t: '过去进行时',
    r: `结构：was/were + 动词-ing。表示过去某一时刻正在进行的动作。
常与 when / while 搭配：I was coding when the alarm went off.
while + 过去进行时 (较长动作); when + 一般过去时 (打断的短动作)。`,
    ex: [['I was testing the feature when the server crashed.','我在测试功能时服务器崩了。'],['They were discussing the plan at 3 PM.','下午三点他们在讨论方案。'],['While she was presenting, someone asked a question.','她在演示时有人提了问题。'],['Were you working late last night?','你昨晚加班了吗？'],['He wasn\'t paying attention during the meeting.','他开会时没在注意听。']],
    err: [['I was work when he called.','I was working when he called.','过去进行时需要 -ing'],['While I coded, the phone rang.','While I was coding, the phone rang.','while 引导的持续动作用进行时'],['She were sleeping.','She was sleeping.','she 搭配 was']],
  },
  pp: {
    t: '现在完成时',
    r: `结构：have/has + 过去分词。表示过去的动作与现在有关联（结果、经验、持续）。
关键词：already, yet, just, ever, never, for (时间段), since (时间点)。
have been to vs have gone to：去过 vs 去了（还没回来）。
与一般过去时的区别：完成时不用具体过去时间。`,
    ex: [['I have finished the code review.','我已经完成了代码审查。'],['She has never deployed to production alone.','她从未独自部署过生产环境。'],['Have you ever worked remotely?','你曾经远程工作过吗？'],['We have used this tool since 2022.','我们从 2022 年起就用这个工具了。'],['He hasn\'t replied yet.','他还没有回复。']],
    err: [['I have finished it yesterday.','I finished it yesterday.','有具体过去时间用一般过去时'],['She has went home.','She has gone home.','go 的过去分词是 gone'],['Did you ever been to Japan?','Have you ever been to Japan?','经验用现在完成时']],
  },
  comp: {
    t: '比较级与最高级',
    r: `短词（1-2 音节）：加 -er / -est → faster, fastest。
长词（3+ 音节）：more / most + 原形 → more efficient, most efficient。
不规则：good→better→best; bad→worse→worst; far→further→furthest。
比较结构：A is + 比较级 + than B。最高级前加 the。`,
    ex: [['This solution is faster than the old one.','这个方案比旧的快。'],['Python is easier to read than C++.','Python 比 C++ 更容易阅读。'],['She is the most experienced developer on the team.','她是团队中最有经验的开发者。'],['The new version works better.','新版本运行得更好。'],['Which framework is the most popular?','哪个框架最流行？']],
    err: [['She is more better.','She is better.','better 本身就是比较级，不加 more'],['This is the most fastest.','This is the fastest.','最高级不能加 most'],['He is taller that me.','He is taller than me.','比较用 than 不用 that']],
  },
  cond1: {
    t: '第一条件句（真实条件）',
    r: `结构：If + 一般现在时, will + 动词原形。表示真实可能发生的情况。
if 从句用现在时（不用 will）；主句用 will/can/may。
unless = if ... not：Unless we test it, bugs will appear.
可调换顺序：主句在前时不用逗号。`,
    ex: [['If the test passes, I will deploy it.','如果测试通过，我就部署。'],['We will miss the deadline if we don\'t start now.','如果现在不开始，我们会错过截止日期。'],['If you need help, just ask me.','如果你需要帮助，尽管问我。'],['Unless we fix this, users will complain.','除非修复这个，否则用户会投诉。'],['If she finishes early, she can help us.','如果她提前完成，可以帮我们。']],
    err: [['If it will rain, I stay home.','If it rains, I will stay home.','if 从句不用 will'],['If I will have time, I help.','If I have time, I will help.','if 从句用现在时'],['Unless we won\'t fix it...','Unless we fix it...','unless 本身含否定，不再加 not']],
  },
  pass: {
    t: '被动语态',
    r: `结构：be + 过去分词。主语是动作的接受者。
现在时被动：is/are + done → The code is reviewed by the team.
过去时被动：was/were + done → The bug was found yesterday.
用途：不知道或不重要谁做的；强调结果。`,
    ex: [['The feature was released last Friday.','该功能上周五发布了。'],['All commits are reviewed before merging.','所有提交在合并前都会被审查。'],['The server is maintained by the ops team.','服务器由运维团队维护。'],['Were the tests run before deployment?','部署前运行测试了吗？'],['The issue has been fixed.','问题已经被修复了。']],
    err: [['The report was write by Lin.','The report was written by Lin.','被动语态要用过去分词'],['English is speak here.','English is spoken here.','speak 的过去分词是 spoken'],['The file was deleted by accident.','正确（无错误）','by + 执行者']],
  },
  indq: {
    t: '间接问句与礼貌请求',
    r: `间接问句用陈述语序（不倒装）：Could you tell me where the office is?
引导词：if/whether（是否）；what/where/when/how（信息）。
常用开头：Could you tell me ..., Do you know ..., I was wondering ...
比直接问更礼貌，适合工作场景。`,
    ex: [['Could you tell me when the meeting starts?','你能告诉我会议什么时候开始吗？'],['Do you know if she is available?','你知道她是否有空吗？'],['I was wondering whether we could reschedule.','我想知道我们能否改期。'],['Can you explain how this works?','你能解释一下这是怎么运作的吗？'],['I\'m not sure what the password is.','我不确定密码是什么。']],
    err: [['Could you tell me where is the office?','Could you tell me where the office is?','间接问句用陈述语序'],['Do you know what time is it?','Do you know what time it is?','不倒装'],['I wonder that she is ready.','I wonder if/whether she is ready.','是否用 if/whether']],
  },
  link: {
    t: '连接词：because / so / although / however',
    r: `because 原因 → I stayed late because the release was urgent.
so 结果 → The release was urgent, so I stayed late.
although / even though 让步 → Although it was late, I finished the task.
however 转折（连接两个句子，前用句号或分号）→ The plan was good. However, it took too long.`,
    ex: [['I stayed late because the deadline was tomorrow.','我加班了因为截止日期是明天。'],['The API was unstable, so we added a retry.','API 不稳定，所以我们加了重试。'],['Although the task was hard, she finished it on time.','虽然任务很难，她还是按时完成了。'],['The design looks good. However, it needs more testing.','设计看起来不错。然而，还需要更多测试。'],['Even though I was tired, I reviewed the PR.','尽管我很累，我还是审查了 PR。']],
    err: [['Because I was tired. I went home.','Because I was tired, I went home.','because 引导从句，不单独成句'],['Although it rained, but I went out.','Although it rained, I went out.','although 和 but 不能同时用'],['I was tired, however I continued.','I was tired; however, I continued.','however 前用句号或分号']],
  },
  relcl: {
    t: '定语从句：who / which / that',
    r: `who 修饰人：The developer who fixed the bug got a bonus.
which 修饰物：The tool which we use is open source.
that 可修饰人或物（限定性从句）。
非限定性从句用逗号隔开，不能用 that：Lin, who is a senior dev, led the project.`,
    ex: [['The colleague who sits next to me is from the QA team.','坐在我旁边的同事来自 QA 团队。'],['The framework that we chose is lightweight.','我们选的框架很轻量。'],['The meeting, which lasted two hours, was productive.','这个持续两小时的会议很有成果。'],['I need a tool that can handle large files.','我需要一个能处理大文件的工具。'],['She is the person who trained me.','她是培训我的人。']],
    err: [['The man which called is my boss.','The man who called is my boss.','修饰人用 who'],['My laptop, that is new, works well.','My laptop, which is new, works well.','非限定性从句不用 that'],['The book who I read...','The book that/which I read...','修饰物不用 who']],
  },
  rep: {
    t: '间接引语',
    r: `直接引语变间接引语：时态后退一步 (backshift)。
"I am busy." → She said (that) she was busy.
"I will check." → He said he would check.
"I have done it." → She said she had done it.
时间词变化：today→that day, tomorrow→the next day, yesterday→the day before。`,
    ex: [['He said that he was working on the fix.','他说他正在修复中。'],['She told me she would send the report.','她告诉我她会发报告。'],['They explained that the system had crashed.','他们解释说系统崩溃了。'],['He asked if I could help.','他问我能不能帮忙。'],['She said she had already finished.','她说她已经完成了。']],
    err: [['He said he is busy.','He said he was busy.','间接引语时态后退'],['She said me that...','She told me that...','say 不加人，tell 加人'],['He said that "I will go."','He said that he would go.','间接引语不加引号，时态后退']],
  },
  timecl: {
    t: '时间/条件/让步从句',
    r: `时间从句：when, before, after, while, as soon as, until。
条件从句：if, unless, provided that, as long as。
让步从句：although, even though, despite (+ noun/gerund)。
规则：从句表将来时用现在时 → When the build finishes, I will deploy.`,
    ex: [['Before you merge, make sure all tests pass.','合并前确保所有测试通过。'],['I will call you as soon as the meeting ends.','会议一结束我就打给你。'],['Unless we add more tests, the risk remains.','除非我们增加测试，否则风险依旧。'],['Although the deadline was tight, we delivered.','虽然截止日期很紧，我们还是交付了。'],['While the database was migrating, users saw errors.','数据库迁移期间用户看到了报错。']],
    err: [['When I will arrive, I call you.','When I arrive, I will call you.','时间从句中不用 will'],['After will finish the task...','After I finish the task...','从句中用现在时表将来'],['Despite it was raining...','Despite the rain... / Although it was raining...','despite 后接名词，不接从句']],
  },
  ncl: {
    t: '名词性从句',
    r: `that 从句作宾语：I believe that the approach is correct.
whether/if 从句：I don't know whether it will work.
what/how/where 从句作主语或宾语：What he said surprised us.
注意：名词性从句用陈述语序。`,
    ex: [['I think that we should delay the release.','我认为我们应该推迟发布。'],['What surprised me was the speed of the fix.','让我惊讶的是修复的速度。'],['She asked whether the feature was ready.','她问功能是否准备好了。'],['The fact that he left early worried the team.','他早走这件事让团队担心。'],['How we handle this will affect the timeline.','我们怎么处理这件事会影响时间线。']],
    err: [['I don\'t know what is it.','I don\'t know what it is.','名词性从句用陈述语序'],['That is he late surprised me.','That he was late surprised me.','主语从句需要完整结构'],['I believe the approach is correct.','正确（that 可省略）','that 在宾语从句中可省']],
  },
  pastp: {
    t: '过去完成时',
    r: `结构：had + 过去分词。表示"过去的过去"——在过去某个时间点之前已完成的动作。
常与 before, after, by the time, already 搭配。
用于叙述：When I arrived, the meeting had already started.
不能单独使用，需要和另一个过去时间参照。`,
    ex: [['By the time I joined, the team had already decided.','在我加入时，团队已经决定了。'],['She realized she had forgotten to save.','她意识到自己忘了保存。'],['Had you tested it before you deployed?','你部署前测试过了吗？'],['They had never used cloud services before 2020.','2020 年之前他们从未用过云服务。'],['After he had reviewed the code, he approved the PR.','在审查完代码后，他批准了 PR。']],
    err: [['When I arrived, the meeting already started.','When I arrived, the meeting had already started.','表示更早的过去用过去完成'],['I had went there before.','I had gone there before.','go 的过去分词是 gone'],['She had finished before I will arrive.','She had finished before I arrived.','过去完成搭配另一个过去时']],
  },
  gerinf: {
    t: '动名词与不定式',
    r: `动名词 (V-ing) 作名词用：Testing is important. I enjoy coding.
不定式 (to + V)：I want to learn. It is easy to use.
有些动词只接动名词：enjoy, avoid, finish, consider, suggest。
有些动词只接不定式：want, need, decide, plan, hope, agree。
有些动词两者皆可但意思不同：stop doing (停止) vs stop to do (停下来去做)。`,
    ex: [['I enjoy working with this framework.','我喜欢用这个框架工作。'],['She decided to rewrite the module.','她决定重写这个模块。'],['Testing before deployment is essential.','部署前测试是必须的。'],['We need to fix this immediately.','我们需要立刻修复。'],['Have you considered using a different approach?','你考虑过用不同的方法吗？']],
    err: [['I enjoy to code.','I enjoy coding.','enjoy 后接动名词'],['She decided rewriting it.','She decided to rewrite it.','decide 后接不定式'],['I want learning Python.','I want to learn Python.','want 后接不定式']],
  },
  advpass: {
    t: '高级被动语态',
    r: `情态动词 + 被动：can/should/must + be + 过去分词。
完成时被动：has/had been + 过去分词。
进行时被动：is/was being + 过去分词。
双宾语被动：The team was given more time. / More time was given to the team.`,
    ex: [['The issue should be resolved by tomorrow.','这个问题应该在明天前解决。'],['The database has been migrated successfully.','数据库已经成功迁移。'],['A new feature is being developed.','一个新功能正在开发中。'],['All employees must be informed of the change.','所有员工必须被告知这个变更。'],['The report had been submitted before the deadline.','报告在截止日期前已经提交了。']],
    err: [['It should fixed soon.','It should be fixed soon.','情态被动需要 be'],['The code has reviewed.','The code has been reviewed.','完成时被动需要 been'],['It is been tested.','It is being tested.','进行时被动用 being']],
  },
  cond2: {
    t: '第二条件句（与现在事实相反的假设）',
    r: `结构：If + 过去式, would + 动词原形。表示现在不太可能或与事实相反。
be 动词在 if 从句中一律用 were（正式）：If I were you, ...
would 可替换为 could/might 表示较弱的可能。
用途：假设、建议、梦想。`,
    ex: [['If I had more time, I would refactor the entire module.','如果我有更多时间，我会重构整个模块。'],['If she were the team lead, she would change the process.','如果她是团队负责人，她会改变流程。'],['We could release earlier if we had more developers.','如果有更多开发者，我们可以更早发布。'],['What would you do if the server went down?','如果服务器宕机你会怎么做？'],['If I didn\'t have this meeting, I would help you.','如果我没有这个会，我就帮你。']],
    err: [['If I would have time, I would help.','If I had time, I would help.','if 从句不用 would'],['If I was you...','If I were you...','正式英语中 if 从句用 were'],['If she has more time, she would help.','If she had more time, she would help.','第二条件句 if 从句用过去式']],
  },
  partcl: {
    t: '分词从句',
    r: `现在分词 (-ing) 表示主动或同时：Working late, Lin found the bug.
过去分词 (-ed) 表示被动或已完成：Written in Python, the script runs fast.
分词从句的主语必须与主句主语一致。
可替代时间/原因/条件从句，使表达更紧凑。`,
    ex: [['Having finished the review, she approved the merge.','审查完毕后，她批准了合并。'],['Written in clear English, the documentation is easy to follow.','因为用清晰英语写成，文档很容易理解。'],['Not knowing the answer, he asked his colleague.','由于不知道答案，他问了同事。'],['Faced with a tight deadline, the team worked overtime.','面对紧迫的截止日期，团队加班了。'],['Working remotely, I save two hours of commuting.','远程办公省了两小时通勤。']],
    err: [['Finishing the task, the computer crashed.','While I was finishing the task, the computer crashed.','悬垂分词——分词主语必须与主句一致'],['Worked in Python, it runs fast.','Written in Python, it runs fast.','表被动用过去分词'],['Having went there...','Having gone there...','having + 过去分词（gone 不是 went）']],
  },
  cond3: {
    t: '第三条件句（与过去事实相反的假设）',
    r: `结构：If + had + 过去分词, would have + 过去分词。表示过去没有发生的假设。
用于复盘、反思、表达遗憾。
could/might have 表示更弱的可能。
混合条件句：If + had pp (过去), would + 原形 (现在结果)。`,
    ex: [['If we had tested more, we would have caught the bug.','如果我们多测试，就会发现那个缺陷。'],['She might have finished if she had started earlier.','如果她早点开始，可能就完成了。'],['If I hadn\'t checked the logs, we wouldn\'t have found the cause.','如果我没查日志，我们就不会找到原因。'],['The outage could have been avoided if the config had been reviewed.','如果配置被审查过，这次宕机本可避免。'],['If he had joined earlier, he would know the context now.','如果他早点加入，他现在就了解背景了。(混合)']],
    err: [['If we would have tested...','If we had tested...','if 从句不用 would'],['If I had knew...','If I had known...','had + 过去分词（known）'],['If she studied harder, she would have passed.','If she had studied harder, she would have passed.','第三条件句 if 从句用 had + pp']],
  },
  subj: {
    t: '虚拟语气（正式建议与要求）',
    r: `suggest/recommend/require/insist + that + 主语 + 动词原形（无论人称）。
It is essential/important/necessary + that + 主语 + 动词原形。
英式英语也可用 should + 动词原形。
用于正式提案、政策建议和会议决定。`,
    ex: [['I suggest that he attend the meeting.','我建议他参加这个会议。'],['The policy requires that all code be reviewed.','政策要求所有代码必须被审查。'],['It is essential that the team test before releasing.','团队在发布前测试是必要的。'],['She recommended that we use a different library.','她建议我们用另一个库。'],['They insisted that the fix be deployed immediately.','他们坚持要求立即部署修复。']],
    err: [['I suggest that he attends.','I suggest that he attend.','虚拟语气不加 -s'],['It is important that she goes.','It is important that she go.','无论人称一律用原形'],['I recommend him to check.','I recommend that he check.','正式语境用 that 从句']],
  },
  inv: {
    t: '倒装与强调句',
    r: `部分倒装（否定/限制副词提前）：Never have I seen such a bug. Only then did we realize.
强调句：It is/was + 被强调部分 + that/who + 其余。It was the config that caused the issue.
so/such ... that 引导结果从句不倒装，但 So serious was the bug that... 可倒装。`,
    ex: [['Never have I seen such a complex system.','我从未见过如此复杂的系统。'],['Only after thorough testing did we feel confident.','只有经过彻底测试我们才有信心。'],['It was the network latency that caused the timeout.','是网络延迟导致了超时。'],['Not only did she find the bug, but she also fixed it.','她不仅发现了缺陷，还修复了它。'],['Rarely does this error occur in production.','这个错误在生产环境中很少出现。']],
    err: [['Never I have seen this.','Never have I seen this.','否定副词提前要倒装'],['It was the config who caused it.','It was the config that caused it.','强调物用 that 不用 who'],['Only then we realized.','Only then did we realize.','only + 状语提前要倒装']],
  },
  hedge: {
    t: '正式缓和语气与学术表达',
    r: `缓和语气避免绝对化：may, might, appear to, seem to, suggest, indicate。
限定范围：based on the evidence, to some extent, in most cases。
正式替换：think → consider/believe; very big → significant; problem → challenge/issue。
用于报告、提案和不确定结论。`,
    ex: [['The data suggests that the new approach may improve performance.','数据表明新方法可能提升性能。'],['This appears to be a configuration issue.','这似乎是一个配置问题。'],['Based on current evidence, we believe the risk is manageable.','基于当前证据，我们认为风险可控。'],['The results indicate a possible improvement.','结果表明可能有所改善。'],['To some extent, the delay was unavoidable.','在某种程度上，延迟是不可避免的。']],
    err: [['This proves the system is bad.','This suggests the system may need improvement.','过于绝对，用 suggest/may 缓和'],['I think it is very bad.','I believe the impact is significant.','正式写作避免 very/bad'],['The data shows we must change.','The data indicates we should consider changing.','正式报告用缓和表达']],
  },
  arg: {
    t: '论证结构：主张、证据、结论',
    r: `论证四步：主张 (claim) → 理由 (reason) → 证据 (evidence) → 结论 (conclusion)。
连接：therefore, consequently, as a result, for this reason。
让步再反驳：Admittedly... ; however, ... Nevertheless, ...
推荐结构：Background → Problem → Proposal → Benefit → Recommendation。`,
    ex: [['We should migrate to the cloud. The current servers are reaching capacity, and cloud services offer better scalability.','我们应该迁移到云端。当前服务器接近容量上限，云服务提供更好的扩展性。'],['Admittedly, the cost is higher; however, the long-term savings justify the investment.','诚然成本更高；然而长期节省证明了投资的合理性。'],['For this reason, we recommend a phased approach.','因此，我们推荐分阶段方案。'],['The evidence indicates that automated testing reduces defects by 40%.','证据表明自动化测试减少了 40% 的缺陷。'],['Consequently, the team decided to increase test coverage.','因此，团队决定提高测试覆盖率。']],
    err: [['We should do this because I think so.','We should do this because data shows a 30% improvement.','论证需要证据，不能只用个人观点'],['The cost is high but we do it anyway.','Although the cost is significant, the long-term benefit outweighs it.','需要明确权衡'],['So we must change.','Therefore, we recommend considering this change.','正式结论用 therefore/recommend']],
  },
  disc: {
    t: '语篇衔接与正式写作',
    r: `主题句：每段第一句概括该段要点。
衔接手段：指代 (this, the approach)；重复关键词；过渡词。
段间过渡：Furthermore, In addition, On the other hand, In conclusion。
长文结构：Introduction → Body (claim + evidence per paragraph) → Conclusion。`,
    ex: [['Furthermore, the new system offers better monitoring capabilities.','此外，新系统提供了更好的监控能力。'],['In conclusion, we recommend proceeding with option A.','总之，我们建议选择方案 A。'],['This approach has two main benefits. First, it reduces cost. Second, it improves reliability.','这个方案有两个主要好处。第一，降低成本。第二，提高可靠性。'],['On the other hand, the alternative requires less upfront investment.','另一方面，替代方案需要的前期投入更少。'],['As mentioned earlier, the primary concern is data security.','如前所述，首要关切是数据安全。']],
    err: [['And also we need...','Furthermore, we need... / In addition, ...','正式写作避免 and also 开头'],['Like I said before...','As mentioned earlier, ...','正式引用前文用 as mentioned'],['So basically...','In summary, ... / To conclude, ...','正式总结不用 so basically']],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PASSAGE BUILDERS — produce unique English text per grammar+topic combination
// ═══════════════════════════════════════════════════════════════════════════════

const PB = {
  be: [
    (c, w) => `Hello! My name is ${c}. I am from ${w[0]}. I am ${w[1]} years old. I am a ${w[2]}. My office is ${w[3]}. It is a ${w[4]} place. I am ${w[5]} to be here.`,
    (c, w) => `This is ${c}. ${c} is a ${w[2]} at a ${w[4]} company in ${w[0]}. ${c} is ${w[1]} years old. The office is ${w[3]}. "${w[5]}!" ${c} says to a new colleague. "I am ${c}."`,
    (c, w) => `"Are you ${c}?" "Yes, I am. I am the new ${w[2]}." "Welcome! The ${w[4]} room is ${w[3]}. Your desk is there." "${w[5]}! I am happy to start."`,
    (c, w) => `${c} is not alone. There are many people in the ${w[4]} office. ${c} is from ${w[0]}. ${c} is ${w[1]}. The manager is ${w[5]}. Everything is new and interesting.`,
  ],
  poss: [
    (c, w) => `${c} has a ${w[0]}. This is ${c}'s ${w[0]}. Its ${w[1]} is ${w[2]}. "Is that your ${w[3]}?" "No, that is ${w[4]}'s. Mine is ${w[5]}."`,
    (c, w) => `"Whose ${w[0]} is this?" "It is mine." "And those ${w[3]}s?" "Those are ${w[4]}'s. Her ${w[3]}s are always on that shelf." ${c}'s desk is ${w[2]} and ${w[5]}.`,
    (c, w) => `This is our team room. My desk is by the window. ${w[4]}'s desk is next to mine. Their ${w[0]}s are ${w[2]}. Our ${w[3]} is ${w[5]}. That monitor is his, not yours.`,
  ],
  spr: [
    (c, w) => `${c} ${w[0]} every ${w[1]}. After that, ${c} ${w[2]} for about ${w[3]}. ${c} does not ${w[4]} on weekends. ${c} usually ${w[5]} in the evening.`,
    (c, w) => `Every ${w[1]}, ${c} ${w[0]} at the office. The team ${w[2]} together. They do not ${w[4]} without a plan. ${c} always ${w[5]} before leaving.`,
    (c, w) => `Does ${c} ${w[0]} every ${w[1]}? Yes. ${c} also ${w[2]} ${w[3]} times a week. ${c} never ${w[4]}. On Fridays, ${c} ${w[5]} with the team.`,
  ],
  prep: [
    (c, w) => `${c} arrives at the office at ${w[0]}. The meeting room is on the ${w[1]} floor. ${c} puts the laptop on the desk. The coffee machine is in the ${w[2]}. After work, ${c} goes to ${w[3]}.`,
    (c, w) => `The file is on ${c}'s desktop. The team works in a room on the ${w[1]} floor. They have lunch at ${w[0]}. ${c} walks from the office to ${w[3]}. The report is in ${w[4]}'s folder.`,
    (c, w) => `At ${w[0]}, ${c} is in the ${w[2]}. The keyboard is on the desk. The charger is in the bag. ${c} goes to ${w[3]} at ${w[5]}. The parking lot is behind the building.`,
  ],
  there: [
    (c, w) => `There is a ${w[0]} in ${c}'s office. There are ${w[1]} ${w[2]}s on the desk. Is there a ${w[3]} nearby? Yes, there is one on the ${w[4]} floor. There aren't any ${w[5]}s in this room.`,
    (c, w) => `"Is there a ${w[0]} in the building?" "Yes, there is. It is on the ${w[4]} floor." "Are there any ${w[2]}s available?" "No, there aren't any ${w[2]}s right now."`,
    (c, w) => `In ${c}'s team, there are ${w[1]} developers. There is one ${w[3]} and there is also a ${w[0]}. There aren't any ${w[5]}s this week. There is a lot of work to do.`,
  ],
  prc: [
    (c, w) => `Right now, ${c} is ${w[0]}. The team is ${w[1]} in the meeting room. ${c} is not ${w[2]} today. "Are you ${w[3]}?" "Yes, I am ${w[3]} the latest version."`,
    (c, w) => `Look! ${c} is ${w[0]} at the desk. Two colleagues are ${w[1]} nearby. The manager is not ${w[2]} — she is in another meeting. "What are you ${w[3]}?" "I am ${w[4]} a report."`,
    (c, w) => `${c} is busy. ${c} is ${w[0]} a new feature this week. The designers are ${w[1]} the screens. Nobody is ${w[2]} right now. Everything is ${w[3]} smoothly.`,
  ],
  count: [
    (c, w) => `${c} needs some ${w[0]}. There isn't any ${w[1]} left. "Do you have any ${w[2]}?" "Yes, here are two ${w[2]}s." ${c} also wants a piece of ${w[3]}. There is a lot of ${w[4]} to review.`,
    (c, w) => `How much ${w[1]} does ${c} need? Not much. How many ${w[2]}s are there? There are five. ${c} doesn't need any ${w[3]} today. Could I have some ${w[0]}, please?`,
  ],
  past: [
    (c, w) => `Yesterday, ${c} ${w[0]} early. ${c} ${w[1]} the new feature and ${w[2]} it to the team. The demo ${w[3]} well. After work, ${c} ${w[4]} and ${w[5]}.`,
    (c, w) => `Last week, ${c} ${w[0]} a problem. ${c} ${w[1]} the logs and ${w[2]} the cause. The team ${w[3]} quickly. ${c} did not ${w[4]} until everything was stable.`,
    (c, w) => `Did ${c} ${w[0]} yesterday? Yes. ${c} also ${w[1]} and ${w[2]}. The client ${w[3]} the result. ${c} didn't ${w[4]} — there was no time. ${c} ${w[5]} home at nine.`,
  ],
  modal: [
    (c, w) => `${c} can ${w[0]} quickly. ${c} should ${w[1]} before the meeting. The team must ${w[2]} by Friday. You shouldn't ${w[3]} without testing. Can you ${w[4]}?`,
    (c, w) => `"Can I ${w[0]}?" "Yes, you can." "${c} must ${w[2]} today." "You should also ${w[1]}." "${c} can't ${w[3]} right now — the system is down."`,
  ],
  future: [
    (c, w) => `${c} is going to ${w[0]} next ${w[1]}. The team will ${w[2]} after the review. ${c} won't ${w[3]} until the tests pass. "Will you ${w[4]}?" "Yes, I will."`,
    (c, w) => `Tomorrow, ${c} is going to ${w[0]}. The release will happen on ${w[1]}. We are not going to ${w[3]} this sprint. ${c} will ${w[2]} as soon as possible.`,
  ],
  pastc: [
    (c, w) => `${c} was ${w[0]} when the ${w[1]} happened. While the team was ${w[2]}, someone ${w[3]}. ${c} wasn't ${w[4]} at that moment. Were you ${w[5]} when the alert came?`,
    (c, w) => `At 3 PM yesterday, ${c} was ${w[0]}. The server was ${w[2]} normally. Suddenly, the ${w[1]} occurred. While ${c} was ${w[4]}, a colleague ${w[3]}.`,
  ],
  pp: [
    (c, w) => `${c} has ${w[0]} the task. The team has already ${w[1]}. Have you ever ${w[2]}? ${c} hasn't ${w[3]} yet. They have ${w[4]} since ${w[5]}.`,
    (c, w) => `Has ${c} ${w[0]} before? Yes, ${c} has ${w[0]} many times. The team has just ${w[1]}. We haven't ${w[3]} yet. ${c} has ${w[4]} for ${w[5]} months.`,
  ],
  comp: [
    (c, w) => `The new ${w[0]} is ${w[1]}er than the old one. ${w[2]} is the most ${w[3]} tool on the market. This solution is better than ${w[4]}. Which is ${w[1]}er — ${w[0]} or ${w[5]}?`,
    (c, w) => `${c} thinks ${w[0]} is more ${w[3]} than ${w[5]}. The ${w[2]} version is the ${w[1]}est. It is less ${w[4]} but more ${w[3]}. The team chose the most ${w[3]} option.`,
  ],
  cond1: [
    (c, w) => `If ${c} ${w[0]}, the team will ${w[1]}. We won't ${w[2]} unless the ${w[3]} is ready. If you ${w[4]}, I will ${w[5]}. What will happen if we don't ${w[0]}?`,
    (c, w) => `If the ${w[3]} passes, ${c} will ${w[1]} immediately. Unless someone ${w[4]}, the ${w[2]} will be delayed. If there is a problem, ${c} will ${w[5]}.`,
  ],
  pass: [
    (c, w) => `The ${w[0]} was ${w[1]} by ${c}'s team. All ${w[2]}s are ${w[3]} before release. The ${w[4]} is being ${w[5]} right now. When was it ${w[1]}?`,
    (c, w) => `The ${w[0]} is ${w[1]} every week. It was first ${w[3]} in 2023. ${w[2]}s are ${w[5]} automatically. The issue has been ${w[1]} successfully.`,
  ],
  indq: [
    (c, w) => `Could you tell ${c} when the ${w[0]} starts? ${c} doesn't know if the ${w[1]} is ready. Do you know where the ${w[2]} is? I was wondering whether we could ${w[3]}.`,
    (c, w) => `${c} asked, "Do you know what the ${w[0]} is?" "I'm not sure how the ${w[1]} works." "Could you explain where the ${w[2]} goes?" "I was wondering if you could ${w[3]}."`,
  ],
  link: [
    (c, w) => `${c} ${w[0]} because the ${w[1]} was ${w[2]}. Although it was ${w[3]}, ${c} ${w[4]}. However, the ${w[5]} still needs work.`,
    (c, w) => `The ${w[1]} was ${w[2]}, so ${c} ${w[0]}. Even though the ${w[3]} was difficult, the team ${w[4]}. As a result, the ${w[5]} improved.`,
  ],
  relcl: [
    (c, w) => `${c} works with a colleague who ${w[0]}. The tool that they use is ${w[1]}. The project, which ${w[2]}, is almost done. ${c} needs a ${w[3]} that can ${w[4]}.`,
    (c, w) => `The developer who ${w[0]} is ${c}. The framework, which is ${w[1]}, works well. The task that ${w[2]} has been completed. ${c} is the person who ${w[4]}.`,
  ],
  rep: [
    (c, w) => `${c} said that the ${w[0]} was ${w[1]}. She told the team she would ${w[2]}. He asked if we could ${w[3]}. They explained that the ${w[4]} had ${w[5]}.`,
    (c, w) => `"I will ${w[2]} tomorrow," ${c} said. → ${c} said that he/she would ${w[2]} the next day. "${w[0]} is ${w[1]}." → ${c} said the ${w[0]} was ${w[1]}.`,
  ],
  timecl: [
    (c, w) => `Before ${c} ${w[0]}, the team ${w[1]}. When the ${w[2]} finishes, ${c} will ${w[3]}. Although the ${w[4]} was tight, they ${w[5]}. Unless we act now, the risk will grow.`,
    (c, w) => `As soon as the ${w[2]} is done, ${c} will ${w[3]}. While the system was ${w[0]}, users ${w[1]}. Even though the deadline was ${w[4]}, the team ${w[5]} on time.`,
  ],
  ncl: [
    (c, w) => `${c} believes that the ${w[0]} is ${w[1]}. What ${w[2]} is still unclear. Whether we ${w[3]} depends on the ${w[4]}. The fact that the ${w[5]} happened surprised everyone.`,
    (c, w) => `It is clear that the ${w[0]} needs ${w[1]}. ${c} doesn't know whether the ${w[4]} will ${w[3]}. What ${c} suggested was to ${w[2]}. How we handle this matters.`,
  ],
  pastp: [
    (c, w) => `By the time ${c} ${w[0]}, the team had already ${w[1]}. ${c} realized that someone had ${w[2]}. They had never ${w[3]} before that day. After ${c} had ${w[4]}, everything ${w[5]}.`,
    (c, w) => `When ${c} arrived, the ${w[0]} had already ${w[1]}. ${c} had ${w[4]} before the meeting started. Had they ${w[3]} earlier, the result ${w[5]}. The issue had ${w[2]} the previous night.`,
  ],
  gerinf: [
    (c, w) => `${c} enjoys ${w[0]}. The team decided to ${w[1]}. ${w[2]} is essential for quality. ${c} avoids ${w[3]} without review. They plan to ${w[4]} next sprint.`,
    (c, w) => `${c} considered ${w[0]} but decided to ${w[1]} instead. ${w[2]} takes time. She suggested ${w[3]} first. They agreed to ${w[4]} by Friday.`,
  ],
  advpass: [
    (c, w) => `The ${w[0]} should be ${w[1]} by Friday. The system has been ${w[2]} successfully. A new ${w[3]} is being ${w[4]} now. All changes must be ${w[5]} first.`,
    (c, w) => `The ${w[0]} can be ${w[1]} automatically. It had been ${w[2]} before the deadline. ${w[3]}s are being ${w[4]} this week. The decision must be ${w[5]} by management.`,
  ],
  cond2: [
    (c, w) => `If ${c} had more ${w[0]}, ${c} would ${w[1]}. If the team were ${w[2]}, they could ${w[3]}. What would you do if the system ${w[4]}?`,
    (c, w) => `If the team were ${w[2]}, ${c} would ${w[1]}. We could ${w[3]} if we had more ${w[0]}. If conditions were different, ${c} would ${w[5]}.`,
  ],
  partcl: [
    (c, w) => `Having ${w[0]}, ${c} ${w[1]}. ${w[2]} in clear language, the document is easy to follow. Not ${w[3]}, the team ${w[4]}. Faced with ${w[5]}, ${c} made a decision.`,
    (c, w) => `${w[2]} carefully, the report was well received. Having ${w[0]} the issue, ${c} ${w[1]}. Working ${w[3]}, the team ${w[4]}. Considering the ${w[5]}, this was the best option.`,
  ],
  cond3: [
    (c, w) => `If ${c} had ${w[0]}, the team would have ${w[1]}. The ${w[2]} could have been avoided if someone had ${w[3]}. Had we ${w[4]}, the ${w[5]} would have been different.`,
    (c, w) => `If the team had ${w[0]} earlier, they might have ${w[1]}. The ${w[2]} wouldn't have happened if the ${w[3]} had been in place. ${c} wishes they had ${w[4]}.`,
  ],
  subj: [
    (c, w) => `${c} suggests that the team ${w[0]} before ${w[1]}. It is essential that every ${w[2]} be ${w[3]}. The policy requires that all ${w[4]} be ${w[5]} first.`,
    (c, w) => `The manager recommended that ${c} ${w[0]} the ${w[1]}. It is important that the ${w[2]} be ${w[3]}. They insisted that the ${w[4]} be ${w[5]} immediately.`,
  ],
  inv: [
    (c, w) => `Never has ${c} seen such a ${w[0]}. Only after ${w[1]} did the team ${w[2]}. It was the ${w[3]} that ${w[4]}. Not only did ${c} ${w[5]}, but also improved the process.`,
    (c, w) => `Rarely does this ${w[0]} occur. Only when ${w[1]} did ${c} ${w[2]}. It is the ${w[3]} that matters most. Never before had the team ${w[4]} so ${w[5]}.`,
  ],
  hedge: [
    (c, w) => `The data suggests that the ${w[0]} may ${w[1]}. This appears to be a ${w[2]} issue. Based on current evidence, the ${w[3]} seems ${w[4]}. To some extent, the ${w[5]} is understandable.`,
    (c, w) => `It is possible that the ${w[0]} will ${w[1]}. The results indicate a ${w[2]} trend. ${c} believes the ${w[3]} might be ${w[4]}. Further investigation may ${w[5]}.`,
  ],
  arg: [
    (c, w) => `${c} proposes that we ${w[0]}. The primary reason is ${w[1]}. Evidence shows that ${w[2]}. Admittedly, ${w[3]}; however, ${w[4]}. Therefore, we recommend ${w[5]}.`,
    (c, w) => `The ${w[0]} presents a challenge. Research indicates that ${w[1]}. Although ${w[3]}, the benefits of ${w[2]} outweigh the costs. Consequently, ${c} recommends ${w[5]}.`,
  ],
  disc: [
    (c, w) => `This report examines ${w[0]}. First, we review ${w[1]}. Furthermore, ${w[2]} is discussed. On the other hand, ${w[3]}. In conclusion, ${c} recommends ${w[4]}. As mentioned earlier, ${w[5]} remains key.`,
    (c, w) => `The following section addresses ${w[0]}. In addition to ${w[1]}, we consider ${w[2]}. However, ${w[3]} should not be overlooked. To summarize, the best approach is ${w[4]}.`,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPIRAL GRAMMAR SCHEDULE — per-lesson grammar key + specific sub-focus
// Mimics NCE's spiral: each lesson has ONE fine-grained grammar point;
// the same grammar category reappears later at deeper levels (marked ⟲).
// Format: [startLesson, endLesson, grammarKey, subFocus]
// ═══════════════════════════════════════════════════════════════════════════════

const SPIRAL_RANGES = [
  // ─── Book 1 ────────────────────────────────────────────────────────────────
  // Wave 1: be verbs in small steps
  [1,3,'be','am / is 肯定句：I am a developer. She is from Beijing.'],
  [4,6,'be','be 疑问句与简短回答：Is he busy? — Yes, he is.'],
  [7,9,'be','be 否定句：I am not late. It isn\'t ready.'],
  [10,12,'be','be + 形容词/名词综合：The room is big. We are a team.'],
  // Wave 2: possessives & demonstratives
  [13,15,'poss','my / your / his / her 物主代词 + 名词'],
  [16,18,'poss','this / that 指示单数：This is my desk. That is hers.'],
  [19,21,'poss','these / those 指示复数 + its vs it\'s'],
  [22,24,'be','be + 物主代词综合复习 ⟲'],
  // Wave 3: simple present
  [25,27,'spr','一般现在时肯定句（I/you/we/they + 原形）'],
  [28,30,'spr','第三人称单数加 -s/-es：She checks email every day.'],
  [31,33,'spr','一般现在时否定句：I don\'t / She doesn\'t + 原形'],
  [34,36,'spr','一般现在时疑问句：Do you ...? Does he ...?'],
  // Wave 4: frequency + prepositions
  [37,39,'spr','频率副词：always / usually / sometimes / never'],
  [40,42,'prep','地点介词：in the room / on the desk / at the office'],
  [43,45,'prep','时间介词：at 9 AM / on Monday / in June'],
  [46,48,'spr','一般现在时 + 介词综合 ⟲'],
  // Wave 5: present continuous
  [49,51,'prc','现在进行时肯定句：I am writing code right now.'],
  [52,54,'prc','现在进行时否定与疑问：Are you testing?'],
  [55,57,'prc','现在进行时 vs 一般现在时对比 ⟲'],
  [58,60,'there','there is / there are 存在句'],
  // Wave 6: countable/uncountable
  [61,63,'count','可数名词 + a/an/some/any'],
  [64,66,'count','不可数名词 + how much / how many'],
  [67,69,'count','some/any 在肯定/否定/疑问中 ⟲'],
  [70,72,'be','be + there + 数量综合大复习 ⟲'],
  // Wave 7: simple past
  [73,75,'past','一般过去时规则动词 -ed：worked, checked'],
  [76,78,'past','一般过去时不规则动词：went, had, wrote, saw'],
  [79,81,'past','过去时否定 didn\'t + 原形'],
  [82,84,'past','过去时疑问 Did you ...? + 时间标志词'],
  // Wave 8: past continuous
  [85,87,'pastc','过去进行时：was/were + doing'],
  [88,90,'pastc','when + 过去时 / while + 过去进行时'],
  [91,93,'past','过去时态综合 ⟲（过去时 + 过去进行时）'],
  [94,96,'spr','一般现在时 vs 一般过去时对比 ⟲'],
  // Wave 9: future
  [97,99,'future','be going to 表已有计划'],
  [100,102,'future','will 表临时决定、预测和承诺'],
  [103,105,'future','be going to vs will 区别 ⟲'],
  [106,108,'modal','can / can\'t 表能力和许可'],
  // Wave 10: modals
  [109,111,'modal','should / shouldn\'t 表建议'],
  [112,114,'modal','must / mustn\'t / have to 表义务'],
  [115,117,'modal','情态动词综合 ⟲（can/should/must 对比）'],
  [118,120,'future','将来时 + 情态动词综合 ⟲'],
  // Wave 11: first conditional + comparison
  [121,123,'cond1','第一条件句：If + 现在时, will + 原形'],
  [124,126,'comp','比较级：-er / more + than'],
  [127,129,'comp','最高级：the -est / the most'],
  [130,132,'cond1','条件句 + 比较级综合 ⟲'],
  // Wave 12: comprehensive spiral review
  [133,135,'past','过去 + 将来综合 ⟲'],
  [136,138,'prc','进行时 + 条件句综合 ⟲'],
  [139,141,'modal','情态 + 比较综合 ⟲'],
  [142,144,'be','第一册毕业大综合 ⟲（全部时态和结构）'],

  // ─── Book 2 ────────────────────────────────────────────────────────────────
  // Wave 1: present perfect
  [145,147,'pp','现在完成时肯定：have/has + 过去分词'],
  [148,150,'pp','already / yet / just 与完成时'],
  [151,153,'pp','for + 时间段 / since + 时间点'],
  [154,156,'pp','现在完成时 vs 一般过去时选择 ⟲'],
  // Wave 2: comparison deep + conditional
  [157,159,'comp','比较级深化：less ... / as ... as / not as ... as'],
  [160,162,'comp','最高级深化：one of the most ... / the least ...'],
  [163,165,'cond1','条件句深化：unless / as long as / provided that'],
  [166,168,'cond1','时间从句中现在时表将来 ⟲（When I arrive, ...）'],
  // Wave 3: passive voice
  [169,171,'pass','被动语态现在时：is/are + 过去分词'],
  [172,174,'pass','被动语态过去时：was/were + 过去分词'],
  [175,177,'pass','主动 vs 被动选择 + by 短语 ⟲'],
  [178,180,'link','because / so 因果连接'],
  // Wave 4: linking words
  [181,183,'link','although / however / despite 让步转折'],
  [184,186,'link','连接词综合 ⟲：复合句与复杂句'],
  [187,189,'indq','间接问句：Could you tell me where ...?'],
  [190,192,'indq','礼貌请求 ⟲：I was wondering if ...'],
  // Wave 5: relative clauses
  [193,195,'relcl','限定性定语从句：who / which / that'],
  [196,198,'relcl','定语从句中关系代词的省略 ⟲'],
  [199,201,'rep','间接引语：时态后退规则'],
  [202,204,'rep','间接引语中的疑问句与请求 ⟲'],
  // Wave 6: spiral review
  [205,207,'pp','完成时 + 被动综合 ⟲（has been done）'],
  [208,210,'link','连接词 + 从句综合 ⟲'],
  [211,213,'pastc','过去进行时深化 ⟲：叙事中的背景描写'],
  [214,216,'past','过去时态全面复习 ⟲'],
  // Wave 7: modal deep
  [217,219,'modal','情态动词推测：must be / could be / might be'],
  [220,222,'modal','过去推测 ⟲：should have / could have + pp'],
  [223,225,'pp','完成进行时简介 ⟲：have been doing'],
  [226,228,'cond1','条件句 + 完成时综合 ⟲'],
  // Wave 8: synthesis
  [229,231,'pass','被动 + 情态 ⟲：should be done / must be fixed'],
  [232,234,'relcl','从句 + 连接词综合 ⟲'],
  [235,237,'rep','间接引语 + 被动综合 ⟲'],
  [238,240,'link','第二册毕业综合 ⟲（全部中级结构）'],

  // ─── Book 3 ────────────────────────────────────────────────────────────────
  [241,243,'timecl','时间从句：when / before / after / as soon as'],
  [244,246,'timecl','条件从句深化：if / unless / provided that ⟲'],
  [247,249,'timecl','让步从句：although / even though / despite ⟲'],
  [250,252,'ncl','名词性从句：I believe that ... / What he said ...'],
  [253,255,'timecl','从句综合 ⟲：时间 + 条件 + 让步 + 名词性'],
  [256,258,'relcl','非限定性定语从句 ⟲：..., which ...'],
  [259,261,'partcl','现在分词从句：Working late, Lin found the bug.'],
  [262,264,'partcl','过去分词从句：Written in Go, the service runs fast.'],
  [265,267,'gerinf','动名词 vs 不定式：enjoy doing / decide to do'],
  [268,270,'gerinf','非谓语结构综合 ⟲'],
  [271,273,'advpass','高级被动：情态 + 被动 / 完成 + 被动 ⟲'],
  [274,276,'pastp','过去完成时：叙事中的时间层次'],
  [277,279,'rep','高级间接引语 ⟲ + 情态后退'],
  [280,282,'advpass','时态与语态综合 ⟲'],
  [283,285,'disc','主题句与段落结构'],
  [286,288,'disc','衔接手段：过渡词 / 指代 / 重复关键词'],
  [289,291,'disc','平行结构与信息密度 ⟲'],
  [292,294,'disc','段落写作综合 ⟲'],
  [295,297,'hedge','正式缓和语气：may / appear to / suggest'],
  [298,300,'arg','第三册毕业综合 ⟲（从句 + 非谓语 + 段落 + 缓和）'],

  // ─── Book 4 ────────────────────────────────────────────────────────────────
  [301,303,'cond2','第二条件句：If + 过去式, would + 原形'],
  [304,306,'cond3','第三条件句：If + had pp, would have pp'],
  [307,309,'cond3','混合条件句 ⟲ + 条件句综合'],
  [310,312,'subj','虚拟语气：suggest / require that + 原形'],
  [313,315,'inv','倒装句：Never have I ... / Only then did ...'],
  [316,318,'inv','强调句：It is ... that ... + 省略'],
  [319,321,'inv','强调与压缩综合 ⟲'],
  [322,324,'hedge','正式缓和语气深化 ⟲：based on / to some extent'],
  [325,327,'arg','论证结构：主张 → 证据 → 结论'],
  [328,330,'arg','论证：让步与反驳（Admittedly ...; however ...）'],
  [331,333,'arg','论证综合 ⟲'],
  [334,336,'disc','语篇衔接深化 ⟲：Furthermore / In conclusion'],
  [337,339,'disc','长文结构 ⟲：Introduction → Body → Conclusion'],
  [340,342,'disc','正式写作综合 ⟲'],
  [343,345,'arg','全册应用综合 ⟲（论证 + 缓和 + 衔接）'],
  [346,348,'disc','第四册毕业综合 ⟲（全部高级结构）'],
];

// Expand ranges into per-lesson array [grammarKey, subFocus]
const SPIRAL = new Array(348);
for (const [start, end, gKey, focus] of SPIRAL_RANGES) {
  for (let i = start; i <= end; i++) SPIRAL[i - 1] = [gKey, focus];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON DATA — 348 lessons with unique topic vocabulary
// Format: [topicEN, topicCN, grammarKey, character, [6 topic words]]
// ═══════════════════════════════════════════════════════════════════════════════

const LD = [
// ─── Book 1: Lessons 001–144 ────────────────────────────────────────────────
// Unit 1: be verbs (Lessons 1-12)
['Hello','问候','be','Lin Wei',['Shanghai','thirty-two','developer','on the third floor','modern','happy']],
['Names','姓名','be','Mia Chen',['Beijing','twenty-eight','designer','near the window','creative','glad']],
['Countries','国家','be','Tom Park',['Seoul','forty','tester','in Building B','quiet','ready']],
['Jobs','职业','be','Sara Li',['Shenzhen','thirty-five','project manager','downtown','busy','proud']],
['Teams','团队','be','Alex Wang',['Hangzhou','twenty-nine','frontend developer','on floor five','open-plan','excited']],
['Polite Responses','礼貌回应','be','Yuki Tanaka',['Tokyo','thirty-one','backend engineer','next to the cafeteria','new','grateful']],
['Spelling','拼读','be','Ravi Gupta',['Mumbai','thirty-three','DevOps engineer','in the east wing','large','confident']],
['Numbers','数字','be','Emma Liu',['Guangzhou','twenty-six','data analyst','on the second floor','bright','calm']],
['Phone Calls','电话','be','David Zhou',['Nanjing','thirty-eight','support engineer','in room 301','small','helpful']],
['Email','邮箱','be','Nina Zhao',['Chengdu','twenty-seven','UX researcher','in a co-working space','warm','pleased']],
['Schedules','日程','be','James Hu',['Wuhan','thirty-four','scrum master','on the ground floor','spacious','organized']],
['Review 1','第一单元复习','be','Lin Wei',['Shanghai','thirty-two','developer','on the third floor','friendly','thankful']],
// Unit 2: possessives (Lessons 13-24)
['Family','家庭','poss','Lin Wei',['laptop','screen','new','phone','Mia','tidy']],
['Friends','朋友','poss','Mia Chen',['bag','color','blue','headphones','Tom','comfortable']],
['Colleagues','同事','poss','Tom Park',['monitor','size','large','keyboard','Alex','expensive']],
['Appearance','外貌','poss','Sara Li',['jacket','style','elegant','glasses','Ravi','professional']],
['Personality','性格','poss','Alex Wang',['attitude','team','positive','idea','Sara','helpful']],
['Job Titles','职位','poss','Yuki Tanaka',['role','level','senior','project','Emma','interesting']],
['Departments','部门','poss','Ravi Gupta',['office','space','shared','desk','David','organized']],
['Relationships','关系','poss','Emma Liu',['sister','job','similar','brother','Nina','close']],
['Introducing Others','介绍他人','poss','David Zhou',['colleague','skill','strong','manager','James','reliable']],
['Likes','喜欢','poss','Nina Zhao',['book','topic','favorite','playlist','Lin','relaxing']],
['Small Talk','日常聊天','poss','James Hu',['hobby','type','outdoor','weekend plan','Mia','energetic']],
['Review 2','第二单元复习','poss','Lin Wei',['notebook','cover','dark','charger','Tom','personal']],
// Unit 3: simple present (Lessons 25-36)
['Waking Up','起床','spr','Lin Wei',['wakes up','morning','checks messages','thirty minutes','skip breakfast','reads news']],
['Breakfast','早餐','spr','Mia Chen',['makes coffee','weekday','eats toast','ten minutes','eat out','prepares lunch']],
['Commuting','通勤','spr','Tom Park',['takes the subway','day','listens to podcasts','forty minutes','drive','walks to the station']],
['Time','时间','spr','Sara Li',['starts work','nine o\'clock','has lunch','one hour','leave early','finishes at six']],
['Days of the Week','星期','spr','Alex Wang',['codes','Monday','reviews PRs','two hours','work weekends','plays basketball']],
['Workdays','工作日','spr','Yuki Tanaka',['joins standup','morning','writes tests','the afternoon','skip meetings','updates the board']],
['After Work','下班','spr','Ravi Gupta',['exercises','evening','cooks dinner','an hour','order food','watches a show']],
['Housework','家务','spr','Emma Liu',['cleans','Saturday','does laundry','one hour','hire help','organizes the desk']],
['Rest','休息','spr','David Zhou',['rests','Sunday','reads books','two hours','work overtime','takes a nap']],
['Habits','习惯','spr','Nina Zhao',['drinks water','hour','stretches','five minutes','forget','sets a reminder']],
['Frequency','频率','spr','James Hu',['exercises','week','orders takeout','three','miss gym','walks the dog']],
['Review 3','第三单元复习','spr','Lin Wei',['checks email','morning','writes code','six hours','procrastinate','plans tomorrow']],
// Unit 4: prepositions (Lessons 37-48)
['The Office','办公室','prep','Lin Wei',['nine','third','kitchen','the gym','meeting room','six thirty']],
['Home','家','prep','Mia Chen',['seven thirty','second','living room','the park','balcony','ten']],
['Shops','商店','prep','Tom Park',['noon','ground','mall','the restaurant','electronics section','one']],
['Restaurants','餐厅','prep','Sara Li',['twelve thirty','first','dining area','the office','corner table','two']],
['Transport','交通','prep','Alex Wang',['eight','platform','station','the airport','gate B','four']],
['Asking Directions','问路','prep','Yuki Tanaka',['three','fifth','lobby','the hotel','reception desk','five']],
['Locations','位置','prep','Ravi Gupta',['ten','fourth','lab','the library','server room','eight']],
['Booking','预订','prep','Emma Liu',['seven','sixth','lounge','the cinema','seat 12A','nine thirty']],
['Maps','地图','prep','David Zhou',['eleven','second','parking lot','the museum','entrance','three thirty']],
['Weather','天气','prep','Nina Zhao',['six','rooftop','garden','the market','shelter','four thirty']],
['Travel','旅行','prep','James Hu',['five','ground','airport','the hotel','departure gate','seven']],
['Review 4','第四单元复习','prep','Lin Wei',['nine','third','hallway','the canteen','desk area','six']],
// Unit 5: present continuous (Lessons 49-60)
['Present Continuous','现在进行时','prc','Lin Wei',['writing a unit test','discussing the sprint','attending the standup','reviewing code','debugging the API','going']],
['Work Actions','工作动作','prc','Mia Chen',['designing a new screen','testing the prototype','joining a call','updating the board','preparing slides','running']],
['Meeting Actions','会议动作','prc','Tom Park',['presenting the demo','taking notes','asking questions','sharing the screen','waiting for feedback','listening']],
['Home Actions','家庭动作','prc','Sara Li',['cooking dinner','watching a tutorial','cleaning the room','exercising','reading a book','resting']],
['Waiting','等待','prc','Alex Wang',['waiting for the build','downloading the update','loading the page','processing the request','syncing the repo','installing']],
['Changes','变化','prc','Yuki Tanaka',['moving to a new team','learning a new language','changing the architecture','improving the process','growing quickly','adapting']],
['Describing Pictures','图片描述','prc','Ravi Gupta',['sitting at a desk','typing on a keyboard','looking at the screen','holding a coffee cup','standing by the board','smiling']],
['Progress','进度','prc','Emma Liu',['completing the migration','fixing the last bug','finishing the report','deploying the patch','closing the sprint','wrapping up']],
['Interruptions','打断','prc','David Zhou',['working on the fix','getting a phone call','handling an alert','answering a question','solving a conflict','pausing']],
['Arrangements','安排','prc','Nina Zhao',['meeting a client tomorrow','flying to Beijing next week','starting the new project Monday','having lunch with the PM','leaving early today','planning']],
['Tense Comparison','对比时态','prc','James Hu',['coding right now','always checking twice','testing at the moment','usually finishing by five','currently deploying','reviewing']],
['Review 5','第五单元复习','prc','Lin Wei',['writing documentation','reviewing a PR','not attending today','working from home','deploying the fix','focusing']],
// Unit 6: countable/uncountable (Lessons 61-72)
['Food','食物','count','Lin Wei',['coffee','milk','sandwiches','cake','information','equipment']],
['Quantities','数量','count','Mia Chen',['water','sugar','cups','advice','software','furniture']],
['Prices','价格','count','Tom Park',['tea','bread','bottles','feedback','progress','luggage']],
['Ordering','点餐','count','Sara Li',['juice','rice','salads','help','work','money']],
['Paying','支付','count','Alex Wang',['change','cash','receipts','information','time','news']],
['Clothes','衣物','count','Yuki Tanaka',['shirts','cotton','pairs','experience','homework','weather']],
['Returns','退换','count','Ravi Gupta',['items','packaging','boxes','evidence','traffic','music']],
['Customer Service','客服','count','Emma Liu',['issues','patience','tickets','knowledge','research','electricity']],
['Delivery','快递','count','David Zhou',['packages','tape','labels','permission','data','air']],
['Appointments','预约','count','Nina Zhao',['slots','availability','options','guidance','space','health']],
['Gratitude','感谢','count','James Hu',['gifts','wrapping','cards','support','luck','sunshine']],
['Review 6','第六单元复习','count','Lin Wei',['tasks','documentation','bugs','advice','progress','equipment']],
// Unit 7: simple past (Lessons 73-84)
['Yesterday','昨天','past','Lin Wei',['arrived','tested','showed','went','leave','relaxed']],
['Last Week','上周','past','Mia Chen',['designed','presented','sent','worked','rest','cooked']],
['Weekend','周末','past','Tom Park',['fixed','investigated','found','responded','sleep','went out']],
['A Trip','旅行','past','Sara Li',['traveled','visited','took','enjoyed','forget','came back']],
['A Party','一次聚会','past','Alex Wang',['attended','met','talked','had','miss','got home']],
['Past Work','过去工作','past','Yuki Tanaka',['joined','learned','built','grew','complain','moved on']],
['Completing Tasks','完成任务','past','Ravi Gupta',['finished','submitted','received','passed','delay','celebrated']],
['Past Places','过去地点','past','Emma Liu',['lived','studied','worked','moved','stay','returned']],
['Weather Stories','天气','past','David Zhou',['rained','canceled','stayed','cleared up','go out','waited']],
['An Accident','意外','past','Nina Zhao',['dropped','broke','called','fixed','panic','calmed down']],
['Short Stories','小故事','past','James Hu',['woke up','forgot','ran','caught','give up','laughed']],
['Review 7','第七单元复习','past','Lin Wei',['wrote','deployed','found','resolved','ignore','documented']],
// Unit 8: future (Lessons 85-96)
['Tomorrow','明天','future','Lin Wei',['deploy the hotfix','Monday','review the design','skip the standup','attend the retro','confirm with QA']],
['Next Week','下周','future','Mia Chen',['start the redesign','Wednesday','present the mockup','postpone the demo','finish wireframes','send updates']],
['Making Plans','约时间','future','Tom Park',['run the regression tests','Thursday','update the test plan','miss the deadline','automate the checks','notify the team']],
['Invitations','邀请','future','Sara Li',['join the workshop','Friday','prepare materials','cancel the event','coordinate logistics','send reminders']],
['Accepting','接受','future','Alex Wang',['help with the migration','Tuesday','pair-program','refuse the request','share the workload','set up the environment']],
['Declining','拒绝','future','Yuki Tanaka',['complete the audit','next month','schedule a follow-up','drop everything','prioritize the backlog','document the decision']],
['Suggestions','建议','future','Ravi Gupta',['try a new approach','this sprint','experiment with caching','rush the release','measure the results','report findings']],
['Calendar','日历','future','Emma Liu',['book the room','tomorrow afternoon','invite stakeholders','double-book','check availability','confirm attendance']],
['Travel Plans','旅行计划','future','David Zhou',['fly to Shenzhen','next Friday','visit the client','forget the ticket','book the hotel','pack light']],
['Study Plans','学习计划','future','Nina Zhao',['take an online course','this quarter','practice speaking','procrastinate','set weekly goals','track progress']],
['Work Plans','工作计划','future','James Hu',['onboard the intern','next Monday','write the guide','overwhelm them','introduce the team','plan the first week']],
['Review 8','第八单元复习','future','Lin Wei',['refactor the module','next sprint','improve test coverage','skip documentation','merge the branch','update the roadmap']],
// Unit 9: modals (Lessons 97-108)
['Body','身体','modal','Lin Wei',['take a break','stretch every hour','finish the sprint','skip lunch','help with the presentation']],
['Seeing a Doctor','看医生','modal','Mia Chen',['rest more','reduce screen time','complete the deadline','ignore the pain','ask for sick leave']],
['Medicine','药物','modal','Tom Park',['read the instructions','follow the dosage','take risks with health','self-diagnose','consult a doctor']],
['Sleep','睡眠','modal','Sara Li',['sleep earlier','avoid caffeine after 3 PM','work until midnight','check the phone in bed','set an alarm']],
['Stress','压力','modal','Alex Wang',['delegate tasks','take short breaks','handle everything alone','overcommit','talk to someone']],
['Feelings','感受','modal','Yuki Tanaka',['express concerns','listen actively','hide emotions','dismiss feedback','be patient']],
['Encouragement','鼓励','modal','Ravi Gupta',['try again','learn from mistakes','give up after one failure','compare yourself to others','celebrate small wins']],
['Taking Leave','请假','modal','Emma Liu',['submit the form early','notify the team','leave without telling anyone','forget the handover','plan coverage']],
['Recovery','恢复','modal','David Zhou',['ease back in','start with light tasks','jump into complex work','skip warm-up','ask for a gradual return']],
['Exercise','运动','modal','Nina Zhao',['walk during lunch','use the stairs','sit all day','skip all movement','find an exercise buddy']],
['Health Advice','健康建议','modal','James Hu',['drink more water','eat regular meals','rely on energy drinks','skip breakfast','maintain a routine']],
['Review 9','第九单元复习','modal','Lin Wei',['prioritize health','set boundaries','overwork','ignore warning signs','communicate needs']],
// Unit 10: future continued + review (Lessons 109-120)
['Answering Calls','接电话','future','Lin Wei',['call back in ten minutes','later today','check the issue','forget the callback','confirm the number','leave a voicemail']],
['Leaving Messages','留言','future','Mia Chen',['send a follow-up email','this afternoon','include the details','lose the message','record the key points','reply by end of day']],
['Confirming Identity','确认身份','future','Tom Park',['verify the account','right now','reset the password','share credentials','use two-factor auth','secure the login']],
['Repeating Info','重复信息','future','Sara Li',['repeat the number slowly','immediately','spell the name','mishear the address','confirm by email','double-check']],
['Network Issues','网络问题','future','Alex Wang',['reconnect in a moment','shortly','try a different network','ignore the lag','restart the router','test the connection']],
['Short Emails','简短邮件','future','Yuki Tanaka',['send a brief update','by 5 PM','attach the file','forget the subject line','proofread before sending','keep it concise']],
['Chat Messages','聊天消息','future','Ravi Gupta',['post in the channel','before lunch','tag the right person','flood the chat','keep messages short','follow up if needed']],
['Status Updates','状态更新','future','Emma Liu',['share progress','every morning','mention blockers','hide problems','include next steps','ask for feedback']],
['Reminders','提醒','future','David Zhou',['set a reminder','tonight','follow up tomorrow','forget the deadline','use a calendar alert','ping the team']],
['Apologies','道歉','future','Nina Zhao',['apologize sincerely','right away','explain what happened','make excuses','offer a solution','prevent it next time']],
['Closing','结束语','future','James Hu',['wrap up the call','in two minutes','summarize the action items','end abruptly','thank everyone','schedule the next one']],
['Review 10','第十单元复习','future','Lin Wei',['follow up','by Friday','confirm the plan','miss the step','document the outcome','close the loop']],
// Unit 11: mixed (Lessons 121-132) — using simple present for tech basics
['Computer','电脑','spr','Lin Wei',['opens the laptop','morning','logs into the system','thirty seconds','shut down incorrectly','saves work regularly']],
['Accounts','账号','spr','Mia Chen',['creates a new account','first day','sets a strong password','a minute','share passwords','enables two-factor']],
['Login','登录','spr','Tom Park',['enters the password','every time','clicks the login button','five seconds','forget credentials','resets via email']],
['Files','文件','spr','Sara Li',['organizes files','week','names them clearly','ten minutes','lose documents','backs up to cloud']],
['Tasks','任务','spr','Alex Wang',['assigns tasks','sprint','updates the status','daily','ignore deadlines','reviews the board']],
['Deadlines','截止日期','spr','Yuki Tanaka',['checks deadlines','Monday','plans the week','one hour','miss due dates','sets reminders']],
['Problems','问题','spr','Ravi Gupta',['reports issues','immediately','describes the steps','three minutes','ignore errors','attaches screenshots']],
['Asking for Help','帮助','spr','Emma Liu',['asks teammates','when stuck','explains the context','a few minutes','struggle alone','shares the error log']],
['Simple Meetings','简单会议','spr','David Zhou',['joins on time','day','mutes when not talking','thirty minutes','dominate the call','takes brief notes']],
['Progress Reports','进展','spr','Nina Zhao',['updates the board','afternoon','writes a short note','five minutes','hide blockers','mentions next steps']],
['Delivery','交付','spr','James Hu',['delivers on time','sprint','verifies quality','an hour','ship untested code','celebrates with the team']],
['Review 11','第十一单元复习','spr','Lin Wei',['follows the process','day','communicates clearly','fifteen minutes','skip steps','improves continuously']],
// Unit 12: comprehensive review (Lessons 133-144) — mixed grammar
['Self Introduction','自我介绍','be','Lin Wei',['Suzhou','thirty','full-stack developer','in the tech park','collaborative','motivated']],
['My Day','我的一天','spr','Mia Chen',['starts work','eight thirty','designs interfaces','six hours','skip breaks','goes for a walk']],
['Booking a Meeting','约一次会议','future','Tom Park',['schedule a sync','tomorrow','invite the leads','double-book','confirm the agenda','send a calendar invite']],
['Explaining a Problem','说明问题','past','Sara Li',['noticed','investigated','found','reported','ignore','documented']],
['Asking for Help','请求帮助','modal','Alex Wang',['pair-program','ask the tech lead','fix it alone','panic','suggest a workaround']],
['Shopping','购物任务','count','Yuki Tanaka',['snacks','water','bottles','receipt','change','bags']],
['A Trip','旅行任务','past','Ravi Gupta',['flew','arrived','checked in','explored','oversleep','returned']],
['Work Update','工作更新','prc','Emma Liu',['finishing the feature','testing edge cases','not blocking anyone','preparing the release notes','waiting for review','merging']],
['Phone Message','电话留言','future','David Zhou',['call back','this evening','share the update','lose the number','confirm the address','leave a detailed message']],
['Short Email','短邮件','spr','Nina Zhao',['writes clearly','always','includes action items','every email','ramble','proofreads before sending']],
['Dialogue Practice','综合对话','be','James Hu',['Xiamen','thirty-six','architect','in the innovation lab','supportive','eager']],
['Book 1 Graduation','毕业复习','spr','Lin Wei',['reviews progress','month','sets new goals','one hour','stop learning','celebrates milestones']],
// ─── Book 2: Lessons 145–240 ────────────────────────────────────────────────
// Unit 1: past continuous (Lessons 145-152)
['Past Habits','过去习惯','pastc','Lin Wei',['debugging a tricky issue','server outage','reviewing the PR','called for help','working from home','handling alerts']],
['Past Continuous','过去进行时','pastc','Mia Chen',['designing the homepage','notification arrived','sketching wireframes','asked for input','listening to music','creating mockups']],
['Present Perfect','现在完成时','pp','Tom Park',['completed the migration','deployed three times','used this stack','fixed the flaky test','worked here','maintained the docs']],
['Already and Yet','已经与还没有','pp','Sara Li',['finished the review','approved the PR','merged the branch','updated the changelog','responded to the comment','closed the ticket']],
['Duration','持续时间','pp','Alex Wang',['used this framework','three years','worked remotely','2020','maintained this service','six months']],
['Life Experiences','人生经历','pp','Yuki Tanaka',['traveled to five countries','presented at a conference','led a cross-functional team','mentored a junior dev','contributed to open source','handled a production incident']],
['Changes','变化','pp','Ravi Gupta',['switched from Java to Go','improved the CI pipeline','reduced build time','increased test coverage','streamlined the process','automated the deployment']],
['Review B2U1','复习','pastc','Emma Liu',['writing tests','alert triggered','reading the report','interrupted','checking logs','analyzing data']],
// Unit 2: comparatives (Lessons 153-160)
['Reasons','原因','link','Lin Wei',['stayed late','deadline','urgent','difficult','finished on time','quality improved']],
['Results','结果','link','Mia Chen',['redesigned the page','UX score','poor','challenging','increased engagement','user satisfaction rose']],
['Purpose','目的','link','Tom Park',['added monitoring','system','unreliable','complex','detected issues faster','uptime improved']],
['Comparison','比较','comp','Sara Li',['framework','fast','React','popular','Vue','lightweight']],
['Superlatives','最高级','comp','Alex Wang',['approach','efficient','method','reliable','tool','scalable']],
['Choices','选择','comp','Yuki Tanaka',['option','cost-effective','plan A','flexible','plan B','risky']],
['Quantities','数量','comp','Ravi Gupta',['version','stable','release','fast','update','comprehensive']],
['Review B2U2','复习','comp','Emma Liu',['solution','simple','alternative','powerful','library','mature']],
// Unit 3: first conditional (Lessons 161-168)
['Changing Plans','预约变更','cond1','Lin Wei',['finishes the test','deploy','miss the window','build','checks the config','escalate']],
['Health Advice','健康建议','cond1','Mia Chen',['rests properly','recover','push too hard','condition','sees a doctor','get worse']],
['Travel Issues','旅行问题','cond1','Tom Park',['arrives on time','catch the flight','delays','traffic','books a later one','miss the meeting']],
['Housing','住房问题','cond1','Sara Li',['signs the lease','move in','find issues','apartment','reports them','lose the deposit']],
['Client Requests','客户请求','cond1','Alex Wang',['delivers by Friday','renew the contract','fails','project','negotiates','lose the client']],
['Complaints','投诉','cond1','Yuki Tanaka',['apologizes sincerely','calm down','ignores the issue','customer','offers a fix','escalate']],
['Apologies','道歉','cond1','Ravi Gupta',['explains clearly','understand','hides the truth','situation','admits the mistake','trust is lost']],
['Review B2U3','复习','cond1','Emma Liu',['prepares well','succeed','skips preparation','presentation','practices','fail']],
// Unit 4: passive voice (Lessons 169-176)
['Clear Subjects','清晰主题','pass','Lin Wei',['email','sent','PR','reviewed','report','submitted']],
['Background','背景说明','pass','Mia Chen',['feature','designed','prototype','tested','feedback','collected']],
['Requesting Action','请求行动','pass','Tom Park',['ticket','assigned','fix','deployed','change','approved']],
['Polite Follow-up','礼貌催办','pass','Sara Li',['update','expected','document','shared','confirmation','received']],
['Confirming Decisions','确认决定','pass','Alex Wang',['decision','made','plan','agreed','timeline','set']],
['Bad News','坏消息','pass','Yuki Tanaka',['release','postponed','feature','removed','budget','cut']],
['Thank You Follow-up','感谢跟进','pass','Ravi Gupta',['issue','resolved','suggestion','implemented','team','recognized']],
['Review B2U4','复习','pass','Emma Liu',['code','merged','test','executed','defect','logged']],
// Unit 5: present perfect continued (Lessons 177-184)
['Task Status','任务状态','pp','Lin Wei',['completed the backend','shipped the API','refactored the module','updated the tests','worked on this','two weeks']],
['Completion','完成情况','pp','Mia Chen',['finished all designs','delivered the assets','received approval','published the docs','worked on branding','three months']],
['Timelines','时间线','pp','Tom Park',['run the tests','automated the pipeline','caught five regressions','reported all blockers','maintained the suite','January']],
['Dependencies','依赖关系','pp','Sara Li',['integrated the SDK','resolved the conflict','updated the library','removed the legacy code','managed dependencies','last quarter']],
['Priorities','优先级','pp','Alex Wang',['addressed the P1','handled three incidents','reduced the backlog','triaged all issues','focused on reliability','six weeks']],
['Risks','风险','pp','Yuki Tanaka',['identified the risk','escalated the concern','documented the mitigation','monitored the metric','tracked this risk','April']],
['Blockers','阻塞项','pp','Ravi Gupta',['unblocked the team','removed the dependency','found a workaround','cleared the queue','dealt with blockers','this sprint']],
['Review B2U5','复习','pp','Emma Liu',['closed all tickets','improved the score','stabilized the service','onboarded new members','supported the team','2024']],
// Unit 6: indirect questions (Lessons 185-192)
['Reproducing Issues','复现问题','indq','Lin Wei',['error occurs','steps','log file','version','reproduce it','expected behavior']],
['Asking Details','询问细节','indq','Mia Chen',['deadline','feature scope','priority','decision','owner','next step']],
['Collecting Evidence','收集证据','indq','Tom Park',['timestamp','affected users','error code','environment','frequency','root cause']],
['Explaining Steps','解释步骤','indq','Sara Li',['process','restart','configuration','order','dependency','outcome']],
['Temporary Solutions','临时方案','indq','Alex Wang',['workaround','risk','duration','approval','limitation','alternative']],
['Escalation','升级问题','indq','Yuki Tanaka',['severity','impact','timeline','owner','action plan','status']],
['Closing Tickets','关闭工单','indq','Ravi Gupta',['resolution','verification','customer confirmation','documentation','follow-up','root cause fix']],
['Review B2U6','复习','indq','Emma Liu',['meeting time','agenda','availability','format','platform','recording']],
// Unit 7: linking words (Lessons 193-200)
['Opening','开场','link','Lin Wei',['started the meeting','agenda','clear','short','covered all points','mood was positive']],
['Giving Opinions','表达意见','link','Mia Chen',['shared her view','design','valid','risky','persuaded the team','outcome was good']],
['Agreeing','同意','link','Tom Park',['agreed with the plan','testing','thorough','time-consuming','saved effort later','bugs decreased']],
['Polite Disagreement','礼貌不同意','link','Sara Li',['raised a concern','approach','efficient','incomplete','suggested a revision','compromise was reached']],
['Clarifying','澄清','link','Alex Wang',['asked for clarification','requirement','ambiguous','important','avoided a mistake','everyone understood']],
['Summarizing','总结','link','Yuki Tanaka',['summarized the discussion','decision','final','complex','recorded action items','meeting ended well']],
['Action Items','行动项','link','Ravi Gupta',['listed the next steps','timeline','tight','realistic','assigned owners','accountability improved']],
['Review B2U7','复习','link','Emma Liu',['proposed a change','process','slow','necessary','team adapted','efficiency rose']],
// Unit 8: relative clauses (Lessons 201-208)
['User Needs','用户需求','relcl','Lin Wei',['reported the issue','open-source','took three months','supports large files','fixed the critical bug']],
['Feature Descriptions','功能说明','relcl','Mia Chen',['handles authentication','lightweight','improved load time','scales automatically','simplified the workflow']],
['Usage Steps','使用步骤','relcl','Tom Park',['runs the tests','cross-platform','checks every commit','integrates with CI','validates the schema']],
['Feedback','反馈','relcl','Sara Li',['gave useful feedback','senior','reviewed carefully','caught edge cases','improved the solution']],
['Improvement Suggestions','改进建议','relcl','Alex Wang',['reduces complexity','modular','handles errors gracefully','supports retry logic','logs all events']],
['Comparing Solutions','比较方案','relcl','Yuki Tanaka',['costs less','mature','has better documentation','requires less setup','offers more flexibility']],
['Release Notes','发布通知','relcl','Ravi Gupta',['fixes the memory leak','stable','addresses user complaints','improves performance','adds dark mode']],
['Review B2U8','复习','relcl','Emma Liu',['manages the backlog','experienced','coordinates releases','mentors new joiners','drives quality']],
// Unit 9: reported speech (Lessons 209-216)
['Number Trends','数字趋势','rep','Lin Wei',['metric was improving','would share the data','had increased by 20%','needed more context','had tracked it since March']],
['Chart Descriptions','图表描述','rep','Mia Chen',['chart showed growth','would present findings','had prepared the slides','wanted more detail','had analyzed the trend']],
['Goals and Results','目标与结果','rep','Tom Park',['target was ambitious','would adjust the plan','had met the quarterly goal','required more resources','had exceeded expectations']],
['Anomalies','异常','rep','Sara Li',['anomaly was unexpected','would investigate further','had never seen this before','could not explain it yet','had checked all logs']],
['Predictions','预测','rep','Alex Wang',['trend would continue','would reach the target','had been declining','might recover next quarter','had factored in seasonality']],
['Metrics','指标','rep','Yuki Tanaka',['conversion rate was stable','would monitor weekly','had dropped slightly','seemed related to the change','had set up alerts']],
['Short Reports','简短报告','rep','Ravi Gupta',['summary was ready','would send it by EOD','had completed the analysis','needed one more review','had included recommendations']],
['Review B2U9','复习','rep','Emma Liu',['system was stable','would update the team','had resolved the issue','planned to document it','had informed all stakeholders']],
// Unit 10: linking + relative (Lessons 217-224)
['Asking for Help','请求帮助','link','Lin Wei',['asked for help','task','complex','unfamiliar','received guidance','finished faster']],
['Offering Help','提供帮助','link','Mia Chen',['offered assistance','colleague','stuck','grateful','unblocked the work','relationship strengthened']],
['Assigning Work','分配工作','link','Tom Park',['assigned the task','workload','heavy','fair','distributed evenly','morale improved']],
['Handover','交接任务','link','Sara Li',['documented everything','transition','smooth','thorough','new owner understood','no information was lost']],
['Remote Work','远程协作','link','Alex Wang',['used async communication','timezone','different','challenging','reduced meetings','productivity rose']],
['Cross-timezone','跨时区','link','Yuki Tanaka',['scheduled overlap hours','delay','unavoidable','manageable','improved coordination','fewer misunderstandings']],
['Conflict Resolution','冲突处理','link','Ravi Gupta',['addressed the disagreement','tension','high','resolvable','found common ground','trust was rebuilt']],
['Review B2U10','复习','link','Emma Liu',['changed the approach','result','positive','unexpected','team learned','process improved']],
// Unit 11: present perfect + comparatives (Lessons 225-232)
['Learning Experiences','学习经历','pp','Lin Wei',['learned TypeScript','completed three courses','earned a certification','studied system design','practiced daily','2023']],
['Skills Introduction','技能介绍','pp','Mia Chen',['mastered Figma','worked with design systems','created component libraries','collaborated with devs','improved accessibility','two years']],
['Personal Goals','个人目标','pp','Tom Park',['set clear goals','achieved the first milestone','tracked progress weekly','adjusted the plan','built consistency','January']],
['Feedback','反馈','comp','Sara Li',['review','detailed','self-assessment','honest','peer feedback','constructive']],
['Interview Questions','面试问题','comp','Alex Wang',['experience','relevant','project','challenging','outcome','measurable']],
['Achievement Stories','成果故事','pp','Yuki Tanaka',['led the migration','saved the company money','reduced downtime','automated the workflow','improved the SLA','last year']],
['Career Emails','职业邮件','pp','Ravi Gupta',['applied for the role','updated the resume','networked with recruiters','prepared for interviews','received an offer','this month']],
['Review B2U11','复习','pp','Emma Liu',['grown professionally','expanded the skill set','contributed to open source','mentored others','built a portfolio','since 2022']],
// Unit 12: Book 2 project (Lessons 233-240)
['Travel Narrative','旅行叙述','past','Lin Wei',['booked','flew','checked in','explored','tried','returned']],
['Problem Report','问题报告','pass','Mia Chen',['incident','detected','service','affected','fix','deployed']],
['User Email','用户邮件','cond1','Tom Park',['contacts support','resolve the issue','ignores it','satisfaction','follows up','lose the customer']],
['Weekly Report','项目周报','pp','Sara Li',['completed the sprint','delivered four features','resolved all blockers','updated documentation','worked overtime','this week']],
['Meeting Minutes','会议纪要','rep','Alex Wang',['decision was final','would implement next sprint','had discussed alternatives','needed budget approval','had agreed on the timeline']],
['Product Description','产品说明','relcl','Yuki Tanaka',['automates deployment','cloud-native','reduces human error','integrates with existing tools','provides real-time monitoring']],
['Work Story','工作故事','pastc','Ravi Gupta',['presenting the quarterly results','fire alarm went off','preparing the demo','client called unexpectedly','running the final test','debugging late']],
['Book 2 Graduation','毕业复习','link','Emma Liu',['reflected on the year','growth','significant','challenging','set new objectives','confidence increased']],
// ─── Book 3: Lessons 241–300 ────────────────────────────────────────────────
// Unit 1: time/condition clauses (Lessons 241-245)
['Time Clauses','时间从句','timecl','Lin Wei',['merges the PR','alerts the team','build completes','deploy','deadline was short','delivered on time']],
['Condition Clauses','条件从句','timecl','Mia Chen',['approves the design','proceed to development','test fails','investigate','timeline was aggressive','met expectations']],
['Concession Clauses','让步从句','timecl','Tom Park',['raised objections','continued with the plan','evidence was limited','made a decision','scope was large','kept quality high']],
['Cause and Result','原因与结果从句','timecl','Sara Li',['noticed the spike','restarted the service','latency increased','added caching','team was small','handled the load']],
['Review B3U1','复习','timecl','Alex Wang',['completes the review','merge immediately','pipeline breaks','rollback','pressure was high','stayed calm']],
// Unit 2: relative + noun clauses (Lessons 246-250)
['Defining Relatives','定语从句','relcl','Lin Wei',['wrote the algorithm','performant','reduced response time','handles edge cases','optimized the query']],
['Noun Clauses','名词性从句','ncl','Mia Chen',['approach','improvement','the timeline will slip','change strategy','migration failed','caused concern']],
['Participle Phrases','分词短语','partcl','Tom Park',['reviewed the code','approved the merge','Written in Go','runs efficiently','knowing the risk','proceeded carefully']],
['Gerunds and Infinitives','不定式与动名词','gerinf','Sara Li',['refactoring','implement the new API','Documenting','avoid rushing','plan to release','considering postponing']],
['Review B3U2','复习','ncl','Alex Wang',['decision','necessary','the team will adapt','reconsider','system crashed','was unexpected']],
// Unit 3: advanced tenses (Lessons 251-255)
['Passive Voice','被动语态','advpass','Lin Wei',['feature','released','database','migrated','security patch','applied']],
['Reported Speech','间接引语','rep','Mia Chen',['design was approved','would finalize by Friday','had completed the user research','needed more feedback','had shared the prototype']],
['Modal Deduction','情态推测','modal','Tom Park',['be a memory leak','check the heap dump','have crashed due to load','investigate the logs','have been caused by the update']],
['Past Perfect','过去完成时','pastp','Sara Li',['joined the call','already discussed the solution','had identified the root cause','deployed the fix','had tested thoroughly','everything was stable']],
['Review B3U3','复习','advpass','Alex Wang',['issue','resolved','improvement','implemented','risk','mitigated']],
// Unit 4: discourse (Lessons 256-260)
['Topic Sentences','主题句','disc','Lin Wei',['system reliability','monitoring tools','response time optimization','incident patterns','cost reduction','team efficiency']],
['Connectors','连接词','disc','Mia Chen',['design consistency','user research findings','accessibility improvements','performance metrics','feedback integration','iterative process']],
['Parallel Structure','平行结构','disc','Tom Park',['testing strategy','automation benefits','quality metrics','coverage targets','regression prevention','continuous improvement']],
['Reference and Repetition','指代与重复','disc','Sara Li',['architecture decision','scalability requirements','maintainability concerns','technical debt','long-term vision','short-term trade-offs']],
['Review B3U4','复习','disc','Alex Wang',['project summary','key achievements','lessons learned','next steps','team acknowledgment','future direction']],
// Unit 5: meetings (Lessons 261-265)
['Agenda Setting','议程','timecl','Lin Wei',['starts the meeting','reviews the agenda','build finishes','discuss results','time was limited','prioritized topics']],
['Clarifying Assumptions','澄清假设','indq','Mia Chen',['requirement means','scope includes','timeline allows','user expects','constraint applies','priority is']],
['Raising Concerns','提出担忧','link','Tom Park',['raised a risk','capacity','limited','critical','proposed mitigation','team agreed']],
['Comparing Options','比较选项','comp','Sara Li',['solution','scalable','option A','maintainable','option B','cost-effective']],
['Review B3U5','复习','link','Alex Wang',['summarized the outcome','consensus','strong','productive','documented decisions','follow-up scheduled']],
// Unit 6: requirements (Lessons 266-270)
['Requirements Writing','需求说明','ncl','Lin Wei',['requirement','clear','the system will handle 1000 users','add rate limiting','scope was defined','remained feasible']],
['User Stories','用户故事','gerinf','Mia Chen',['onboarding','create a user profile','Simplifying','avoid confusing navigation','plan to add tooltips','considering removing the step']],
['Acceptance Criteria','验收标准','cond1','Tom Park',['meets all criteria','mark as done','fails one check','reject','passes regression','approve']],
['Design Explanation','设计解释','relcl','Sara Li',['separates concerns','modular','improves testability','reduces coupling','supports extension']],
['Review B3U6','复习','ncl','Alex Wang',['constraint','reasonable','the API will support pagination','implement caching','requirement changed','adapted quickly']],
// Unit 7: quality (Lessons 271-275)
['Bug Reports','缺陷报告','pass','Lin Wei',['defect','found','feature','broken','workaround','documented']],
['Root Cause','根因说明','pastp','Mia Chen',['investigated the failure','already identified the cause','had missed a null check','deployed the fix','had run all tests','system recovered']],
['Risk Communication','风险沟通','hedge','Tom Park',['vulnerability','expose user data','configuration error','cause downtime','impact','affect many users']],
['Test Strategy','测试策略','cond1','Sara Li',['automates unit tests','catch regressions early','skips integration tests','miss interface bugs','adds E2E coverage','increase confidence']],
['Review B3U7','复习','advpass','Alex Wang',['bug','triaged','patch','released','regression','prevented']],
// Unit 8: code collaboration (Lessons 276-280)
['Code Review','代码审查','link','Lin Wei',['left a comment','naming','unclear','important','suggested a rename','readability improved']],
['Technical Suggestions','技术建议','cond2','Mia Chen',['time','extract a shared component','team','larger','refactor more','constraints','fewer']],
['Disagreement','不同意见','link','Tom Park',['disagreed with the approach','complexity','high','understandable','proposed a simpler alternative','compromise was found']],
['Change Descriptions','变更说明','pass','Sara Li',['interface','updated','method','deprecated','migration guide','published']],
['Review B3U8','复习','relcl','Alex Wang',['simplified the logic','clean','improved error handling','reduced boilerplate','enhanced documentation']],
// Unit 9: documentation (Lessons 281-285)
['Technical Docs','技术文档','disc','Lin Wei',['API documentation','endpoint descriptions','authentication flow','error codes','rate limits','versioning strategy']],
['Chart Interpretation','图表解读','hedge','Mia Chen',['trend','indicate improvement','spike','suggest an anomaly','correlation','imply causation']],
['Data Limitations','数据限制','hedge','Tom Park',['sample size','affect reliability','time period','limit generalization','methodology','introduce bias']],
['Summary Writing','结论摘要','disc','Sara Li',['investigation results','recommended actions','risk assessment','mitigation plan','timeline estimate','resource requirements']],
['Review B3U9','复习','disc','Alex Wang',['quarterly review','performance analysis','team growth','budget usage','strategic alignment','next quarter goals']],
// Unit 10: presentations (Lessons 286-290)
['Presentation Opening','演示开场','disc','Lin Wei',['project overview','problem statement','proposed solution','expected impact','implementation plan','timeline']],
['Process Explanation','讲解流程','timecl','Mia Chen',['clicks the button','system validates','validation passes','redirects to dashboard','error occurs','displays message']],
['Answering Questions','回答问题','cond2','Tom Park',['more budget','hire specialists','unlimited time','refactor everything','perfect conditions','deliver faster']],
['Persuasive Suggestions','说服建议','arg','Sara Li',['adopt microservices','scalability','evidence shows 40% improvement','migration cost','long-term savings justify it','recommend a pilot']],
['Review B3U10','复习','arg','Alex Wang',['increase automation','efficiency','data supports the claim','initial investment','ROI within six months','propose a phased approach']],
// Unit 11: complex collaboration (Lessons 291-295)
['Negotiating Scope','协商范围','cond2','Lin Wei',['resources','deliver all features','team','double the size','cut scope','capacity','higher']],
['Managing Expectations','管理预期','hedge','Mia Chen',['delivery date','slip by a week','complexity','increase','estimate','optimistic']],
['Difficult Feedback','困难反馈','link','Tom Park',['gave direct feedback','code quality','declining','concerning','offered concrete suggestions','improvement followed']],
['Cross-team Work','跨团队合作','timecl','Sara Li',['finalizes the API contract','begin integration','dependency resolves','unblock development','timeline was uncertain','coordinated effectively']],
['Review B3U11','复习','link','Alex Wang',['addressed the conflict','collaboration','strained','recoverable','established shared norms','trust rebuilt']],
// Unit 12: Book 3 project (Lessons 296-300)
['Technical Note','技术说明','disc','Lin Wei',['system architecture','performance constraints','scaling strategy','monitoring approach','failure modes','recovery plan']],
['Risk Email','风险邮件','hedge','Mia Chen',['timeline','at risk','resource gap','affect delivery','mitigation','reduce impact']],
['Design Review','设计评审','arg','Tom Park',['adopt event sourcing','auditability','industry best practice','complexity increase','team training cost','recommend gradual adoption']],
['Data Report','数据汇报','disc','Sara Li',['monthly metrics','trend analysis','anomaly investigation','hypothesis','recommendation','action items']],
['Book 3 Graduation','毕业复习','arg','Alex Wang',['invest in observability','reliability','three incidents could have been prevented','tooling cost','operational savings exceed cost','recommend immediate investment']],
// ─── Book 4: Lessons 301–348 ────────────────────────────────────────────────
// Unit 1: conditionals 2 & 3 (Lessons 301-304)
['Second Conditional','第二条件句','cond2','Lin Wei',['time','rewrite the entire codebase','larger','handle more traffic','failed','build a better fallback']],
['Third Conditional','第三条件句','cond3','Mia Chen',['tested the edge case','caught the bug earlier','outage','been avoided','reviewed the config','noticed the typo']],
['Mixed Conditionals','混合条件句','cond3','Tom Park',['started earlier','be finished now','invested in testing','have fewer incidents','prioritized security','be in a stronger position']],
['Review B4U1','复习','cond3','Sara Li',['planned capacity','handled the spike','communicated earlier','avoided the confusion','set up monitoring','detected the issue sooner']],
// Unit 2: inversion + emphasis (Lessons 305-308)
['Inversion','倒装','inv','Lin Wei',['complex architecture','thorough testing','realize the full scope','latency issue','caused the timeout','find and fix the root cause']],
['Cleft Sentences','强调句','inv','Mia Chen',['design flaw','user impact','lack of testing','quality issue','communication gap','delayed the release']],
['Ellipsis and Substitution','省略与替代','inv','Tom Park',['automation gap','code review','performance bottleneck','team velocity','monitoring blind spot','reduced the risk']],
['Review B4U2','复习','inv','Sara Li',['systematic approach','early detection','prevent most issues','configuration error','triggered the incident','identify the pattern']],
// Unit 3: formal argumentation (Lessons 309-312)
['Claims and Evidence','主张与证据','arg','Lin Wei',['migrate to Kubernetes','container orchestration','deployment frequency increased 3x','learning curve','operational benefits outweigh costs','start with non-critical services']],
['Hedging','缓和语气','hedge','Mia Chen',['new approach','improve developer experience','adoption rate','increase gradually','initial resistance','decrease over time']],
['Counterarguments','反方观点','arg','Tom Park',['invest in AI testing','coverage gaps','reduces manual effort by 60%','false positives','net time savings','recommend a trial period']],
['Review B4U3','复习','arg','Sara Li',['adopt trunk-based development','merge conflicts','faster integration','cultural shift','demonstrated benefits','pilot with one team']],
// Unit 4: negotiation (Lessons 313-316)
['Making Proposals','提出提案','arg','Lin Wei',['implement feature flags','deployment risk','industry standard practice','complexity','enables safer releases','allocate two sprints']],
['Negotiating Terms','协商条件','cond2','Mia Chen',['bandwidth','deliver both features','team','prioritize one','delay the other','timeline','tighter']],
['Handling Objections','处理异议','link','Tom Park',['acknowledged the concern','cost','high','justified','provided data','stakeholder agreed']],
['Review B4U4','复习','arg','Sara Li',['propose a compromise','requirements','conflicting','challenging','balance both needs','satisfy key stakeholders']],
// Unit 5: executive communication (Lessons 317-320)
['Executive Summary','执行摘要','disc','Lin Wei',['platform stability','incident trends','resource allocation','risk posture','strategic recommendation','investment needed']],
['Stakeholder Updates','利益相关者更新','disc','Mia Chen',['design system progress','adoption metrics','team feedback','roadmap alignment','budget status','next milestone']],
['Priority Explanation','优先级说明','arg','Tom Park',['prioritize reliability over features','user trust','three outages last quarter','feature delay','retention data supports this','defer feature work one sprint']],
['Review B4U5','复习','disc','Sara Li',['quarterly business review','revenue impact','operational efficiency','customer satisfaction','strategic initiatives','resource request']],
// Unit 6: formal reports (Lessons 321-324)
['Incident Report','事件报告','pastp','Lin Wei',['detected the anomaly','already escalated','had failed silently','deployed the patch','had restored service','documented the timeline']],
['Decision Record','技术决策记录','arg','Mia Chen',['choose PostgreSQL over MongoDB','relational integrity','benchmarks show 2x throughput','migration effort','long-term maintainability','review in 12 months']],
['Risk Assessment','风险评估','hedge','Tom Park',['vulnerability','expose sensitive data','exploit likelihood','remain low','attack surface','expand significantly']],
['Review B4U6','复习','pastp','Sara Li',['completed the investigation','already prepared the report','had identified three contributing factors','implemented controls','had verified effectiveness','closed the action items']],
// Unit 7: technical communication (Lessons 325-328)
['Architecture Trade-offs','架构权衡','arg','Lin Wei',['adopt event-driven architecture','decoupling','reduces deployment risk','operational complexity','team expertise grows','start with order service']],
['Security Communication','安全沟通','hedge','Tom Park',['dependency','contain a vulnerability','patch','resolve the exposure','risk','remain elevated until applied']],
['Performance Analysis','性能分析','disc','Mia Chen',['latency profile','bottleneck identification','optimization opportunities','trade-off analysis','recommendation','expected improvement']],
['Review B4U7','复习','arg','Alex Wang',['adopt zero-trust networking','security posture','NIST framework alignment','implementation cost','breach prevention value','phase over three quarters']],
// Unit 8: data-driven writing (Lessons 329-332)
['Explaining Metrics','指标解释','hedge','Lin Wei',['error rate','indicate degradation','response time','suggest capacity limits','user satisfaction','correlate with reliability']],
['Experiment Conclusions','实验结论','hedge','Mia Chen',['A/B test results','suggest improvement','sample size','limit confidence','effect size','appear meaningful']],
['Recommendation Writing','建议方案','arg','Tom Park',['increase cache TTL','reduce database load','monitoring shows 70% cache hits','stale data risk','invalidation strategy mitigates this','implement next sprint']],
['Review B4U8','复习','disc','Sara Li',['data summary','methodology','findings','limitations','recommendations','next steps']],
// Unit 9: professional relationships (Lessons 333-336)
['Performance Feedback','绩效反馈','link','Lin Wei',['gave specific feedback','code quality','declining','important','offered pair programming','improvement was visible']],
['Difficult Conversations','困难对话','timecl','Mia Chen',['addresses the issue','tension decreases','delay is acknowledged','trust recovers','feedback was honest','relationship strengthened']],
['Cross-cultural Communication','跨文化沟通','indq','Tom Park',['deadline means','communication style differs','feedback is given','decisions are made','hierarchy affects','consensus is reached']],
['Review B4U9','复习','link','Sara Li',['handled the situation','relationship','strained','repairable','took responsibility','trust was restored']],
// Unit 10: career (Lessons 337-340)
['STAR Interview Stories','STAR 面试故事','pastp','Lin Wei',['faced a production outage','already coordinated the response','had identified the root cause','implemented the fix','had restored service in 30 minutes','prevented recurrence']],
['Professional Profile','职业简介','pp','Mia Chen',['led design systems','delivered enterprise products','mentored five designers','improved accessibility scores','built component libraries','since 2019']],
['Salary Discussion','薪资沟通','cond2','Tom Park',['compensation','accept the offer','package','include equity','benefits','match market rate']],
['Review B4U10','复习','pp','Sara Li',['built distributed systems','managed cross-functional teams','driven technical strategy','reduced operational costs','improved developer experience','seven years']],
// Unit 11: public expression (Lessons 341-344)
['Speech Structure','演讲结构','disc','Lin Wei',['opening hook','problem statement','solution overview','evidence','call to action','closing']],
['Handling Questions','提问应对','cond2','Mia Chen',['more data','provide a more detailed answer','additional time','run a deeper analysis','unlimited resources','solve it differently']],
['Long-form Writing','长文写作','disc','Tom Park',['introduction','background','analysis','discussion','conclusion','references']],
['Review B4U11','复习','disc','Sara Li',['thesis statement','supporting arguments','counterargument','rebuttal','synthesis','final recommendation']],
// Unit 12: capstone (Lessons 345-348)
['Project Proposal','项目提案','arg','Lin Wei',['build an internal developer portal','developer productivity','survey shows 3 hours wasted weekly','development cost','annual savings exceed investment','begin with discovery phase']],
['Incident Retrospective','事件复盘','cond3','Mia Chen',['implemented circuit breakers','contained the blast radius','cascade','been prevented','added health checks','detected the issue earlier']],
['Leadership Report','领导汇报','disc','Tom Park',['engineering health','delivery velocity','quality metrics','team engagement','technical debt','strategic investment areas']],
['Book 4 Graduation','毕业复习','arg','Sara Li',['continue professional development','career growth','evidence of consistent improvement','time investment','compounding returns','commit to weekly practice']],
];

// ═══════════════════════════════════════════════════════════════════════════════
// BOOK STRUCTURE — maps lesson ranges to books, units, grammar assignments
// ═══════════════════════════════════════════════════════════════════════════════

const BOOKS = [
  { num: 1, folder: 'book-1-foundations', title: '第一册：生活与工作起步', range: [1,144], perUnit: 12, level: '★☆☆☆☆', minutes: 45 },
  { num: 2, folder: 'book-2-stories-and-work', title: '第二册：清楚讲故事与工作说明', range: [145,240], perUnit: 8, level: '★★☆☆☆', minutes: 50 },
  { num: 3, folder: 'book-3-connected-communication', title: '第三册：连贯沟通与技术表达', range: [241,300], perUnit: 5, level: '★★★☆☆', minutes: 55 },
  { num: 4, folder: 'book-4-precise-expression', title: '第四册：精准表达与专业影响力', range: [301,348], perUnit: 4, level: '★★★★☆', minutes: 60 },
];

const UNIT_NAMES = {
  1: ['建立第一句话','认识身边的人','日常生活','地点与出行','正在发生的事','购买与服务','过去的生活','计划与邀请','健康与情绪','电话与消息','软件工作入门','综合复习'],
  2: ['经历与变化','原因与比较','生活问题解决','邮件与消息','项目进展','支持与排错','会议参与','产品与用户','数据与结果','协作方式','职业成长','综合实践'],
  3: ['从句建立逻辑','修饰与信息密度','准确描述事件','段落与衔接','会议与决策','需求与设计','质量与问题','代码协作','文档与数据','展示与影响','复杂工作关系','综合实践'],
  4: ['假设与反思','强调与压缩','正式论证','决策与协商','管理层沟通','正式报告','架构与安全','数据驱动建议','职业影响力','求职与发展','公开表达','综合实践'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLY — builds markdown lesson from data
// ═══════════════════════════════════════════════════════════════════════════════

function getBook(n) { return BOOKS.find(b => n >= b.range[0] && n <= b.range[1]); }
function getUnit(n, book) { return Math.floor((n - book.range[0]) / book.perUnit); }
function pad3(n) { return String(n).padStart(3, '0'); }

function buildPassage(gKey, char, words, lessonNum) {
  const patterns = PB[gKey];
  if (!patterns) return `${char} is working on a task related to today's topic. The team communicates clearly using short, complete English sentences.`;
  const idx = lessonNum % patterns.length;
  return patterns[idx](char, words);
}

function buildExercises(gKey, words, topicEN) {
  const g = G[gKey];
  if (!g) return '';
  const ex = g.ex;
  const err = g.err;
  let out = '';
  out += `### A. 根据语法规则，用正确形式填空\n\n`;
  out += `1. ___ (根据本课语法完成句子，参考课文)\n`;
  out += `2. ___ \n`;
  out += `3. ___ \n\n`;
  out += `### B. 改错\n\n`;
  for (let i = 0; i < Math.min(err.length, 3); i++) {
    out += `${i+1}. ❌ ${err[i][0]} → ✅ ___\n`;
  }
  out += `\n### C. 翻译成英语\n\n`;
  for (let i = 0; i < Math.min(ex.length, 3); i++) {
    out += `${i+1}. ${ex[i][1]}\n`;
  }
  return out;
}

function buildAnswers(gKey) {
  const g = G[gKey];
  if (!g) return '';
  const err = g.err;
  const ex = g.ex;
  let out = '**B. 改错答案：**\n\n';
  for (let i = 0; i < Math.min(err.length, 3); i++) {
    out += `${i+1}. ${err[i][1]}\n`;
  }
  out += '\n**C. 翻译答案：**\n\n';
  for (let i = 0; i < Math.min(ex.length, 3); i++) {
    out += `${i+1}. ${ex[i][0]}\n`;
  }
  return out;
}

function buildComprehension(bookNum, lessonNum, char, topicCN) {
  if (bookNum === 1 && lessonNum <= 72) {
    // Book 1 前半：中文提问，简单判断/选择
    return `**理解检查（用中文回答即可）：**

1. 课文里 ${char} 的身份是什么？（用课文中的英语词回答）
2. 课文中出现了哪个 be 动词（am / is / are）？写出包含它的一句话。
3. 读一遍课文，圈出你认识的所有英语单词。`;
  }
  if (bookNum === 1) {
    // Book 1 后半：中英混合，简单 WH 问题
    return `**理解检查：**

1. Who is ${char}?（${char} 是谁？用英语短句回答）
2. 从课文中找出一句你能完整读出来的句子，抄写下来。
3. 课文和"${topicCN}"有什么关系？用中文简单说明。`;
  }
  if (bookNum === 2) {
    // Book 2：英文问题 + 中文提示
    return `**Comprehension / 理解检查：**

1. What is ${char} doing or talking about?（${char} 在做什么/说什么？）
2. Find one sentence that uses this lesson's grammar. Write it below.
3. How would you describe a similar situation in your own work?（用 1-2 句英语尝试）`;
  }
  if (bookNum === 3) {
    // Book 3：全英文，中等难度
    return `**Comprehension:**

1. What is the main point of this passage?
2. Which sentence best demonstrates this lesson's grammar focus? Copy it.
3. Summarize the passage in one or two sentences of your own.`;
  }
  // Book 4：全英文，高级分析
  return `**Comprehension:**

1. What argument or situation does the passage present?
2. Identify the grammar structure highlighted in this lesson and explain how it is used here.
3. Do you agree with the approach described? Write 2-3 sentences explaining why or why not.`;
}

function assembleLesson(lessonNum) {
  const ld = LD[lessonNum - 1];
  if (!ld) return '';
  const [topicEN, topicCN, _origGKey, char, words] = ld;

  // Use spiral grammar schedule instead of per-unit grammar
  const spiral = SPIRAL[lessonNum - 1];
  const gKey = spiral ? spiral[0] : _origGKey;
  const subFocus = spiral ? spiral[1] : '';
  const g = G[gKey];
  const book = getBook(lessonNum);
  const unitIdx = getUnit(lessonNum, book);
  const unitName = UNIT_NAMES[book.num][unitIdx] || '综合';
  const isSpiral = subFocus.includes('⟲');

  const passage = buildPassage(gKey, char, words, lessonNum);

  // Pick ONE example sentence relevant to this lesson (rotate through examples)
  const exIdx = (lessonNum - 1) % (g ? g.ex.length : 1);
  const keyExample = g ? g.ex[exIdx] : ['Example sentence.', '例句。'];
  const keyError = g ? g.err[(lessonNum - 1) % g.err.length] : ['Wrong.','Right.','Reason'];

  return `# Lesson ${pad3(lessonNum)}: ${topicEN} / ${topicCN}

> **Book ${book.num}** · Unit ${unitIdx + 1}: ${unitName} · 难度：${book.level}

## 🎯 语法焦点

**${g ? g.t : gKey}** — ${subFocus}${isSpiral ? ' 🔄' : ''}

## 📖 课文

${passage}

## 📐 本课核心

**规则：** ${g ? g.r.split('\n')[0] : ''}

**示范：** \`${keyExample[0]}\` — ${keyExample[1]}

**避免：** ❌ \`${keyError[0]}\` → ✅ \`${keyError[1]}\`（${keyError[2]}）

## ✏️ 练习

1. 仿照示范句，用"${topicCN}"的真实场景写一句英语。
2. 把 \`${keyError[0]}\` 改正，并说明原因。
3. 用本课语法焦点说 ${book.num <= 2 ? '3' : '5'} 句关于你工作或生活的话，录音 ${book.num <= 2 ? '30' : '60'} 秒。

## 📚 深入学习

完整语法讲解、更多例句和系统练习 → 请学习 [100 课精讲版](../../new-concept-adult-english/README.zh.md) 中对应的课程。
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE I/O — generates all markdown files
// ═══════════════════════════════════════════════════════════════════════════════

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '') || 'lesson';
}

async function main() {
  // Clean old books
  for (const b of BOOKS) {
    await rm(join(ROOT, b.folder), { recursive: true, force: true });
  }

  // Generate lessons and indexes
  for (const book of BOOKS) {
    const bookPath = join(ROOT, book.folder);
    const indexLines = [`# ${book.title}\n\n本册共 **${book.range[1] - book.range[0] + 1} 课**。难度：${book.level} | 建议每课 ${book.minutes} 分钟。\n`];
    let currentUnit = -1;

    for (let n = book.range[0]; n <= book.range[1]; n++) {
      const unitIdx = getUnit(n, book);
      if (unitIdx !== currentUnit) {
        currentUnit = unitIdx;
        const unitName = UNIT_NAMES[book.num][unitIdx] || '综合';
        indexLines.push(`\n## 单元 ${unitIdx + 1}：${unitName}\n`);
      }

      const ld = LD[n - 1];
      const [topicEN, topicCN] = ld;
      const fileName = `${pad3(n)}-${slug(topicEN)}.md`;
      const md = assembleLesson(n);

      await mkdir(bookPath, { recursive: true });
      await writeFile(join(bookPath, fileName), md, 'utf8');
      indexLines.push(`- [Lesson ${pad3(n)}: ${topicEN} / ${topicCN}](${fileName})`);
    }

    await writeFile(join(bookPath, 'README.md'), indexLines.join('\n') + '\n', 'utf8');
  }

  // Root README
  const rootMd = `# 348 课学习路线索引

> **本目录是学习路线图，不是完整课程。** 每课只包含语法焦点、一段短课文和核心练习指引。
> 完整的语法精讲、丰富练习和系统复习请学习 → [100 课精讲版](../new-concept-adult-english/README.zh.md)

面向中国大陆 30+ 岁零基础成人，覆盖生活英语与软件开发工作沟通。
四册课时对齐经典四册结构：144 + 96 + 60 + 48 = 348 课。
采用螺旋式语法编排——同一语法点在不同课程中反复出现，每次深化一步。

## 如何使用

1. **按顺序浏览路线图**，了解每课的语法焦点和主题
2. **学习对应的 100 课精讲版**，获得完整讲解和练习
3. **回到路线图**，用每课的短课文和练习指引做快速复习

## 四册目录

1. [${BOOKS[0].title}（001–144）](${BOOKS[0].folder}/README.md) ${BOOKS[0].level}
2. [${BOOKS[1].title}（145–240）](${BOOKS[1].folder}/README.md) ${BOOKS[1].level}
3. [${BOOKS[2].title}（241–300）](${BOOKS[2].folder}/README.md) ${BOOKS[2].level}
4. [${BOOKS[3].title}（301–348）](${BOOKS[3].folder}/README.md) ${BOOKS[3].level}

## 难度对标

| 册 | 语法重点 | 对标水平 |
|---|---|---|
| 第一册 | be动词、现在时、过去时、将来时、情态动词 | 零基础→A1 |
| 第二册 | 完成时、被动语态、条件句、连接词、从句 | A1→A2 |
| 第三册 | 复杂从句、分词、高级被动、论证、衔接 | A2→B1 |
| 第四册 | 虚拟语气、倒装、正式论证、缓和语气 | B1→B2 |
`;
  await writeFile(join(ROOT, 'README.md'), rootMd, 'utf8');

  console.log('Generated 348 lessons successfully.');
}

await main();
