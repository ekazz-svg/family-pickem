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
    "weeks/week-07.csv",
    "weeks/week-08.csv",
  ],

  // NFL season year (the year the season started).
  season: 2026,

  // Name shown at the top of the page.
  leagueName: "Family Pick'em",
};
