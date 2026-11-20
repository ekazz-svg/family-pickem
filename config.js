// ─────────────────────────────────────────────────────────────
//  Pick'em dashboard settings. This is the only file you edit.
// ─────────────────────────────────────────────────────────────
window.PICKEM_CONFIG = {
  // Where this week's picks come from. Either:
  //   - the "Publish to web" CSV link for the Dashboard tab of the Google Sheet, or
  //   - a file in this repo's weeks/ folder, like "weeks/week-10.csv".
  // Leave it empty ("") to show the built-in demo.
  sheetCsvUrl: "weeks/week-11.csv",

  // Weeks for the season table: each file holds that week's picks. Results
  // come from ESPN automatically (a filled-in "Winner override" column is used
  // instead when present). The week being played now is skipped here and
  // shown live, so it's fine for it to be on this list already.
  pastWeeks: [
    "weeks/week-01.csv",
    "weeks/week-02.csv",
    "weeks/week-03.csv",
    "weeks/week-04.csv",
    "weeks/week-05.csv",
    "weeks/week-06.csv",
    "weeks/week-07.csv",
    "weeks/week-08.csv",
    "weeks/week-10.csv",
    "weeks/week-11.csv",
  ],

  // A tied NFL game counts as a correct pick for everyone (how the family
  // sheet scored the Week 5 Giants-Commanders tie). Set to false to count it
  // as a miss for everyone instead.
  tieCountsAsWin: true,

  // NFL season year (the year the season started).
  season: 2026,

  // Name shown at the top of the page.
  leagueName: "Family Pick'em",
};
