# Family Pick'em live dashboard

A one-page website that shows this week's standings, live scores, who picked what,
and who can still win. It reads the picks from a tab in the Google Sheet and the
scores from ESPN, and refreshes itself every minute while games are on.

Everything runs on free GitHub Pages. There's no server, no GitHub Actions and
no API keys: each visitor's phone loads the picks and the ESPN scores directly.

## Each week (about 5 minutes, after picks lock)

1. Open the **Dashboard** tab in the Google Sheet.
2. Change the number next to **Week**.
3. Replace the game rows: **Away** team in column A, **Home** team in column B,
   then each person's pick in their column. Team names, nicknames or
   abbreviations all work (Ravens, Baltimore, BAL, Niners, Jags…). Each pick
   cell has a dropdown with that game's two teams.
   **Someone sitting the week out? Leave their column blank.** A column with no
   picks counts as "didn't play", so they're left off that week instead of
   getting 0 wins. Don't delete or rename columns; add a new player in the next
   empty column.
4. **Put the Monday night (tiebreaker) game in the last row.**
5. Leave the **Tiebreaker** row blank for now.

**Monday morning:** once you've told the people still in the running, put their
tiebreaker guesses on the **Tiebreaker** row, under their names. Leave everyone
else blank; the dashboard only lists the people with a guess. (If the dashboard
is reading this week's file in `weeks/`, edit that file on GitHub, or ask Claude
to add them.)

That's it. The page picks up changes within about 5 minutes (Google's delay).
If something in the sheet can't be read, the page lists it under
"Things to check in the sheet."

## Tab layout

| Row | What goes in it |
|---|---|
| `Week` | the week number, e.g. `11` |
| `Tiebreaker rule` | `closest` (closest combined score wins) or `same winner` (right Monday winner first, then closest) |
| `Tiebreaker total` | leave blank; only fill in if live scores are down and you need to settle the week |
| `Away, Home, Winner override, Alex, Bailey, …` | header row: player names go across |
| one row per game | leave **Winner override** blank unless live scores are down |
| `Tiebreaker` | added Monday, only for the people still in the running: their guess at the Monday night combined score. Leave everyone else blank. |

The sheet has a column for all 12 people who've played this season (everyone
from Week 1, the biggest week). `sheet-template.csv` is the same layout with
Week 11's games and no picks, in case the tab ever needs rebuilding: import it
with **File → Import → Upload → Insert new sheet(s)**, then rename the tab
**Dashboard**.

## One-time setup

1. In the sheet: **File → Share → Publish to web**. Choose the **Dashboard** tab,
   choose **Comma-separated values (.csv)**, click **Publish**, and copy the link.
2. In this repo, open `config.js`, click the pencil icon, paste the link between
   the quotes on the `sheetCsvUrl` line, and commit. (Until then it can point
   at a file in `weeks/`, like `weeks/week-10.csv`.)
3. Repo **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`,
   folder = `/ (root)`. Save. The page appears at
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

Until a sheet link is set, the page shows a Week 10 demo. Add `?demo` to the
end of the address to see the demo any time.

## Season standings

Each week's picks are kept as a CSV in the `weeks/` folder (same layout as the
Dashboard tab) and listed under `pastWeeks` in `config.js`. **Results are pulled
from ESPN automatically**, both for the live week and for every finished week,
so nobody types in winners. The week being played now is shown live; once the
sheet moves on to the next week, the previous one drops into the season table
on its own.

Optional extras in a week's file:
- **Winner override** column: only if ESPN is wrong or unavailable (`Tie` for a tied game).
- `Week winner` row: who won a tied week, if the tiebreaker guesses aren't in the file.
- `Provisional,yes` row: marks a week as not yet double-checked (shown with †).

The one thing to keep: each week's **picks**. When a new week starts, the old
week's picks need to be saved as `weeks/week-NN.csv` (or ask Claude to do it).

## Notes

- Wins are counted from the actual scores, never from cell colors or a totals row.
- The page opens in light mode. The moon button at the top switches to dark mode, and each phone remembers its own choice.
- A tied NFL game counts as a wrong pick for everyone.
- "Still alive" checks every possible result of the games left (and the tiebreaker
  rule) to see whether that person can still finish first.
- What each person needs to win ("Needs Commanders…") stays hidden until every game
  before Sunday night is final, so the early games stay fun to watch.
- Live scores come from ESPN's public scoreboard, which is free but unofficial.
  If it stops working, use the **Winner override** column and the page still works.
