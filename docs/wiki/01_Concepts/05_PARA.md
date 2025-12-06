# PARA Method in Noteece

The **PARA Method**, created by Tiago Forte (Building a Second Brain), is a universal system for organizing digital information. It stands for **Projects**, **Areas**, **Resources**, and **Archives**. Noteece's database schema and UI are designed to support this flow natively.

## 1. The Four Categories

### P - Projects
**Definition:** A series of tasks linked to a goal, with a deadline.
*Example:* "Ship v1.2", "Plan Japan Trip", "Refactor Sync Engine".
*Noteece Implementation:*
- The **Project Hub** is the dedicated home for these.
- A `Project` entity exists in the database.
- It has a `status` (Active, On Hold, Completed), a `deadline`, and linked `Tasks`.
- **Actionability:** High. These are things you are working on *now*.

### A - Areas
**Definition:** A sphere of activity with a standard to be maintained over time. No deadline.
*Example:* "Health", "Finances", "Car Maintenance", "Professional Development".
*Noteece Implementation:*
- **Tags/Folders:** We typically use Tags (`#area/health`) or top-level Folders to denote Areas.
- **Dashboards:** You can create a "Health Dashboard" note that queries all data related to that area.
- **Actionability:** Ongoing. Requires regular review.

### R - Resources
**Definition:** A topic or theme of ongoing interest.
*Example:* "Music Theory", "Rust Programming", "Coffee Brewing", "Graphic Design".
*Noteece Implementation:*
- This is where the **Zettelkasten** lives.
- These are your reference notes, saved articles, and knowledge base.
- **Actionability:** Low. Reference material.

### A - Archives
**Definition:** Inactive items from the other three categories.
*Example:* "Completed Projects", "Past Areas (e.g., old job)", "No longer interested resources".
*Noteece Implementation:*
- **Project Status:** Setting a project to "Archived" hides it from the main view but keeps it searchable.
- **Note Status:** Notes can be moved to an "Archive" folder or tagged `#archive`.
- **Trash:** Distinct from Archive. Trash is for deletion. Archive is for "Cold Storage".

## 2. The Flow of Information

Information in Noteece flows between these categories:

1.  **Capture:** An idea lands in your Inbox.
2.  **Clarify:** You realize it's a project idea. You convert it to a **Project**.
3.  **Execute:** You work on the project. You generate research notes (**Resources**).
4.  **Complete:** The project is done.
    - The Project entity moves to **Archive**.
    - The valuable research notes move to **Resources** (or Areas) for future use.

## 3. Technical Support for PARA

- **Project-Note Linking:** You can link a Note (Resource) to a Project.
    - *UI:* "Related Notes" tab in the Project View.
    - *DB:* `project_note` join table.
- **Tag Hierarchy:** Noteece supports nested tags (`area/finance/taxes`), allowing you to map the PARA hierarchy directly to the tag system.
- **Filtering:** The Search engine supports `is:project`, `tag:area/*`, making it easy to slice your vault by PARA category.

---

**References:**
- [The PARA Method: A Universal System for Organizing Your Digital Life](https://fortelabs.com/blog/para/)
