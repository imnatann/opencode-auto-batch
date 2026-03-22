# Agents And Routing

`opencode-auto-batch` is designed around one idea:

you should not have to babysit agent selection.

## Default Entry Point

The default agent is `auto`.

Its job is not to do everything itself.

Its job is to decide the right execution path with the least friction.

Every response starts by telling you what it chose.

Examples:

```text
AUTO -> direct execution
AUTO -> routed to Oracle
AUTO -> routed to Hephaestus
AUTO -> parallel batch execution
```

## Front-Door Agents

These are the agents you can pick directly in OpenCode:

- `auto` - default router and batch coordinator
- `implement` - write-first execution agent
- `research` - read-first investigation agent
- `debug` - root-cause and safe-fix agent
- `review` - verification and risk review agent
- `frontend` - UI and visual work agent
- `planner` - planning-first agent
- `deep` - high-autonomy multi-file execution agent

## Internal Specialists

`auto` can route into specialists when the task deserves it:

- `Explore` - fast repo discovery and code search
- `Librarian` - external docs and references
- `Oracle` - architecture, reasoning, root-cause debugging
- `Plan` / `Prometheus` - planning and decomposition
- `Hephaestus` - deep implementation
- `Momus` - verification and review
- `Multimodal-Looker` - screenshots and visual reasoning

## Default Routing Rules

- simple answer or tiny change -> direct execution
- repo exploration or code mapping -> `Explore`
- external docs lookup -> `Librarian`
- architecture or tricky debugging -> `Oracle`
- large ambiguous task -> `Plan`
- deep multi-file implementation -> `Hephaestus`
- final review or regression thinking -> `Momus`
- visual or screenshot-heavy work -> `Multimodal-Looker`

## Why Visible Routing Matters

Without route notifications, users have to guess whether the system is:

- thinking
- delegating
- waiting
- stuck

This repo avoids that.

The route is visible up front.

That keeps the system explainable without forcing manual orchestration.
