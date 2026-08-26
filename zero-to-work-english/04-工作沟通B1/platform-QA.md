1.1 What is the difference between vega-mcp and vega-assistant?
1.2 How are vega-mcp and vega-assistant different?
1.3 How does vega-mcp compare to vega-assistant?
1.4 In what ways do vega-mcp and vega-assistant differ?
1.5 What are the main use cases for vega-mcp and vega-assistant?
1.6 Are vega-mcp and vega-assistant meant for different scenarios?
1.7 Why do we need both vega-mcp and vega-assistant?
vega-mcp and vega-assistant have different roles, but both can help people answer Vega questions and use Vega components more effectively. vega-mcp provides Vega knowledge and MCP tools for AI clients. For example, developers can use MCP in VS Code to get help with Vega components. vega-assistant is the complete AI application, including the Portal, API, and MCP integration. It is also integrated into the official Vega website, so anyone can use it to ask questions. In short, vega-mcp is for AI tools, and vega-assistant is for people using the Vega website.

Key words: roles, AI tools, Vega knowledge, VS Code, official website, users.

2.1 What is the difference between CodeSandbox and Vega Sandbox?
2.2 How are CodeSandbox and Vega Sandbox different?
2.3 Is Vega Sandbox the same as CodeSandbox?
2.4 What makes CodeSandbox different from Vega Sandbox?
CodeSandbox and Vega Sandbox both let you edit and run code in the browser, but Vega Sandbox was built to replace CodeSandbox for our Vega demos. The main reason is reliability and control. CodeSandbox is a third-party, hosted service, so when it has problems, our demos break and we cannot fix it ourselves. We hit real issues in the past: sometimes the page would not open even after several refreshes, and once the Vue demos suddenly stopped working, which forced an urgent fix. These are not just our problems, other users reported the same things in the CodeSandbox GitHub issues. Vega Sandbox is our own, self-hosted tool, focused on Vega demos. It runs fully in the browser using WebContainers, so there is no backend, we control every part, and there is no cost per session. It also provides Vega templates for React, Vue, Angular, and Vanilla. In short, we moved to Vega Sandbox mainly for stability and control, and being free is a nice bonus.

Key words: replaces CodeSandbox, reliability, control, self-hosted, WebContainers, Vega templates, no cost.

3.1 How do you deploy the Vega website?
3.2 What is the deployment process for the Vega website?
3.3 What are the steps to deploy the Vega website?
3.4 Where is the Vega website deployed?
3.5 Is the deployment automated?
3.6 Who handles the deployment?
The Vega website code and deployment pipeline run on Azure. A pipeline is an automatic build-and-release process. So deployment runs automatically. First, Azure DevOps builds the website and content and builds the website files. Then Azure Static Web Apps publishes those files. After that, the production site is online. In short, you push changes, the pipeline builds, and Static Web Apps puts the site online.

Key words: Azure, pipeline, auto deploy, build, Static Web Apps, production site.

4.1 Why do you select the website instead of Storybook?
4.2 Why do we use the website instead of Storybook?
4.3 Why is the website preferred over Storybook?
4.4 What makes the website a better choice than Storybook for documentation?
We now use the website as the single place for Vega documentation. The website brings everything together in one place: docs, live demos, and the vega assistant, so users can read the docs, try the components, and ask questions without leaving the site. Storybook cannot do this, because it is mainly a developer tool for viewing components in isolation, not a complete, public product site. Since our goal is clear, shareable docs for everyone, a website fits better and gives us full control over how things look and read. In short, we moved all documentation to the website and dropped Storybook.

Key words: single place, everything in one place, live demos, vega assistant, shareable docs, full control, dropped Storybook.

5.1 What is the Vega Figma Make Kit?
5.2 What is the purpose of the Vega Figma Make Kit?
The Vega Figma Make Kit is a collection of Vega design rules and components for Figma Make, a design tool with AI. Figma Make uses it to generate product layouts that follow Vega standards. Think of it like giving the AI a guide that says “here are Vega’s design rules and examples”, so it knows how Vega products should look and work. You get good designs right away and save time. But it is still only a starting point, so you need to review and refine the output yourself to make it perfect.

Key words: Figma Make Kit, Vega design rules, AI design tool, saves time, starting point, manual refinement.

Communication Signals for Q&A Sessions
Clarifying & Checking Understanding
“Sorry, I missed that — could you repeat it?”
“Could you say that again?”
“You mean [my understanding], right?”
“Just checking — is your question about [my understanding]?”
Asking for Colleague’s Help
“I’m not too familiar with this — can anyone else jump in?”
“This part isn’t my strong area — can someone else help answer this?”
Deferring Complex Topics
“This is a bit complex. I can share a link to the docs with you — if you follow the steps and try it yourself, things will be clearer.”
“I’m happy to explain this, but it’s pretty complex. How about we sync up offline and go deeper?”
Offering to Answer or Add Input
“I can share some context on this.”
“I can jump in and explain.”
“I can offer some input on this.”
“I can share my understanding.”
Responding Positively
“Happy to help.”
“Alright.”
“Glad it helped.”