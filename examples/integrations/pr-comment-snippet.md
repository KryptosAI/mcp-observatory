# PR Comment Snippet Example

One lightweight pattern is to run a diff and post the short terminal summary into a PR comment.

```bash
npm run cli -- diff --base tests/fixtures/sample-run-a.json --head tests/fixtures/sample-run-b.json > observatory-diff.txt
```

Then post `observatory-diff.txt` with your preferred GitHub comment action or bot.

Good PR comments should:

- call out regressions first
- mention recoveries second
- link to the full JSON artifact and Markdown report for evidence
