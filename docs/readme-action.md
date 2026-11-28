# README banner Action

A GitHub Action that draws a banner for your repo with Levni and commits it when it changes: a moving GIF by default,
or a still PNG. It reads the repo's name, description, stars, language and topics, and picks a drawing from the Folio.

```yaml
# .github/workflows/levni-banner.yml
name: README banner
on:
  release: { types: [published] }
  workflow_dispatch:
permissions:
  contents: write
jobs:
  banner:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Levni-Dev/levni/action@main
        with:
          path: .github/levni-banner.gif   # .png for a still
          theme: riso                       # riso, coral, green or night
          # mark: rocket                    # a Folio drawing by name; empty picks one
```

Then put it at the top of your README:

```markdown
![your-repo](.github/levni-banner.gif)
```

| input | default | meaning |
| --- | --- | --- |
| `path` | `.github/levni-banner.gif` | where to write it; `.gif` moves, `.png` is still |
| `theme` | `riso` | `riso`, `coral`, `green` or `night` |
| `mark` | picked | a Folio drawing by name |
| `commit` | `true` | commit and push when the banner changed |
| `message` | `docs: refresh the Levni README banner` | the commit message |

The same banner from a terminal: `npx @levni/levni banner banner.gif --repo owner/name`. In the browser:
[levni.dev/banner](https://levni.dev/banner/).
