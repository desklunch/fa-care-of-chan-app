# Feature Backlog MCP Skill

This skill documents how a Replit agent interacts with the Care of Chan OS feature backlog via MCP tools.

## Available MCP Tools

### Read-only tools (low risk)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `features_list` | `status?: FeatureStatus[]`, `categoryId?: string`, `limit?: number` | List/filter features. Returns id, title, status, priority, category, description snippet, vote count. |
| `features_get` | `id: string` | Get a single feature by ID with full details: comments, category, creator, timestamps. |
| `features_list_categories` | _(none)_ | List available feature categories with their IDs, names, descriptions, and colors. |

### Write tools (medium risk)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `features_update` | `id: string`, `status?`, `priority?`, `title?`, `description?` | Update feature fields. Handles `completedAt` timestamp automatically. |
| `features_add_comment` | `featureId: string`, `body: string` | Post a comment to a feature as the Replit Agent user. |

## Feature Lifecycle Statuses

```
proposed → under_review → planned → in_progress → completed → archived
```

| Status | Meaning |
|--------|---------|
| `proposed` | Newly submitted feature request |
| `under_review` | Being evaluated by the team |
| `planned` | Approved and scheduled for development |
| `in_progress` | Currently being built |
| `completed` | Finished and delivered |
| `archived` | No longer relevant or deferred indefinitely |

## Priority Values

`low` | `medium` | `high` | `critical`

## Workflows

### Planning work from the backlog

1. Call `features_list` with `status: ["proposed", "under_review"]` to see pending features.
2. Call `features_get` with the chosen feature ID to read full details and existing comments.
3. Create a task plan (break the feature into implementation steps).
4. Call `features_add_comment` to post the approved plan as a comment on the feature.
5. Call `features_update` to set `status: "planned"`.

### Starting work

1. Call `features_update` with `status: "in_progress"` on the feature being worked on.

### Completing work

1. Call `features_update` with `status: "completed"` (this automatically sets `completedAt`).
2. Call `features_add_comment` with completion notes summarizing what was done.

## Authentication

The MCP server requires a bearer token when `AGENT_API_KEY` is set:

```
Authorization: Bearer <AGENT_API_KEY>
```

### Registering in Replit Integrations Pane

1. Open the **Integrations** pane in the Replit workspace.
2. Add a new **Custom MCP Server** integration.
3. Set the URL to the deployed app's MCP SSE endpoint: `https://<deployed-app-url>/api/mcp/sse`
4. Add the header: `Authorization: Bearer <your-AGENT_API_KEY-value>`
5. Save. The agent will now have access to all MCP tools including the feature backlog tools.

## System User

All MCP operations are performed as the **Replit Agent** system user (`id: replit-agent`, role: admin). This user is automatically created at app startup.
