# 软件演示与技术讨论英语手册

> 面向前端 Demo、技术讨论、问答和软件团队日常沟通的渐进式口语系统。

## 1. 只记住一个固定套路

几乎所有功能都使用同样的六步：

```text
场景 Context → 目标 Goal → 操作 Action → 结果 Result → 价值 Value → 过渡 Transition
```

| 步骤 | 要回答的问题 | 固定表达 |
|---|---|---|
| 场景 | 我们现在在哪里？ | This is the user management page. |
| 目标 | 用户可以做什么？ | It allows users to manage team members. |
| 操作 | 我现在做什么？ | First, I click Add user. |
| 结果 | 屏幕发生了什么变化？ | A dialog opens. |
| 价值 | 为什么有用？ | This helps users complete the task without leaving the page. |
| 过渡 | 接下来讲什么？ | Next, let's look at filtering. |

最小可用的演示只有两句：

```text
I [操作].
The [界面元素] [结果].
```

例如：

```text
I click this button. The dialog opens.
我点击这个按钮。弹框打开。

I select Active. The table updates.
我选择 Active。表格更新。

I enter a keyword. The matching results appear.
我输入关键词。匹配结果出现。
```

现场演示中，短句不是水平低，而是表达清楚、容易记忆，也方便观众跟上操作。

## 2. 安全语法系统

整个演示统一使用一般现在时：

```text
I click ...            我点击……
The page shows ...     页面显示……
The dialog opens ...   弹框打开……
The user can ...       用户可以……
This helps ...         这可以帮助……
```

初期只使用五个连接词：

| 连接词 | 用途 |
|---|---|
| First | 开始一个流程 |
| Next | 进入下一步或下一个功能 |
| Then | 继续当前流程 |
| Now | 提醒观众关注当前状态 |
| Finally | 完成流程 |

长句没有把握时，直接拆开：

```text
较难：When I click this button, a dialog opens and allows the user to configure the settings.

更稳：I click this button. A dialog opens. Here, the user can configure the settings.
```

把下面的动词搭配当作不可拆分的整体记忆：

```text
click + the button                 点击按钮
select + an option                 选择选项
open + the menu                    打开菜单
close + the dialog                 关闭弹框
enter + a keyword                  输入关键词
show + the results                 显示结果
update + the table                 更新表格
switch to + the tab                切换到标签页
choose + an item + from the list   从列表中选择一项
enter + text + in the field        在输入框中输入文本
appear + on the right              出现在右侧
appear + below                     出现在下方
appear + at the top                出现在顶部
```

## 3. 循序渐进的学习路线

### 第一级：操作与结果

每次只描述一个可见操作：

```text
I click the button.
The menu opens.

I select an option.
The content updates.

I click Close.
The dialog closes.
```

目标：不看稿描述十个常见界面操作。

### 第二级：功能与目的

在操作前增加一句功能目的：

```text
This is the search feature.
这是搜索功能。

It helps users find components quickly.
它帮助用户快速找到组件。

I enter "Table."
我输入 Table。

The matching results appear below.
匹配结果显示在下方。
```

目标：操作一个功能前，先说明它能做什么。

### 第三级：完整工作流

把多个步骤连起来：

```text
First, I open the filter menu.
首先，我打开筛选菜单。

Next, I select Active.
接下来，我选择 Active。

Then, I apply the filter.
然后，我应用筛选条件。

Now, the table shows only active users.
现在，表格只显示活跃用户。

Finally, I clear the filter.
最后，我清除筛选条件。
```

目标：从头到尾演示一个闭环流程。

### 第四级：状态、价值与限制

开始解释为什么这样设计：

```text
The selected filters remain visible here.
已选择的筛选条件会继续显示在这里。

This helps users understand the current table state.
这能帮助用户理解表格当前的状态。

At the moment, the page supports one filter at a time.
目前，这个页面一次只支持一个筛选条件。

Multiple filters are planned for a future release.
多条件筛选计划在后续版本中支持。
```

目标：诚实说明设计价值与当前限制。

### 第五级：讨论与问答

从背稿进入互动：

```text
The main reason for this approach is reliability.
采用这个方案的主要原因是可靠性。

One trade-off is the larger initial bundle size.
一个取舍是首包体积更大。

My recommendation is to keep the current approach for this release.
我的建议是这个版本继续使用当前方案。

Does that answer your question?
这样回答了你的问题吗？
```

目标：能够说明原因、取舍和建议。

## 4. 开始一场演讲

### 欢迎与自我介绍

```text
Hello everyone. I'm [name], a frontend developer on the [team] team.
大家好，我是 [名字]，[团队] 的前端开发工程师。

Today, I'll introduce [product] and show you how it works.
今天我会介绍 [产品]，并演示它如何工作。

The presentation will take about [number] minutes.
本次演讲大约需要 [数字] 分钟。

We'll leave some time for questions at the end.
最后我们会留出一些问答时间。
```

### 介绍议程

```text
First, I'll give a quick overview.
首先，我会做一个简要介绍。

Then, I'll walk through the main workflow.
然后，我会演示主要流程。

Next, I'll show a few key features.
接下来，我会展示几个关键功能。

Finally, I'll summarize the main points and take questions.
最后，我会总结重点并回答问题。
```

### PPT 页面之间过渡

```text
Let's start with a quick overview.
我们先从简要介绍开始。

Now, let's move on to the next topic.
现在，我们进入下一个主题。

This brings us to the main workflow.
接下来就是主要流程。

Before the demo, I'd like to explain one key idea.
开始演示之前，我想先解释一个关键概念。

That's the background. Now, let's see the product in action.
以上是背景信息。现在来看实际产品演示。
```

### 介绍产品的三句话

固定说清楚：它是什么、给谁使用、为什么重要。

```text
[Product] is a tool for [users].
[产品] 是面向 [用户] 的工具。

It allows users to [main task].
它允许用户 [主要任务]。

The main benefit is [value].
它的主要价值是 [价值]。
```

例如：

```text
Vega Sandbox is an online development environment for Vega demos.
Vega Sandbox 是用于 Vega 演示的在线开发环境。

It allows developers to edit and run examples in the browser.
它允许开发者在浏览器中编辑和运行示例。

The main benefit is better reliability and control.
它的主要价值是更高的可靠性和控制力。
```

## 5. 开始并控制现场 Demo

### 进入演示

```text
Now, let me show you how it works.
现在，我来演示它如何工作。

I'll use a simple example.
我会使用一个简单的例子。

For this demo, I'll create a user and update the user's role.
在这次演示中，我会创建一个用户并更新用户角色。

This is the starting state.
这是初始状态。
```

### 引导观众视线

```text
Please look at the panel on the right.
请看右侧的面板。

At the top, we have the main navigation.
顶部是主导航。

In the center, we can see the preview.
中间是预览区域。

At the bottom, we have the action buttons.
底部是操作按钮。

Notice that the Save button is currently disabled.
请注意，Save 按钮目前处于禁用状态。
```

### 让观众知道当前状态

```text
We are now on the settings page.
我们现在位于设置页面。

The filter is active, as shown here.
如这里所示，筛选条件已经生效。

Nothing has been saved yet.
目前还没有保存任何内容。

This is the result we expected.
这就是我们预期的结果。
```

## 6. 前端操作固定句库

### 按钮、链接和图标

```text
I click the Add button.                     我点击 Add 按钮。
I select this link.                         我选择这个链接。
I use this icon to refresh the page.        我使用这个图标刷新页面。
The button is disabled until the form is valid.
在表单有效之前，这个按钮处于禁用状态。
```

### 菜单和导航

```text
I open the main menu.                       我打开主菜单。
I select Settings.                          我选择 Settings。
The application takes us to the settings page.
应用进入设置页面。
I use the breadcrumb to go back.            我使用面包屑返回。
```

### 标签页

```text
I switch to the API tab.                    我切换到 API 标签页。
This tab shows the available properties.    这个标签页显示可用属性。
The current selection remains active.       当前选择保持不变。
```

### Select 和下拉菜单

```text
I open the dropdown.                        我打开下拉菜单。
I select React from the list.               我从列表中选择 React。
The selected value appears in the field.    选中的值显示在字段中。
I clear the selection with this icon.       我使用这个图标清除选择。
```

### 输入框和搜索

```text
I enter a keyword in the search box.        我在搜索框中输入关键词。
The results update as I type.               结果会随着输入实时更新。
I clear the search.                         我清除搜索内容。
The full list appears again.                完整列表再次出现。
```

### 复选框、单选按钮和开关

```text
I select this checkbox.                     我勾选这个复选框。
I choose the second option.                 我选择第二个选项。
I turn on dark mode.                        我打开深色模式。
The setting takes effect immediately.       设置立即生效。
I turn it off again.                        我再次关闭它。
```

### 弹框和抽屉

```text
I click Edit.                               我点击 Edit。
A dialog opens in the center of the page.   页面中央打开一个弹框。
I make a change and click Save.             我修改内容并点击 Save。
The dialog closes, and the page shows the updated value.
弹框关闭，页面显示更新后的值。

I open the details panel.                   我打开详情面板。
The panel appears on the right.             面板显示在右侧。
I press Escape to close it.                 我按 Escape 关闭它。
```

### Tooltip 和 Popover

```text
I move the pointer over this icon.          我把鼠标移到这个图标上。
A tooltip appears with more information.    Tooltip 显示更多信息。
I click the icon to open the popover.       我点击图标打开 Popover。
I click outside it to close it.             我点击外部区域关闭它。
```

### 表单与校验

```text
I enter the required information.           我输入必填信息。
Then, I click Submit.                       然后，我点击 Submit。
The form is submitted successfully.         表单提交成功。
A confirmation message appears.             确认消息出现。

Now, I'll leave this field empty.           现在，我把这个字段留空。
When I click Submit, an error message appears.
点击 Submit 后，错误消息出现。
It tells the user that this field is required.
它告诉用户这个字段为必填项。
```

### 表格

```text
I click the column header.                  我点击列标题。
The table is now sorted by name.            表格现在按名称排序。
I apply a status filter.                    我应用状态筛选条件。
The table shows only active items.          表格只显示活跃项目。
I select this row.                          我选中这一行。
The row actions become available.           行操作变为可用。
I move to the next page with this button.   我使用这个按钮进入下一页。
```

### 创建、编辑和删除

```text
I click Create.                             我点击 Create。
I complete the form and save the item.      我填写表单并保存项目。
The new item appears at the top of the list.
新项目显示在列表顶部。

Next, I edit the item.                      接下来，我编辑这个项目。
The updated value appears immediately.      更新后的值立即显示。

Finally, I click Delete.                    最后，我点击 Delete。
A confirmation dialog opens.               确认弹框打开。
I confirm the action, and the item is removed.
我确认操作，项目被删除。
```

### 上传与下载

```text
I click Upload and choose a file.           我点击 Upload 并选择文件。
The progress indicator shows the upload status.
进度指示器显示上传状态。
When the upload is complete, the file appears in the list.
上传完成后，文件显示在列表中。
I can download it with this button.         我可以使用这个按钮下载它。
```

### 拖放

```text
I drag this item to a new position.         我把这个项目拖到新位置。
Then, I drop it here.                       然后，我把它放在这里。
The order updates automatically.            顺序自动更新。
```

### 分页和无限滚动

```text
I click Next to view more results.          我点击 Next 查看更多结果。
The current page number is shown here.      当前页码显示在这里。

As I scroll down, the application loads more items.
向下滚动时，应用会加载更多项目。
The existing items remain on the page.      已有项目继续保留在页面中。
```

### 加载、空、成功和错误状态

```text
The data is loading, so we show a loading indicator.
数据正在加载，因此我们显示加载指示器。

There are no results, so we show an empty state.
没有结果，因此我们显示空状态。

The update is complete, so we show a success message.
更新完成，因此我们显示成功消息。

The request has failed, so we show an error message.
请求失败，因此我们显示错误消息。

The user can click Retry to load the data again.
用户可以点击 Retry 重新加载数据。
```

### 响应式行为

```text
Now, I'll resize the window.                现在，我会调整窗口大小。
On a smaller screen, the layout changes.    在较小屏幕上，布局发生变化。
The navigation moves into this menu.        导航移动到这个菜单中。
The main actions remain easy to reach.      主要操作仍然容易找到。
```

### 无障碍操作

```text
Now, I'll use the keyboard.                 现在，我会使用键盘操作。
I press Tab to move through the controls.   我按 Tab 在控件之间移动。
The focus indicator shows the current control.
焦点指示器显示当前控件。
I press Enter to activate the button.       我按 Enter 激活按钮。
The dialog keeps the keyboard focus inside it.
弹框会把键盘焦点保持在内部。
I press Escape to close the dialog.         我按 Escape 关闭弹框。
```

## 7. 可复用的组件演示模板

每次准备组件 Demo 时，都填写同一张表：

```text
功能：          [名称]
用户目标：      [用户想完成什么]
初始状态：      [操作前可以看到什么]
操作 1：        [第一个操作]
结果 1：        [可见结果]
操作 2：        [第二个操作]
结果 2：        [可见结果]
边界状态：      [加载 / 空 / 错误 / 禁用]
价值：          [为什么能帮助用户]
限制：          [目前还不支持什么]
过渡：          [下一个功能]
```

口头表达版本：

```text
This is the [feature].
这是 [功能]。

It allows users to [goal].
它允许用户 [目标]。

At the moment, [starting state].
目前，[初始状态]。

First, I [action 1].
首先，我 [操作 1]。

As you can see, [result 1].
如你所见，[结果 1]。

Next, I [action 2].
接下来，我 [操作 2]。

Now, [result 2].
现在，[结果 2]。

If [condition], the application shows [edge state].
如果 [条件]，应用会显示 [边界状态]。

This helps users [value].
这帮助用户 [价值]。

At the moment, it does not support [limitation].
目前，它还不支持 [限制]。

That's how the [feature] works. Next, let's look at [next feature].
这就是 [功能] 的工作方式。接下来，我们看 [下一个功能]。
```

## 8. 完整前端 Demo 示例

### 用户管理流程

```text
Now, I'll show you the user management page.
现在，我来演示用户管理页面。

This page allows administrators to view and manage team members.
这个页面允许管理员查看和管理团队成员。

At the moment, the table shows all users.
目前，表格显示所有用户。

First, I enter "Carter" in the search box.
首先，我在搜索框中输入 Carter。

As you can see, the table shows the matching user.
如你所见，表格显示匹配的用户。

Next, I open the status dropdown.
接下来，我打开状态下拉菜单。

I select Active.
我选择 Active。

Now, the table shows only active users.
现在，表格只显示活跃用户。

Then, I click Add user.
然后，我点击 Add user。

A dialog opens.
一个弹框打开。

I enter the user's name and email address.
我输入用户的姓名和电子邮件地址。

I select Developer from the role list.
我从角色列表中选择 Developer。

Now, I click Save.
现在，我点击 Save。

The dialog closes, and the new user appears in the table.
弹框关闭，新用户显示在表格中。

A success message confirms that the user was created.
成功消息确认用户已经创建。

To show validation, I'll open the dialog again.
为了演示校验，我会再次打开弹框。

This time, I leave the email field empty.
这一次，我把电子邮件字段留空。

I click Save.
我点击 Save。

An error message appears below the field.
错误消息显示在字段下方。

It tells the user what information is required.
它告诉用户需要填写哪些信息。

Finally, I select the new user and click Delete.
最后，我选择新用户并点击 Delete。

A confirmation dialog opens.
确认弹框打开。

I confirm the action, and the user is removed from the table.
我确认操作，用户从表格中被删除。

This workflow helps administrators manage users without leaving the page.
这个流程帮助管理员不离开页面就能管理用户。

That's the user management workflow. Next, let's look at permissions.
这就是用户管理流程。接下来，我们看权限功能。
```

## 9. 解释技术决策

使用四步套路：

```text
决策 Decision → 原因 Reason → 取舍 Trade-off → 建议 Recommendation
```

### 说明原因

```text
We chose this approach because it is easier to maintain.
我们选择这个方案，因为它更容易维护。

The main reason is reliability.
主要原因是可靠性。

This keeps the component behavior consistent.
这能保持组件行为一致。

This avoids an extra network request.
这可以避免额外的网络请求。
```

### 比较方案

```text
Option A is simpler, but Option B is more flexible.
方案 A 更简单，但方案 B 更灵活。

The main difference is where the data is stored.
主要区别是数据存储的位置。

Both options work, but they solve different problems.
两个方案都可行，但它们解决的问题不同。

Compared with the old version, this version loads faster.
与旧版本相比，这个版本加载更快。
```

### 描述取舍

```text
The advantage is better performance.
优点是性能更好。

The trade-off is a larger initial bundle.
代价是首包体积更大。

This is easier to implement, but it gives us less control.
这个方案更容易实现，但我们的控制力会降低。

This works well for small data sets. It may not scale well for larger ones.
它适用于小型数据集，但面对更大数据集时扩展性可能不好。
```

### 给出建议

```text
I recommend Option A for this release.
我建议这个版本使用方案 A。

My suggestion is to keep the current behavior.
我的建议是保留当前行为。

I think we should validate the requirement first.
我认为我们应该先确认需求。

We can start with the simpler solution and improve it later.
我们可以先采用更简单的方案，后续再改进。
```

## 10. 讨论需求

### 澄清目标

```text
What problem are we trying to solve?
我们要解决什么问题？

Who is the main user of this feature?
这个功能的主要用户是谁？

What should happen when the user clicks this button?
用户点击这个按钮后应该发生什么？

Is this required for the first release?
这是首个版本必须支持的吗？

What is the expected behavior on mobile?
移动端的预期行为是什么？
```

### 确认范围

```text
Is this change limited to the frontend?
这个改动只涉及前端吗？

Does this require an API change?
这需要修改 API 吗？

Do we need to update the database schema?
我们需要更新数据库结构吗？

Should we support both desktop and mobile?
我们应该同时支持桌面端和移动端吗？

Are loading and error states included in the scope?
加载和错误状态包含在范围内吗？
```

### 确认自己的理解

```text
Let me make sure I understand the requirement.
让我确认一下我对需求的理解。

You want the dialog to close after a successful save, right?
你的意思是保存成功后关闭弹框，对吗？

So the user can select multiple items, but can edit only one item at a time. Is that correct?
所以用户可以选择多个项目，但一次只能编辑一个，对吗？

Just to confirm, this is for administrators only.
确认一下，这个功能只面向管理员。
```

### 识别边界情况

```text
What should happen if the request fails?    请求失败时应该怎样处理？
What should we show when there is no data?  没有数据时应该显示什么？
What happens if the user closes the page without saving?
用户没有保存就关闭页面时会怎样？
Do we need to handle duplicate names?       我们需要处理重名吗？
Is there a maximum file size?               文件有大小上限吗？
```

## 11. 讨论 Bug 和问题

使用六步套路：

```text
问题 Problem → 步骤 Steps → 实际结果 Actual → 预期结果 Expected → 影响 Impact → 下一步 Next step
```

### 报告 Bug

```text
I found an issue in the user settings page.
我在用户设置页面发现了一个问题。

First, open the page and select Dark mode.
首先，打开页面并选择 Dark mode。

Then, refresh the browser.
然后，刷新浏览器。

The setting returns to Light mode.
设置恢复为 Light mode。

The expected behavior is to keep the user's selection.
预期行为是保留用户的选择。

This affects all signed-in users.
这个问题影响所有已登录用户。

I'm checking where the setting is stored.
我正在检查这个设置的存储位置。
```

### 询问排查信息

```text
Can you reproduce the issue consistently?  你能稳定复现这个问题吗？
Which browser and version are you using?   你使用哪个浏览器和版本？
Does this happen in production or only locally?
这个问题发生在线上环境，还是只发生在本地？
Do you see any errors in the console?      控制台中有错误吗？
When did the issue start?                  这个问题从什么时候开始出现？
Was it working before the latest release?  最新版本发布前它能正常工作吗？
```

### 汇报排查进展

```text
I can reproduce the issue locally.
我可以在本地复现这个问题。

The frontend sends the correct request.
前端发送了正确的请求。

The failure happens in the API response.
错误发生在 API 响应中。

I haven't found the root cause yet.
我还没有找到根本原因。

My next step is to check the server logs.
下一步我会检查服务器日志。

I'll share another update by the end of the day.
我会在今天下班前再次同步进展。
```

### 解释修复

```text
The issue was caused by an incorrect cache key.
这个问题是错误的缓存键导致的。

I updated the key and added a regression test.
我更新了缓存键，并添加了回归测试。

The fix is now in the test environment.
修复已经部署到测试环境。

I've verified the main workflow and the error state.
我已经验证了主要流程和错误状态。
```

## 12. 参与技术讨论

### 加入讨论

```text
I can share some context on this.           我可以补充一些背景。
I can walk through the frontend behavior.   我可以介绍一下前端行为。
Can I add one point?                        我可以补充一点吗？
I'd like to clarify one thing.              我想澄清一件事。
```

### 表达观点

```text
I think the first option is easier to maintain.
我认为第一个方案更容易维护。

From the frontend side, this approach is simpler.
从前端角度看，这个方案更简单。

In my view, performance is the main concern.
在我看来，性能是主要问题。

My preference is to keep the API contract unchanged.
我倾向于保持 API 契约不变。
```

### 表示同意

```text
I agree with that approach.                 我同意这个方案。
That makes sense to me.                     我觉得有道理。
I had the same thought.                     我也是这样想的。
Yes, that matches my understanding.         是的，这与我的理解一致。
```

### 部分同意

```text
I agree with the general direction, but I have one concern.
我同意总体方向，但有一个顾虑。

That makes sense for desktop. We should also check mobile behavior.
桌面端这样合理，但我们还应该检查移动端行为。

I agree with the goal, but we may need a different implementation.
我同意这个目标，但可能需要不同的实现方式。
```

### 专业地表达不同意见

```text
I see it differently.                       我的看法不同。
I'm not sure that approach covers the error case.
我不确定那个方案是否覆盖了错误场景。
My concern is that this could break existing users.
我担心这可能会影响现有用户。
Could we consider a smaller change first?   我们能否先考虑一个更小的改动？
```

### 请求依据

```text
Do we have any data to support that?        我们有数据支持这个判断吗？
Can we measure the performance difference?  我们能测量性能差异吗？
Do we know how many users need this behavior?
我们知道有多少用户需要这个行为吗？
Could we test both options with a small prototype?
我们能否用一个小型原型测试两个方案？
```

### 达成决定

```text
It sounds like we prefer Option A.
听起来我们更倾向于方案 A。

Are we comfortable moving forward with this approach?
大家都同意按这个方案继续吗？

Let's document the decision and the main trade-off.
我们记录一下这个决定和主要取舍。

So the decision is to keep the current API and update the frontend.
所以最终决定是保留当前 API，只更新前端。
```

## 13. Q&A 生存系统

使用这个判断流程：

```text
我听清楚了吗？
  没有 → 请对方重复或说慢一点
  听清 → 我理解问题了吗？
           没有 → 用自己的话复述并确认
           理解 → 我知道答案吗？
                    知道 → 简短回答、说明原因、确认是否回答完整
                    不知道 → 说明已知部分、安排跟进或请同事回答
```

### 没有听清

```text
Sorry, I didn't quite catch that. Could you repeat the question?
抱歉，我没有听清。你能重复一下问题吗？

Could you say that again a little more slowly?
你能再说一遍，并稍微慢一点吗？

Sorry, I missed the last part. Could you repeat it?
抱歉，我漏听了最后一部分。你能重复一下吗？
```

### 听到了单词，但没有理解问题

```text
Just to confirm, are you asking about the frontend implementation?
确认一下，你问的是前端实现吗？

Do you mean the current behavior or the planned behavior?
你指的是当前行为，还是计划中的行为？

Could you give me an example?
你能给我一个例子吗？

Are you asking why we chose this approach?
你是在问我们为什么选择这个方案吗？
```

### 需要思考时间

```text
That's a good question. Let me think for a moment.
这是个好问题。让我想一下。

There are two parts to that question.
这个问题包含两个部分。

The short answer is yes. Let me explain why.
简短回答是“是的”。我来解释一下原因。
```

### 知道答案

使用四步套路：

```text
简短答案 → 原因 → 例子 → 确认
```

```text
Yes, it supports keyboard navigation.
是的，它支持键盘导航。

We use the standard focus behavior provided by the component.
我们使用组件提供的标准焦点行为。

For example, users can press Tab to move between controls.
例如，用户可以按 Tab 在控件之间移动。

Does that answer your question?
这样回答了你的问题吗？
```

### 不知道答案

```text
I don't have the exact answer right now.
我现在没有确切答案。

I don't want to give you incorrect information.
我不想给你错误的信息。

Let me check with the team and follow up after the meeting.
我会和团队确认，并在会议后回复你。
```

### 应该由其他同事回答

```text
This part is outside my area. Can someone from the API team help answer it?
这部分不属于我的专业范围。API 团队的同事能帮忙回答吗？

I can explain the frontend behavior, but Alex may have more context on the backend.
我可以解释前端行为，但 Alex 可能更了解后端背景。
```

### 问题太复杂，不适合现场展开

```text
That's a detailed topic. Could we discuss it after the presentation?
这是一个比较复杂的话题。我们可以在演讲后讨论吗？

The short answer is yes, but the implementation has several parts.
简短回答是“是的”，但实现包含多个部分。

Let's take this offline and go through the details.
我们会后再详细讨论。
```

## 14. 处理 Demo 意外

### 加载缓慢

```text
This may take a few seconds.                这可能需要几秒钟。
The application is loading the data now.    应用正在加载数据。
While we wait, let me explain the expected result.
等待时，我先解释一下预期结果。
```

### 点击没有反应

```text
It looks like the page is still loading.    看起来页面仍在加载。
Let me try that again.                      我再试一次。
```

### 演示失败

```text
It looks like we have a small issue with the demo environment.
看起来演示环境出现了一个小问题。

Let me explain the expected behavior.
我来解释一下预期行为。

Normally, when I click this button, the dialog opens.
正常情况下，我点击这个按钮后，弹框会打开。

I also have a screenshot of the expected result.
我也准备了预期结果的截图。

I'll investigate the demo issue after the session.
我会在本次会议结束后排查这个问题。
```

### 忘记讲到哪里

```text
Let me return to the main workflow.         我们回到主要流程。
We have completed the first step.           我们已经完成了第一步。
Next, I'll show the save behavior.          接下来，我会演示保存行为。
```

### 忘记某个单词

指向界面，使用安全名词：

```text
this button      这个按钮
this option      这个选项
this field       这个字段
this section     这个区域
this panel       这个面板
this page        这个页面
this message     这条消息
```

## 15. 软件团队日常口语

### 发起对话

```text
Do you have a minute to discuss this issue?
你有时间讨论一下这个问题吗？

Can we quickly check the expected behavior?
我们能快速确认一下预期行为吗？

I'd like to get your input on this change.
我想听听你对这个改动的看法。
```

### 每日站会

使用 `已完成 → 计划 → 阻塞`：

```text
Yesterday, I finished the table filtering feature.
昨天，我完成了表格筛选功能。

Today, I'll add tests and update the documentation.
今天，我会添加测试并更新文档。

I'm currently blocked by an API issue.
我目前被一个 API 问题阻塞。

I need help confirming the response format.
我需要帮助确认响应格式。
```

### 请求帮助

```text
Could you help me understand this requirement?
你能帮我理解这个需求吗？

Can you take a look at this error?
你能看一下这个错误吗？

Do you know who owns this service?
你知道谁负责这个服务吗？

Could we pair on this issue for fifteen minutes?
我们能一起排查这个问题十五分钟吗？
```

### 汇报状态

使用 `状态 → 证据 → 风险 → 下一步`：

```text
The feature is almost complete.
这个功能基本完成。

The main workflow and tests are working.
主要流程和测试都能正常工作。

The only remaining risk is mobile browser support.
唯一剩余的风险是移动浏览器支持。

My next step is to test it on Safari.
下一步我会在 Safari 上进行测试。
```

### 请求代码评审

```text
I've opened a pull request for this change.
我已经为这个改动创建了 Pull Request。

Could you review the API handling and the tests?
你能评审一下 API 处理和测试吗？

There is one open question in the description.
描述中有一个尚未确定的问题。

No database change is required.
不需要修改数据库。
```

### 跟进

```text
I'm following up on the question from yesterday.
我来跟进一下昨天的问题。

Have you had a chance to review the proposal?
你有时间评审这个方案了吗？

Do we have a decision on the API format?
关于 API 格式，我们有决定了吗？
```

### 结束讨论

```text
I think we have a clear next step.
我认为下一步已经很明确了。

I'll update the ticket with the decision.
我会把决定更新到任务中。

I'll make the frontend change, and Sam will check the API.
我负责前端修改，Sam 负责检查 API。

Let's review the result tomorrow.
我们明天一起检查结果。
```

## 16. 一场完整软件演讲的结构

适用于 5～15 分钟的软件演讲：

1. 开场：姓名、角色、主题。
2. 议程：概览、工作流、关键功能、总结。
3. 问题：用户需要什么，过去有什么困难。
4. 方案：产品或功能如何解决问题。
5. Demo 设置：使用场景和初始状态。
6. 正常流程：最主要的成功路径。
7. 重要状态：加载、校验、空状态和错误行为。
8. 价值：节省时间、可靠性、一致性或控制力。
9. 限制：目前尚未包含的能力。
10. 总结：三个重点。
11. Q&A：邀请并处理问题。

### 完整提纲

```text
Hello everyone. I'm [name] from [team].
大家好，我是来自 [团队] 的 [名字]。

Today, I'll show you [product or feature].
今天，我会向大家演示 [产品或功能]。

First, I'll explain the problem.
首先，我会解释问题。

Then, I'll introduce our solution.
然后，我会介绍我们的解决方案。

After that, I'll show the main workflow.
之后，我会演示主要流程。

Finally, I'll summarize the key points and take questions.
最后，我会总结重点并回答问题。

The problem is [problem].
问题是 [问题]。

Users need a way to [user need].
用户需要一种方法来 [用户需求]。

Our solution is [solution].
我们的解决方案是 [方案]。

It allows users to [main task].
它允许用户 [主要任务]。

The main benefit is [value].
主要价值是 [价值]。

Now, let me show you how it works.
现在，我来演示它如何工作。

For this demo, I will [scenario].
在这次演示中，我会 [场景]。

This is the starting state.
这是初始状态。

First, I [action].
首先，我 [操作]。

As you can see, [result].
如你所见，[结果]。

Next, I [action].
接下来，我 [操作]。

Now, [result].
现在，[结果]。

Finally, I [action].
最后，我 [操作]。

The workflow is complete.
整个流程已经完成。

We also support [important state].
我们还支持 [重要状态]。

If [condition], the application shows [behavior].
如果 [条件]，应用会显示 [行为]。

At the moment, [limitation].
目前，[限制]。

We plan to [future improvement].
我们计划 [未来改进]。

To summarize, there are three main points.
总结一下，主要有三点。

First, [point one].
第一，[重点一]。

Second, [point two].
第二，[重点二]。

Third, [point three].
第三，[重点三]。

That's all for the demo. Thank you for listening.
以上就是本次演示。感谢大家的聆听。

I'm happy to take questions.
欢迎大家提问。
```

## 17. 演示准备清单

### 内容

- 为演讲写下一个明确目标。
- 选择一个真实的用户场景。
- 先演示正常流程，再演示边界情况。
- 为每个功能准备一句价值说明。
- 为当前限制准备一句诚实说明。
- 提前准备五个可能被问到的问题。

### 演示环境

- 会议前打开所有需要的页面。
- 使用稳定的示例数据。
- 演讲前完成登录。
- 关闭系统通知。
- 根据需要调大浏览器缩放比例。
- 准备截图或短视频作为备用方案。
- 会议开始前完整测试一次流程。

### 语言

- 演讲备注只写关键词，不写大段文章。
- 标记所有过渡：First、Next、Then、Finally。
- 每组句子只包含一个操作和一个结果。
- 单独练习产品名称和技术术语的发音。
- 准备三句 Q&A 保底表达。

## 18. 练习方法

### 第一轮：照稿朗读

慢速朗读脚本，确保每一句都容易说出口。

### 第二轮：只看关键词

把大段文字替换成提示卡：

```text
User page → search Carter → filter Active → add user → validation → delete → value
```

### 第三轮：录屏

录制一次完整 Demo，然后检查：

- 每个操作后是否说明了结果？
- 是否解释了功能的价值？
- 是否出现长时间沉默？
- 是否使用了清楚的过渡句？
- 是否在计划时间内完成？

### 第四轮：故意制造意外

主动练习一次失败：

```text
It looks like the demo environment has a small issue.
Let me explain the expected behavior.
```

### 第五轮：模拟问答

请同事或 AI 随机提出五个问题。每个问题都完成四步：

1. 重复问题或确认理解。
2. 给出简短答案。
3. 给出一个原因或例子。
4. 确认是否回答了问题。

## 19. 最先背熟的 30 句

```text
1. Today, I'll show you how this feature works.
   今天，我会演示这个功能如何工作。

2. First, I'll give you a quick overview.
   首先，我会做一个简要介绍。

3. Now, let me show you the main workflow.
   现在，我来演示主要流程。

4. This page allows users to manage their settings.
   这个页面允许用户管理自己的设置。

5. This is the starting state.
   这是初始状态。

6. First, I click this button.
   首先，我点击这个按钮。

7. A dialog opens.
   一个弹框打开。

8. Next, I select an option.
   接下来，我选择一个选项。

9. The content updates automatically.
   内容自动更新。

10. Then, I enter the required information.
    然后，我输入必填信息。

11. Now, I click Save.
    现在，我点击 Save。

12. A confirmation message appears.
    确认消息出现。

13. As you can see, the new item appears in the list.
    如你所见，新项目显示在列表中。

14. I can clear the selection with this icon.
    我可以使用这个图标清除选择。

15. If the request fails, we show an error message.
    如果请求失败，我们会显示错误消息。

16. The user can click Retry.
    用户可以点击 Retry。

17. This helps users complete the task more quickly.
    这能帮助用户更快地完成任务。

18. That's how this feature works.
    这就是这个功能的工作方式。

19. Next, let's look at the API.
    接下来，我们看一下 API。

20. The main reason is reliability.
    主要原因是可靠性。

21. The advantage is better performance.
    优点是性能更好。

22. The trade-off is a larger initial bundle.
    代价是首包体积更大。

23. I recommend keeping the current approach.
    我建议保留当前方案。

24. Let me make sure I understand the question.
    让我确认一下我对问题的理解。

25. Are you asking about the frontend implementation?
    你是在问前端实现吗？

26. Sorry, I didn't quite catch that. Could you repeat it?
    抱歉，我没有听清。你能重复一下吗？

27. That's a good question. Let me think for a moment.
    这是个好问题。让我想一下。

28. I don't have the exact answer right now.
    我现在没有确切答案。

29. Let me check with the team and follow up.
    我会和团队确认并跟进。

30. Does that answer your question?
    这样回答了你的问题吗？
```

## 20. 最终规则卡

开口前，在心里问：

```text
我们在哪里？
用户可以做什么？
我现在做什么？
屏幕发生了什么变化？
为什么有用？
接下来去哪里？
```

然后按固定句型说：

```text
This is ...
It allows users to ...
First, I ...
As you can see, ...
This helps users ...
Next, let's look at ...
```

参加讨论前，在心里问：

```text
我的答案是什么？
主要原因是什么？
有什么取舍？
我的建议是什么？
```

回答问题前，在心里问：

```text
我听清了吗？
我理解了吗？
我知道答案吗？
下一步是什么？
```

你不需要先学会复杂语法，才能完成清楚的软件演示。你真正需要的是可预测的结构、简短的句子、可见的操作，以及诚实清楚的过渡。