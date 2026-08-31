# Software Demo and Discussion Playbook

> A progressive speaking system for frontend demos, technical discussions, Q&A, and everyday software-team communication.

## 1. The One Routine to Remember

Use the same six steps for almost every feature:

```text
Context -> Goal -> Action -> Result -> Value -> Transition
```

| Step | Question to answer | Reusable sentence |
|---|---|---|
| Context | Where are we? | This is the user management page. |
| Goal | What can the user do? | It allows users to manage team members. |
| Action | What do I do? | First, I click Add user. |
| Result | What changes? | A dialog opens. |
| Value | Why is it useful? | This helps users complete the task without leaving the page. |
| Transition | What comes next? | Next, let's look at filtering. |

The minimum useful demo is even shorter:

```text
I [action].
The [UI element] [result].
```

Examples:

```text
I click this button. The dialog opens.
I select Active. The table updates.
I enter a keyword. The matching results appear.
```

Short sentences are a strength in a live demo. They are clear, easy to remember, and easy for the audience to follow.

## 2. Your Safe Grammar System

Use the present simple for the whole demo:

```text
I click ...
The page shows ...
The dialog opens ...
The user can ...
This helps ...
```

Use only five connectors at first:

| Connector | Use |
|---|---|
| First | Start a workflow |
| Next | Move to another step or feature |
| Then | Continue the current workflow |
| Now | Draw attention to the current state |
| Finally | Finish the workflow |

When a long sentence feels risky, split it:

```text
Risky: When I click this button, a dialog opens and allows the user to configure the settings.

Safer: I click this button. A dialog opens. Here, the user can configure the settings.
```

Use these verb patterns as complete building blocks:

```text
click + the button
select + an option
open + the menu
close + the dialog
enter + a keyword
show + the results
update + the table
switch to + the tab
choose + an item + from the list
enter + text + in the field
appear + on the right / below / at the top
```

## 3. A Progressive Learning Path

### Level 1: Action and Result

Learn to describe one visible action at a time.

```text
I click the button.
The menu opens.

I select an option.
The content updates.

I click Close.
The dialog closes.
```

Target: describe ten common UI actions without notes.

### Level 2: Feature and Purpose

Add one sentence before the action:

```text
This is the search feature.
It helps users find components quickly.
I enter "Table."
The matching results appear below.
```

Target: explain what a feature does before using it.

### Level 3: Complete Workflow

Connect multiple steps:

```text
First, I open the filter menu.
Next, I select Active.
Then, I apply the filter.
Now, the table shows only active users.
Finally, I clear the filter.
```

Target: present a workflow from beginning to end.

### Level 4: State, Value, and Limitations

Explain why the behavior matters:

```text
The selected filters remain visible here.
This helps users understand the current table state.
At the moment, the page supports one filter at a time.
Multiple filters are planned for a future release.
```

Target: explain design decisions and product limits honestly.

### Level 5: Discussion and Q&A

Move from a scripted demo to interaction:

```text
The main reason for this approach is reliability.
One trade-off is the larger initial bundle size.
My recommendation is to keep the current approach for this release.
Does that answer your question?
```

Target: explain reasons, trade-offs, and recommendations.

## 4. Starting a Presentation

### Welcome and introduction

```text
Hello everyone. I'm [name], a frontend developer on the [team] team.
Today, I'll introduce [product] and show you how it works.
The presentation will take about [number] minutes.
We'll leave some time for questions at the end.
```

### Agenda

```text
First, I'll give a quick overview.
Then, I'll walk through the main workflow.
Next, I'll show a few key features.
Finally, I'll summarize the main points and take questions.
```

### Moving between slides

```text
Let's start with a quick overview.
Now, let's move on to the next topic.
This brings us to the main workflow.
Before the demo, I'd like to explain one key idea.
That's the background. Now, let's see the product in action.
```

### Explaining a product

Use three short parts: what it is, who it is for, and why it matters.

```text
[Product] is a tool for [users].
It allows users to [main task].
The main benefit is [value].
```

Example:

```text
Vega Sandbox is an online development environment for Vega demos.
It allows developers to edit and run examples in the browser.
The main benefit is better reliability and control.
```

## 5. Starting and Controlling a Live Demo

### Entering the demo

```text
Now, let me show you how it works.
I'll use a simple example.
For this demo, I'll create a user and update the user's role.
This is the starting state.
```

### Directing attention

```text
Please look at the panel on the right.
At the top, we have the main navigation.
In the center, we can see the preview.
At the bottom, we have the action buttons.
Notice that the Save button is currently disabled.
```

### Keeping the audience oriented

```text
We are now on the settings page.
The filter is active, as shown here.
Nothing has been saved yet.
This is the result we expected.
```

## 6. Frontend Action Library

### Buttons, links, and icons

```text
I click the Add button.
I select this link.
I use this icon to refresh the page.
The button is disabled until the form is valid.
```

### Menus and navigation

```text
I open the main menu.
I select Settings.
The application takes us to the settings page.
I use the breadcrumb to go back.
```

### Tabs

```text
I switch to the API tab.
This tab shows the available properties.
The current selection remains active.
```

### Selects and dropdowns

```text
I open the dropdown.
I select React from the list.
The selected value appears in the field.
I clear the selection with this icon.
```

### Text fields and search

```text
I enter a keyword in the search box.
The results update as I type.
I clear the search.
The full list appears again.
```

### Checkboxes, radio buttons, and switches

```text
I select this checkbox.
I choose the second option.
I turn on dark mode.
The setting takes effect immediately.
I turn it off again.
```

### Dialogs and drawers

```text
I click Edit.
A dialog opens in the center of the page.
I make a change and click Save.
The dialog closes, and the page shows the updated value.

I open the details panel.
The panel appears on the right.
I press Escape to close it.
```

### Tooltips and popovers

```text
I move the pointer over this icon.
A tooltip appears with more information.
I click the icon to open the popover.
I click outside it to close it.
```

### Forms and validation

```text
I enter the required information.
Then, I click Submit.
The form is submitted successfully.
A confirmation message appears.

Now, I'll leave this field empty.
When I click Submit, an error message appears.
It tells the user that this field is required.
```

### Tables

```text
I click the column header.
The table is now sorted by name.
I apply a status filter.
The table shows only active items.
I select this row.
The row actions become available.
I move to the next page with this button.
```

### Create, edit, and delete

```text
I click Create.
I complete the form and save the item.
The new item appears at the top of the list.

Next, I edit the item.
The updated value appears immediately.

Finally, I click Delete.
A confirmation dialog opens.
I confirm the action, and the item is removed.
```

### Upload and download

```text
I click Upload and choose a file.
The progress indicator shows the upload status.
When the upload is complete, the file appears in the list.
I can download it with this button.
```

### Drag and drop

```text
I drag this item to a new position.
Then, I drop it here.
The order updates automatically.
```

### Pagination and infinite scrolling

```text
I click Next to view more results.
The current page number is shown here.

As I scroll down, the application loads more items.
The existing items remain on the page.
```

### Loading, empty, success, and error states

```text
The data is loading, so we show a loading indicator.
There are no results, so we show an empty state.
The update is complete, so we show a success message.
The request has failed, so we show an error message.
The user can click Retry to load the data again.
```

### Responsive behavior

```text
Now, I'll resize the window.
On a smaller screen, the layout changes.
The navigation moves into this menu.
The main actions remain easy to reach.
```

### Accessibility

```text
Now, I'll use the keyboard.
I press Tab to move through the controls.
The focus indicator shows the current control.
I press Enter to activate the button.
The dialog keeps the keyboard focus inside it.
I press Escape to close the dialog.
```

## 7. Reusable Component Demo Template

Prepare every component with the same worksheet:

```text
Feature: [name]
User goal: [what the user wants to do]
Starting state: [what is visible before the action]
Action 1: [first action]
Result 1: [visible result]
Action 2: [second action]
Result 2: [visible result]
Edge state: [loading / empty / error / disabled]
Value: [why this helps the user]
Limitation: [what it does not support yet]
Transition: [next feature]
```

Spoken version:

```text
This is the [feature].
It allows users to [goal].
At the moment, [starting state].
First, I [action 1].
As you can see, [result 1].
Next, I [action 2].
Now, [result 2].
If [condition], the application shows [edge state].
This helps users [value].
At the moment, it does not support [limitation].
That's how the [feature] works. Next, let's look at [next feature].
```

## 8. Complete Frontend Demo Example

### User management workflow

```text
Now, I'll show you the user management page.

This page allows administrators to view and manage team members.
At the moment, the table shows all users.

First, I enter "Carter" in the search box.
As you can see, the table shows the matching user.

Next, I open the status dropdown.
I select Active.
Now, the table shows only active users.

Then, I click Add user.
A dialog opens.
I enter the user's name and email address.
I select Developer from the role list.

Now, I click Save.
The dialog closes, and the new user appears in the table.
A success message confirms that the user was created.

To show validation, I'll open the dialog again.
This time, I leave the email field empty.
I click Save.
An error message appears below the field.
It tells the user what information is required.

Finally, I select the new user and click Delete.
A confirmation dialog opens.
I confirm the action, and the user is removed from the table.

This workflow helps administrators manage users without leaving the page.
That's the user management workflow. Next, let's look at permissions.
```

## 9. Explaining Technical Decisions

Use this four-part routine:

```text
Decision -> Reason -> Trade-off -> Recommendation
```

### Giving a reason

```text
We chose this approach because it is easier to maintain.
The main reason is reliability.
This keeps the component behavior consistent.
This avoids an extra network request.
```

### Comparing options

```text
Option A is simpler, but Option B is more flexible.
The main difference is where the data is stored.
Both options work, but they solve different problems.
Compared with the old version, this version loads faster.
```

### Describing a trade-off

```text
The advantage is better performance.
The trade-off is a larger initial bundle.
This is easier to implement, but it gives us less control.
This works well for small data sets. It may not scale well for larger ones.
```

### Making a recommendation

```text
I recommend Option A for this release.
My suggestion is to keep the current behavior.
I think we should validate the requirement first.
We can start with the simpler solution and improve it later.
```

## 10. Discussing Requirements

### Clarifying the goal

```text
What problem are we trying to solve?
Who is the main user of this feature?
What should happen when the user clicks this button?
Is this required for the first release?
What is the expected behavior on mobile?
```

### Checking scope

```text
Is this change limited to the frontend?
Does this require an API change?
Do we need to update the database schema?
Should we support both desktop and mobile?
Are loading and error states included in the scope?
```

### Confirming understanding

```text
Let me make sure I understand the requirement.
You want the dialog to close after a successful save, right?
So the user can select multiple items, but can edit only one item at a time. Is that correct?
Just to confirm, this is for administrators only.
```

### Identifying edge cases

```text
What should happen if the request fails?
What should we show when there is no data?
What happens if the user closes the page without saving?
Do we need to handle duplicate names?
Is there a maximum file size?
```

## 11. Discussing Bugs and Problems

Use this routine:

```text
Problem -> Steps -> Actual result -> Expected result -> Impact -> Next step
```

### Reporting a bug

```text
I found an issue in the user settings page.
First, open the page and select Dark mode.
Then, refresh the browser.
The setting returns to Light mode.
The expected behavior is to keep the user's selection.
This affects all signed-in users.
I'm checking where the setting is stored.
```

### Asking diagnostic questions

```text
Can you reproduce the issue consistently?
Which browser and version are you using?
Does this happen in production or only locally?
Do you see any errors in the console?
When did the issue start?
Was it working before the latest release?
```

### Giving an investigation update

```text
I can reproduce the issue locally.
The frontend sends the correct request.
The failure happens in the API response.
I haven't found the root cause yet.
My next step is to check the server logs.
I'll share another update by the end of the day.
```

### Explaining a fix

```text
The issue was caused by an incorrect cache key.
I updated the key and added a regression test.
The fix is now in the test environment.
I've verified the main workflow and the error state.
```

## 12. Participating in Technical Discussions

### Entering the conversation

```text
I can share some context on this.
I can walk through the frontend behavior.
Can I add one point?
I'd like to clarify one thing.
```

### Giving an opinion

```text
I think the first option is easier to maintain.
From the frontend side, this approach is simpler.
In my view, performance is the main concern.
My preference is to keep the API contract unchanged.
```

### Agreeing

```text
I agree with that approach.
That makes sense to me.
I had the same thought.
Yes, that matches my understanding.
```

### Partly agreeing

```text
I agree with the general direction, but I have one concern.
That makes sense for desktop. We should also check mobile behavior.
I agree with the goal, but we may need a different implementation.
```

### Disagreeing professionally

```text
I see it differently.
I'm not sure that approach covers the error case.
My concern is that this could break existing users.
Could we consider a smaller change first?
```

### Asking for evidence

```text
Do we have any data to support that?
Can we measure the performance difference?
Do we know how many users need this behavior?
Could we test both options with a small prototype?
```

### Reaching a decision

```text
It sounds like we prefer Option A.
Are we comfortable moving forward with this approach?
Let's document the decision and the main trade-off.
So the decision is to keep the current API and update the frontend.
```

## 13. Q&A Survival System

Use this decision tree:

```text
Did I hear it?
  No  -> Ask the person to repeat or slow down.
  Yes -> Did I understand it?
           No  -> Paraphrase and confirm.
           Yes -> Do I know the answer?
                    Yes -> Answer briefly, give a reason, check understanding.
                    No  -> Say what you know, assign a follow-up, or ask a colleague.
```

### You did not hear the question

```text
Sorry, I didn't quite catch that. Could you repeat the question?
Could you say that again a little more slowly?
Sorry, I missed the last part. Could you repeat it?
```

### You heard the words but did not understand

```text
Just to confirm, are you asking about the frontend implementation?
Do you mean the current behavior or the planned behavior?
Could you give me an example?
Are you asking why we chose this approach?
```

### You need time to think

```text
That's a good question. Let me think for a moment.
There are two parts to that question.
The short answer is yes. Let me explain why.
```

### You know the answer

Use this routine:

```text
Short answer -> Reason -> Example -> Check
```

```text
Yes, it supports keyboard navigation.
We use the standard focus behavior provided by the component.
For example, users can press Tab to move between controls.
Does that answer your question?
```

### You do not know the answer

```text
I don't have the exact answer right now.
I don't want to give you incorrect information.
Let me check with the team and follow up after the meeting.
```

### Another person should answer

```text
This part is outside my area. Can someone from the API team help answer it?
I can explain the frontend behavior, but Alex may have more context on the backend.
```

### The topic is too detailed

```text
That's a detailed topic. Could we discuss it after the presentation?
The short answer is yes, but the implementation has several parts.
Let's take this offline and go through the details.
```

## 14. Handling Demo Problems

### Slow loading

```text
This may take a few seconds.
The application is loading the data now.
While we wait, let me explain the expected result.
```

### A click does not work

```text
It looks like the page is still loading.
Let me try that again.
```

### The demo fails

```text
It looks like we have a small issue with the demo environment.
Let me explain the expected behavior.
Normally, when I click this button, the dialog opens.
I also have a screenshot of the expected result.
I'll investigate the demo issue after the session.
```

### You lose your place

```text
Let me return to the main workflow.
We have completed the first step.
Next, I'll show the save behavior.
```

### You forget a word

Point to the interface and use a safe noun:

```text
this button
this option
this field
this section
this panel
this page
this message
```

## 15. Everyday Software-Team English

### Starting a conversation

```text
Do you have a minute to discuss this issue?
Can we quickly check the expected behavior?
I'd like to get your input on this change.
```

### Daily stand-up

Use `Completed -> Plan -> Blocker`:

```text
Yesterday, I finished the table filtering feature.
Today, I'll add tests and update the documentation.
I'm currently blocked by an API issue.
I need help confirming the response format.
```

### Asking for help

```text
Could you help me understand this requirement?
Can you take a look at this error?
Do you know who owns this service?
Could we pair on this issue for fifteen minutes?
```

### Giving a status update

Use `Status -> Evidence -> Risk -> Next step`:

```text
The feature is almost complete.
The main workflow and tests are working.
The only remaining risk is mobile browser support.
My next step is to test it on Safari.
```

### Requesting a review

```text
I've opened a pull request for this change.
Could you review the API handling and the tests?
There is one open question in the description.
No database change is required.
```

### Following up

```text
I'm following up on the question from yesterday.
Have you had a chance to review the proposal?
Do we have a decision on the API format?
```

### Ending a discussion

```text
I think we have a clear next step.
I'll update the ticket with the decision.
I'll make the frontend change, and Sam will check the API.
Let's review the result tomorrow.
```

## 16. A Complete Presentation Structure

Use this structure for a 5-15 minute software presentation:

1. Opening: name, role, topic.
2. Agenda: overview, workflow, key features, summary.
3. Problem: what users need or what was difficult before.
4. Solution: what the product or feature does.
5. Demo setup: scenario and starting state.
6. Happy path: the main successful workflow.
7. Important states: loading, validation, empty, and error behavior.
8. Value: time saved, reliability, consistency, or control.
9. Limitations: what is not included yet.
10. Summary: three main points.
11. Q&A: invite and manage questions.

### Full outline

```text
Hello everyone. I'm [name] from [team].
Today, I'll show you [product or feature].

First, I'll explain the problem.
Then, I'll introduce our solution.
After that, I'll show the main workflow.
Finally, I'll summarize the key points and take questions.

The problem is [problem].
Users need a way to [user need].

Our solution is [solution].
It allows users to [main task].
The main benefit is [value].

Now, let me show you how it works.
For this demo, I will [scenario].
This is the starting state.

First, I [action].
As you can see, [result].
Next, I [action].
Now, [result].
Finally, I [action].
The workflow is complete.

We also support [important state].
If [condition], the application shows [behavior].

At the moment, [limitation].
We plan to [future improvement].

To summarize, there are three main points.
First, [point one].
Second, [point two].
Third, [point three].

That's all for the demo. Thank you for listening.
I'm happy to take questions.
```

## 17. Preparation Checklist

### Content

- Write one goal for the presentation.
- Choose one realistic user scenario.
- Show the happy path before edge cases.
- Prepare one sentence for the value of each feature.
- Prepare one honest sentence about limitations.
- Anticipate five likely questions.

### Demo environment

- Open all required pages before the meeting.
- Use stable sample data.
- Sign in before the presentation.
- Turn off notifications.
- Increase the browser zoom if needed.
- Keep screenshots or a short recording as backup.
- Test the workflow once immediately before the meeting.

### Language

- Write keywords, not full paragraphs, in speaker notes.
- Mark every transition: First, Next, Then, Finally.
- Keep one action and one result in each sentence pair.
- Practice product names and technical terms separately.
- Prepare your three Q&A safety sentences.

## 18. Practice Method

### Round 1: Read

Read the script slowly and make sure every sentence is easy to say.

### Round 2: Keywords only

Replace paragraphs with cue cards:

```text
User page -> search Carter -> filter Active -> add user -> validation -> delete -> value
```

### Round 3: Screen recording

Record the demo. Check:

- Did each action have a spoken result?
- Did you explain why the feature matters?
- Were there long silent periods?
- Did you use clear transitions?
- Did you finish within the planned time?

### Round 4: Unexpected event

Practice one failure on purpose:

```text
It looks like the demo environment has a small issue.
Let me explain the expected behavior.
```

### Round 5: Q&A

Ask a colleague or an AI assistant to ask five unexpected questions. For each question:

1. Repeat or confirm the question.
2. Give a short answer.
3. Give one reason or example.
4. Check whether the question was answered.

## 19. The 30 Sentences to Memorize First

```text
1. Today, I'll show you how this feature works.
2. First, I'll give you a quick overview.
3. Now, let me show you the main workflow.
4. This page allows users to manage their settings.
5. This is the starting state.
6. First, I click this button.
7. A dialog opens.
8. Next, I select an option.
9. The content updates automatically.
10. Then, I enter the required information.
11. Now, I click Save.
12. A confirmation message appears.
13. As you can see, the new item appears in the list.
14. I can clear the selection with this icon.
15. If the request fails, we show an error message.
16. The user can click Retry.
17. This helps users complete the task more quickly.
18. That's how this feature works.
19. Next, let's look at the API.
20. The main reason is reliability.
21. The advantage is better performance.
22. The trade-off is a larger initial bundle.
23. I recommend keeping the current approach.
24. Let me make sure I understand the question.
25. Are you asking about the frontend implementation?
26. Sorry, I didn't quite catch that. Could you repeat it?
27. That's a good question. Let me think for a moment.
28. I don't have the exact answer right now.
29. Let me check with the team and follow up.
30. Does that answer your question?
```

## 20. Final Rule Card

Before speaking, think:

```text
Where are we?
What can the user do?
What do I do now?
What changed on the screen?
Why does it matter?
Where are we going next?
```

Then speak:

```text
This is ...
It allows users to ...
First, I ...
As you can see, ...
This helps users ...
Next, let's look at ...
```

For discussions, think:

```text
What is my answer?
What is the main reason?
What is the trade-off?
What do I recommend?
```

For questions, think:

```text
Did I hear it?
Did I understand it?
Do I know the answer?
What is the next step?
```

You do not need complex grammar to lead a clear software demo. You need a predictable structure, short sentences, visible actions, and honest transitions.