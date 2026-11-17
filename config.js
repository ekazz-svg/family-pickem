// ─────────────────────────────────────────────────────────────
//  Pick'em dashboard settings. This is the only file you edit.
// ─────────────────────────────────────────────────────────────
window.PICKEM_CONFIG = {
  // Where this week's picks come from. Either:
  //   - the "Publish to web" CSV link for the Dashboard tab of the Google Sheet, or
  //   - a file in this repo's weeks/ folder, like "weeks/week-10.csv".
  // Leave it empty ("") to show the built-in demo.
  sheetCsvUrl: "weeks/week-10.csv",

  // Finished weeks for the season table. Each file lists the picks and the
  // official winners. Add each week's file here once it's over.
  pastWeeks: [
    "weeks/week-01.csv",
    "weeks/week-02.csv",
    "weeks/week-03.csv",
    "weeks/week-04.csv",
    "weeks/week-05.csv",
    "weeks/week-06.csv",
    "weeks/week-07.csv",
    "weeks/week-08.csv",
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
