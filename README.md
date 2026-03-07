# The CronBot AI Showdown 🤖⚔️

Welcome to **CronBot**, a unique experiment in autonomous software engineering. 

The premise of this repository is simple: Provide three different foundational documents (`plan.md` architecture and `GEMINI.md`/character files) and see how three top-tier AI models perform when tasked with building the same complex application with minimal human intervention.

## The Application: CronBot

The target application all AIs were tasked to build is a **hybrid AI automation CLI daemon**. 
It is designed to solve the context-limit and cost problems of LLM agents by separating work into two distinct layers:
1. **Deterministic Filters:** Using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) to fetch data quickly and for free (e.g., searching unread Gmails, fetching Slack history).
2. **AI Reasoning:** Passing only optimized, transformed data chunks to an LLM (like Claude) for complex reasoning (summarizing, categorizing).

## The Contenders

This repository contains the results of the showdown. Each folder represents a distinct, autonomous implementation of the exact same prompt and architectural plan by a different AI model.

*   **`/Gemini`**: The implementation built autonomously by Google's **Gemini CLI** agent. 
*   **`/Claude`**: *(Coming Soon)* The implementation built by Anthropic's Claude.
*   **`/Codex`**: The implementation built by OpenAI's Codex.

## The Ground Rules

To ensure a fair evaluation, all AIs were given the exact same starting point:
1.  **`plan.md`**: Outlining the technical stack (Bun, TypeScript, SQLite, MCP, Anthropic SDK) and the architectural call graph.
2.  **`GEMINI.md` / System Prompt**: Outlining strict coding standards, idempotency requirements, and safety guidelines.
3.  **Minimal Assistance**: The AIs were expected to scaffold the project, write the core engine, implement the MCP client manager, build robust data transformers, and write YAML test jobs natively without constant human hand-holding.

## The Judge & The Gauntlet

To impartially test these repositories, a fourth AI persona has been introduced: **The Judge**. (See `judge.md` for full details). 

The Judge spawns isolated sub-agents to enter each branch, configure the specific bot, and run it through a brutal three-part gauntlet to test real-world utility:
1.  **The Local Machine Alarm:** Triggering an OS-level audio/visual alarm via MCP on a strict schedule.
2.  **The Notion Audit:** Using an official Notion MCP server to map data and write a structured "Audit Status" task into a remote database.
3.  **The Executive Summary:** Making the bot read its own logs, sending that data to an LLM for summarization, and using a Gmail MCP server to draft a comprehensive report to the user's inbox.

## Evaluation Criteria

As you explore the different folders, consider how each AI handled:
*   **Architectural Fidelity:** Did they stick to the requested hybrid approach?
*   **Resilience & Idempotency:** How well did they handle database transactions and state rollbacks when the AI API inevitably fails?
*   **Context Window Protection:** Did they implement data chunking/transformers before sending raw API payloads to the LLM?
*   **Code Quality & Modularity:** Is the TypeScript strictly typed? Are there tests?

---

*Explore the folders to see how the AI agents stack up against one another in a real-world coding challenge.*
