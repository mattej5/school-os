---
name: class-slack
description: Use the per-class Slack MCP servers (slack-mgmt201, slack-cs101, slack-cs301) for course Slack workspaces instead of the generic Slack connector. Trigger on course names/codes (MGMT 201, CS 101, CS 301), "class Slack", "course Slack", "TA channel", "check the class channel", or any Slack request scoped to one of these courses.
---

# Class Slack routing

Each course has its own dedicated Slack MCP server (separate workspace, separate tokens). Use these instead of any generic/default Slack connector when the request is about a course workspace.

## Course → server map

| Course | MCP server prefix |
|---|---|
| MGMT 201 | `slack-mgmt201` |
| CS 101 | `slack-cs101` |
| CS 301 | `slack-cs301` |

Tools under each: `channels_list`, `channels_me`, `conversations_history`, `conversations_replies`, `conversations_search_messages`, `conversations_unreads`, `conversations_join`, `conversations_leave`, `conversations_mark`, `saved_list`, `saved_update`, `saved_clear_completed`, `usergroups_*`, `users_search`.

## Rules

- If a request names one of these courses (or its folder under `courses/`), use that course's server. Don't fall back to a generic Slack tool.
- If the course isn't named but context makes it obvious (open file in `courses/fall-2026/mgmt-201/...`, prior message in this session), infer it — otherwise ask which class.
- General/personal Slack requests (not tied to a course) still use whatever the user's normal Slack connector is — this skill only overrides routing for the three class workspaces above.
- These servers are read-heavy tools (list/search/read). Sending messages, joining/leaving channels, or usergroup writes still need the same confirm-before-acting judgment as any other messaging tool.
