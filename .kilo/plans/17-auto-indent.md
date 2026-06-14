# Feature: Auto-Indent

## Summary
When pressing Enter inside a multiline quoted message, auto-indent the new line to match the previous continuation line.

## Behavior
- When Enter is pressed on a continuation line (inside quoted block), the new line inherits the indentation of the current line
- Only applies when the cursor is between the opening and closing quotes
- Works alongside the existing auto-prepend feature (auto-prepend takes priority if at end of a message line)

## Implementation
- In `onKeyDown` handler: before handling Enter, check if cursor is inside a quoted block continuation line
- If yes: capture the leading whitespace of the current line
- Insert `\n` + leading whitespace instead of just `\n`
- This extends the existing `isCursorInsideQuotes` check

## Files Changed
- `src/App.tsx` — extend existing Enter key handler in `onKeyDown`

## Estimated LOC
~30 lines
