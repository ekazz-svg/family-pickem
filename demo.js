// Demo data: Week 10, 2026, as of Monday before kickoff of LAC @ BAL.
// Picks are transcribed from the family sheet; finals are from the scores feed.
// Used only when no sheet link is set in config.js, or when the page URL ends in ?demo
window.PICKEM_DEMO = {
  label: "Week 10 as it stood Monday night before Chargers @ Ravens",
  csv: `Week,10
Tiebreaker rule,closest
Tiebreaker total,
Away,Home,Winner override,Alex,Bailey,Brennan,Cory,Eric,Gregg,Josh,Kim,Tina,Sam
Commanders,Giants,,Giants,Commanders,Giants,Giants,Giants,Commanders,Giants,Giants,Giants,Giants
Patriots,Lions,,Lions,Lions,Lions,Lions,Lions,Lions,Lions,Lions,Lions,Lions
Chiefs,Falcons,,Chiefs,Chiefs,Falcons,Chiefs,Chiefs,Falcons,Falcons,Chiefs,Chiefs,Chiefs
Texans,Browns,,Browns,Texans,Browns,Texans,Texans,Browns,Browns,Browns,Texans,Browns
Vikings,Packers,,Vikings,Packers,Packers,Packers,Packers,Packers,Packers,Vikings,Packers,Packers
Jaguars,Titans,,Jaguars,Jaguars,Jaguars,Jaguars,Jaguars,Jaguars,Jaguars,Jaguars,Jaguars,Jaguars
Dolphins,Colts,,Colts,Dolphins,Colts,Colts,Colts,Colts,Dolphins,Dolphins,Colts,Dolphins
Panthers,Saints,,Saints,Saints,Saints,Saints,Panthers,Saints,Panthers,Saints,Panthers,Saints
Bills,Jets,,Bills,Bills,Bills,Bills,Bills,Bills,Bills,Bills,Bills,Bills
Seahawks,Raiders,,Seahawks,Seahawks,Seahawks,Seahawks,Seahawks,Seahawks,Seahawks,Raiders,Seahawks,Seahawks
Rams,Cardinals,,Rams,Rams,Rams,Rams,Rams,Rams,Rams,Cardinals,Rams,Rams
49ers,Cowboys,,Niners,Niners,Niners,Niners,Niners,Niners,Niners,Niners,Niners,Niners
Steelers,Bengals,,Bengals,Bengals,Bengals,Bengals,Bengals,Bengals,Bengals,Steelers,Bengals,Bengals
Chargers,Ravens,,Chargers,Ravens,Ravens,Ravens,Chargers,Chargers,Ravens,Ravens,Ravens,Ravens
Tiebreaker,,,36,,,,39,,,,31,
`,
  // [away, home, awayScore, homeScore, state, kickoff (UTC), status text]
  games: [
    ["WSH", "NYG", 24, 21, "post", "2026-11-13T01:15:00Z", "Final"],
    ["NE", "DET", 10, 35, "post", "2026-11-15T14:30:00Z", "Final"],
    ["KC", "ATL", 35, 13, "post", "2026-11-15T18:00:00Z", "Final"],
    ["HOU", "CLE", 24, 27, "post", "2026-11-15T18:00:00Z", "Final"],
    ["MIN", "GB", 30, 10, "post", "2026-11-15T18:00:00Z", "Final"],
    ["JAX", "TEN", 40, 23, "post", "2026-11-15T18:00:00Z", "Final"],
    ["MIA", "IND", 22, 24, "post", "2026-11-15T18:00:00Z", "Final"],
    ["CAR", "NO", 20, 17, "post", "2026-11-15T18:00:00Z", "Final"],
    ["BUF", "NYJ", 31, 12, "post", "2026-11-15T18:00:00Z", "Final"],
    ["SEA", "LV", 21, 13, "post", "2026-11-15T21:05:00Z", "Final"],
    ["LAR", "ARI", 34, 6, "post", "2026-11-15T21:05:00Z", "Final"],
    ["SF", "DAL", 46, 40, "post", "2026-11-15T21:25:00Z", "Final"],
    ["PIT", "CIN", 18, 38, "post", "2026-11-16T01:20:00Z", "Final"],
    ["LAC", "BAL", 0, 0, "pre", "2026-11-17T01:15:00Z", ""],
  ],
};
