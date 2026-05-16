---
name: meeting-summary
description: "Summarize meeting notes into concise decisions and action items. Use this skill whenever the user uploads or pastes meeting notes, transcripts, or minutes — from any AI note-taker (Gemini, Otter, Fireflies, Read.ai, Zoom AI Companion, MS Teams Copilot, etc.) or hand-written notes — and wants a summary, recap, decisions list, action items, or todo extraction. Also trigger when the user says 'summarize this meeting', 'what was decided', 'what are the action items', 'meeting recap', or provides any meeting transcript file (.docx, .md, .txt, .pdf) asking for a summary."
---

# Meeting Summary Skill

Extract decisions and action items from meeting notes. Produce a short, structured Markdown summary — no filler, no restatement of discussion.

## Input

The user provides meeting notes in any format: docx, Markdown, plain text, PDF, or pasted text. They may come from an AI note-taker (Gemini, Otter, Fireflies, Read.ai, Zoom AI Companion, MS Teams Copilot, etc.) or be written by a human. AI-generated notes share a common shape — expect:

- Verbose, conversational transcription style
- Repeated points across speakers
- Discussion that circles before landing on a decision
- Action items buried mid-paragraph, not cleanly listed
- Speaker labels (e.g., "John:", "Speaker 1:")

Your job is to cut through all of that.

## Processing Steps

1. **Read the input file** using the appropriate tool (Read for .md/.txt, the docx skill for .docx, the pdf skill for .pdf).

2. **Extract metadata and build a name roster** from the content:
   - Meeting title/topic (from header or first line)
   - Date (from content or filename — convert to YYYY-MM-DD)
   - Attendees — build a name roster. This roster is your single source of truth for all names used in the summary. AI-generated notes typically expose names in two places:
     1. **Header / invited list** (top of doc) — names sometimes run together without commas (e.g., a space-separated string like "Firstname1 Lastname1 Firstname2 Lastname2 Firstname3 Middlename3 Lastname3"). Do NOT try to split this list by guessing word boundaries — multi-word names will get mangled.
     2. **Summary paragraph** and **action-items / suggested-next-steps** section — these typically use comma-separated full names and are far more reliable for parsing.

     **Always prefer the action-items / summary section to build your roster.** Scan every comma-separated name and every "X will..." assignee in those sections first. Then use that roster to cross-check the header list. Only add names from the header list if you can unambiguously match them against the roster or against names that appear in the body with clear boundaries (e.g., after a colon as a speaker label, or as a subject in a sentence like "<Full Name> confirmed...").

3. **Identify decisions** — statements where the group agreed on a direction, chose an option, or explicitly ruled something out. Indicators:
   - "We decided...", "Let's go with...", "Agreed that..."
   - "We won't...", "Not doing...", "Ruled out..."
   - Consensus moments after debate
   - Skip anything still open/unresolved — those go to open questions

4. **Identify action items** — tasks someone committed to or was assigned. Look for:
   - "X will...", "X to do...", "X is going to..."
   - "Next step is...", "Follow up on..."
   - If a deadline is mentioned, include it
   - **Assignee names must match exactly as written in the meeting notes.** Build a name roster from the attendee list, invited list, or speaker labels at the top of the document first. Then when assigning tasks, use the full name from that roster — not a shortened or guessed version. For example, if the notes list "Firstname Lastname", write "Firstname Lastname", not just "Firstname" or "Firstname L."

5. **Identify open questions** — unresolved discussions, deferred decisions, items needing follow-up from people not in the meeting.

## Output Format

Write a single Markdown file. Use this exact structure:

```
# Meeting Summary: [Title]

**Date:** YYYY-MM-DD
**Attendees:** Name1, Name2, Name3

## Decisions

1. **[Short label]** — One sentence stating the decision clearly.
2. **[Short label]** — One sentence.

## Action Items

- [ ] [Task description] → **[Assignee]** (by [deadline] if known)
- [ ] [Task description] → **[Assignee]**

## Open Questions

- [Question or unresolved topic] — context if needed
```

## Writing Rules

These matter because the output is meant to be scannable by humans and parseable by AI in downstream workflows:

- Each decision = one sentence max. State the conclusion, not the debate.
- Each action item = one line. Verb-first ("Create...", "Schedule...", "Update...").
- No preamble, no "Here's your summary", no sign-off.
- No restating what was discussed — only what was decided or assigned.
- If the notes are vague about who said what, write "Assignee unclear" rather than guessing.
- If no decisions were made, write "No explicit decisions recorded." Don't fabricate.
- Same for action items — "No action items identified." if genuinely none.

## Output Location

Save the summary as `meeting-summary-[YYYY-MM-DD].md` to the team's meeting-notes folder.

If the user hasn't configured one, ask once — then remember it via the agent's memory mechanism (or expect the user to pass an output path). Common locations:

- A `meeting-notes/` subdirectory in the team's docs repo
- An ops / wiki folder mounted into the workspace
- The current working directory as a fallback

If the date isn't available from the meeting content, use the current date.

Provide a link to the file so the user can access it directly.
