# Zettelkasten Method in Noteece

The **Zettelkasten** (German for "slip box") is a knowledge management method popularized by sociologist Niklas Luhmann. It is designed to turn a collection of notes into a "communication partner" that helps generate new ideas.

## 1. Core Principles & Implementation

### A. Atomic Notes (The Zettel)
*Principle:* Each note should contain one single, complete idea.
*Noteece:*
- The **Note** entity is the fundamental unit.
- Notes are stored as flat files (conceptually) in the database.
- We encourage short, focused titles (e.g., "The difference between LWW and OR-Sets" rather than "Sync Notes").

### B. Unique Identifiers (The Address)
*Principle:* Every note needs a permanent address.
*Noteece:*
- We use **ULIDs** (Universally Unique Lexicographically Sortable Identifier).
- Example: `01ARZ3NDEKTSV4RRFFQ69G5FAV`
- Unlike timestamps, ULIDs are random enough to avoid collision but sortable by time.
- Unlike Titles, ULIDs never change. You can rename a note without breaking links.

### C. Linking (The Network)
*Principle:* Notes are useless in isolation. The value comes from connections.
*Noteece:*
- **Wikilinks:** We support the `[[Title]]` or `[[ULID]]` syntax.
- **Backlinks:** The system automatically indexes inverse relationships. If Note A links to Note B, Note B displays a "Linked From: Note A" section.
- **Graph View:** A force-directed graph visualization allows you to see the clusters and hubs of your knowledge.

### D. Structure Notes (Hubs)
*Principle:* Don't force hierarchy, let it emerge. Create "Hub" notes that just list links to other notes.
*Noteece:*
- You can create a note called "Architecture MOC" (Map of Content) and just list `[[Sync]]`, `[[Database]]`, `[[Security]]`.

## 2. Workflow Example

1.  **Fleeting Note:** You are on the bus. You open Noteece Mobile. You jot down: "Idea: Use acoustic fingerprinting for the music widget."
2.  **Inbox:** This sits in your "Inbox" (notes with no tags or specific status).
3.  **Literature Note:** Later, you read a paper on "Shazam Algorithm". You create a note summarizing it, citing the source.
4.  **Permanent Note:** You synthesize the idea. You create a new note: "Acoustic Fingerprinting in Noteece".
    - You write the implementation plan.
    - You link to `[[Shazam Algorithm]]`.
    - You link to `[[Music Widget]]`.
    - You tag it `#dev/feature`.

## 3. The "Why" for Developers

Why did we build Zettelkasten features into a productivity app?
- **Code is Knowledge:** Codebases are complex webs of logic. Documenting them requires a network, not a tree.
- **Context Preservation:** Linking a task to the note that inspired it preserves the "Why".
- **Longevity:** A hierarchy (folders) that makes sense today won't make sense next year. A network evolves organically.

---

**References:**
- [Niklas Luhmann's Zettelkasten](https://zettelkasten.de/posts/luhmann-zettelkasten/)
- [How to Take Smart Notes (Sönke Ahrens)](https://takesmartnotes.com/)
