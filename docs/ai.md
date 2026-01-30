# AI Agent Chat Capability

**Created:** January 30, 2026  
**Status:** Initial Implementation Complete

---

## Executive Summary

Care of Chan OS now includes an embedded AI assistant that helps users generate professional editorial descriptions for venues. The AI can search the venue database, gather information about venues, create compelling descriptions, and update venue records—all through a natural conversation interface.

---

## For Business & Design Stakeholders

### What It Does

The AI Assistant helps managers and administrators save time by automatically generating high-quality venue descriptions. Instead of manually researching and writing descriptions, users can simply:

1. **Ask the AI** to generate a description for any venue
2. **Review and refine** the suggested text through conversation
3. **Approve and save** directly to the venue record

### User Experience

- A floating chat button appears in the bottom-right corner of the screen (visible only to admin and manager users)
- Clicking opens a full-screen chat modal where users can converse with the AI
- The AI shows its work—displaying when it's searching venues or updating records
- After saving a description, the AI provides a direct link to view the updated venue

### Access Control

- **Available to:** Admin and Manager roles only
- **Not available to:** Employees and Viewers
- The AI operates within the user's permission scope—it cannot perform actions the user isn't authorized to do

### Example Conversation

```
User: Generate a description for The Grand Ballroom

AI: I found The Grand Ballroom in your database. Let me gather information 
    and create a description for you.

    [Searches venue database...]
    [Generating description...]

    Here's a 2-paragraph description for The Grand Ballroom:

    "The Grand Ballroom stands as one of the city's most prestigious event 
    venues, offering an elegant blend of classic architecture and modern 
    amenities. With soaring ceilings, crystal chandeliers, and expansive 
    floor space accommodating up to 500 guests, this historic venue has 
    hosted countless memorable celebrations, corporate galas, and landmark 
    occasions since its opening in 1928.

    Guests are greeted by a dedicated events team committed to bringing 
    every vision to life. The venue's versatile spaces include a stunning 
    main ballroom, intimate private dining rooms, and a charming outdoor 
    terrace with city views. Whether planning a grand wedding reception or 
    an executive retreat, The Grand Ballroom delivers an unforgettable 
    experience marked by impeccable service and timeless sophistication."

    Would you like me to make any changes to this description?

User: Can you mention their award-winning catering?

AI: Here's the updated description:

    [Updated version with catering mention...]

    Does this look good? If you're happy with it, I can save this as the 
    venue's description.

User: Yes, save it

AI: I've updated The Grand Ballroom's description. 
    [View Venue](/venues/abc123)
```

---

## For Developers (Technical Audit)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React)                           │
│  ┌─────────────────┐    ┌──────────────────────────────────┐   │
│  │   AiChatFab     │───▶│      AiChatModal                 │   │
│  │ (Bottom-right)  │    │ - Message history (session)       │   │
│  └─────────────────┘    │ - SSE streaming display           │   │
│                         │ - Tool activity indicators         │   │
│                         │ - Markdown link rendering          │   │
│                         └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ POST /api/ai/chat (SSE)
┌─────────────────────────────────────────────────────────────────┐
│                        Server (Express)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ai-chat.routes.ts                            │   │
│  │  - Permission check (tier >= 2)                           │   │
│  │  - OpenAI streaming with tools                            │   │
│  │  - Tool execution loop                                    │   │
│  │  - SSE event emission                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Tools                                        │   │
│  │  - search_venues: Query venue database                    │   │
│  │  - get_venue_details: Fetch full venue info               │   │
│  │  - update_venue_description: Update longDescription       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           External Services                               │   │
│  │  - OpenAI gpt-5.2 (via Replit AI Integrations)           │   │
│  │  - PostgreSQL (venue storage)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
server/
└── domains/
    └── ai-chat/
        ├── index.ts              # Route exports
        └── ai-chat.routes.ts     # Chat endpoint with tools

client/
└── src/
    └── components/
        └── ai-chat/
            └── ai-chat-modal.tsx  # FAB + Modal UI
```

### API Endpoint

**POST `/api/ai/chat`**

- **Authentication:** Session-based (loadPermissions middleware)
- **Authorization:** Tier 2+ (admin, manager) only
- **Content-Type:** `text/event-stream` (SSE)
- **Request Body:**
  ```typescript
  {
    messages: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
  }
  ```
- **SSE Events:**
  ```typescript
  { type: "content", content: string }      // Streaming text
  { type: "tool_call", name: string, arguments: object }
  { type: "tool_result", name: string, result: object }
  { type: "done" }
  { type: "error", message: string }
  ```

### Available Tools

**Venue Tools**
| Tool | Description | Permission Required |
|------|-------------|---------------------|
| `search_venues` | Search venues by name | `venues.read` |
| `get_venue_details` | Get full venue info including amenities, tags, photo count | `venues.read` |
| `update_venue_description` | Update venue longDescription | `venues.write` |

**Client & Vendor Tools**
| Tool | Description | Permission Required |
|------|-------------|---------------------|
| `search_clients` | Search clients by name | `clients.read` |
| `get_client_details` | Get client info with contacts and industry | `clients.read` |
| `search_vendors` | Search vendors by name | `vendors.read` |
| `get_vendor_details` | Get vendor info with services and contacts | `vendors.read` |

**Deal Tools (Tier 2+ only)**
| Tool | Description | Permission Required |
|------|-------------|---------------------|
| `search_deals` | Search deals by name, filter by status | `deals.read` |
| `get_deal_details` | Get deal info with client and primary contact | `deals.read` |

**Reference Data Tools**
| Tool | Description | Permission Required |
|------|-------------|---------------------|
| `list_amenities` | List all venue amenities | None |
| `list_tags` | List tags (optional cuisine/style filter) | None |
| `list_industries` | List all client industries | None |
| `list_vendor_services` | List vendor service categories | None |
| `list_deal_services` | List deal service types | None |

### Security Considerations

1. **Permission Scoping:** Each tool call validates the user's permissions before execution
2. **Session-Based Auth:** Uses existing session middleware, not separate API keys
3. **Tier Restriction:** Only tier 2+ users can access the chat endpoint
4. **Audit Logging:** Venue updates via AI are logged with `source: "ai_agent"` metadata
5. **Input Validation:** All tool arguments are validated before database operations

### OpenAI Integration

- **Model:** gpt-5.2 (most capable model via Replit AI Integrations)
- **API Key:** Uses `AI_INTEGRATIONS_OPENAI_API_KEY` (auto-configured)
- **Base URL:** Uses `AI_INTEGRATIONS_OPENAI_BASE_URL` (auto-configured)
- **No user API key required** - charges billed to Replit credits
- **Streaming:** Enabled for real-time response display

### Conversation State

- **Session-only:** Conversations are not persisted to database
- **Client-side history:** Messages stored in React state
- **Cleared on modal close:** Starting fresh each session

---

## Recommendations for Next Steps

### Phase 1: Enhanced Venue Capabilities
- [ ] Add tool for venue photo search/suggestions
- [ ] Generate short descriptions in addition to long
- [ ] Bulk description generation for multiple venues
- [ ] Description style presets (formal, casual, luxury, etc.)

### Phase 2: Expanded Domain Coverage ✓
- [x] Add client search and details tools (January 2026)
- [x] Add vendor search and details tools with contacts (January 2026)
- [x] Add deal search and details tools for tier 2+ users (January 2026)
- [x] Add reference data lookup tools (amenities, tags, industries, services)
- [ ] Cross-domain queries ("Find venues that have worked with client X")

### Phase 3: Conversation Persistence
- [ ] Store conversation history in database
- [ ] Allow users to resume previous conversations
- [ ] Conversation search and filtering
- [ ] Conversation export/sharing

### Phase 4: Advanced AI Features
- [ ] Proactive suggestions based on user patterns
- [ ] Automated follow-up reminders
- [ ] Integration with calendar/scheduling
- [ ] Multi-step workflow automation

### Phase 5: Analytics & Insights
- [ ] Track AI usage patterns
- [ ] Monitor tool execution success rates
- [ ] User satisfaction metrics
- [ ] Cost optimization recommendations

---

## Testing Checklist

- [ ] Verify FAB only appears for admin/manager users
- [ ] Test venue search with partial names
- [ ] Test description generation and approval flow
- [ ] Verify venue update reflects in database
- [ ] Test link navigation after update
- [ ] Verify employees/viewers cannot access AI chat
- [ ] Test error handling for invalid venue IDs
- [ ] Verify audit log entries for AI-initiated updates

---

## Known Limitations

1. **Web Search:** Model uses its training knowledge; real-time web search may have limitations
2. **Session-Only History:** Conversations are lost when modal closes
3. **Write Operations:** Write capability limited to venue descriptions; other domains are read-only
4. **No Attachments:** Cannot process uploaded files or images
5. **English Only:** No multi-language support in system prompts

---

## Related Documentation

- [AI/MCP Readiness Plan](./ai-mcp.md) - MCP server implementation details
- [Audit Logging](./audit-logging-plan.md) - How AI actions are logged
- [Permissions System](../shared/permissions.ts) - Role-based access control
