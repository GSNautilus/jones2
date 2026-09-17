/**
 * THE HOUR LADDER. The classic ruleset charges whole hours per trip
 * (`routeHours`: minutes rounded up, minimum one), so the map is tuned so that
 * the trips a player actually makes land in the intended hour. This table is
 * the spec: `test/scheme.test.ts` asserts it and `tools/ladder.ts` prints it.
 *
 * Travel was doubled on 2026-09-16 (walking rate halved in
 * `tools/riverton/spec.ts`), so distance bites: living at Low-Cost Housing on
 * the poor bank, the Factory is an hour away, the jobs board and cheap food
 * two, the cheap strip three, the Rent Office and the Bank four, the rest of
 * the rich bank five to six. Living at Security Apartments beside the campus,
 * lessons are two hours away, uptown and the jobs board four, the poor side
 * five to six. The Employment Office on the bridgehead is two hours from the
 * poor side and three from the rich side. Everyone arrives at the Bus Depot
 * beside Low-Cost Housing, three hours from the jobs board: that is the cost
 * of arriving poor.
 */
export const LADDER: Array<[from: string, to: string, hours: number]> = [
  // --- living at Low-Cost Housing ------------------------------------------
  ['lowcost', 'bus_depot', 1],
  ['lowcost', 'factory', 1],
  ['lowcost', 'employment', 2],
  ['lowcost', 'monolith', 2],
  ['lowcost', 'zmart', 3],
  ['lowcost', 'blacks_market', 3],
  ['lowcost', 'pawn', 3],
  ['lowcost', 'rent_office', 4],
  ['lowcost', 'bank', 4],
  ['lowcost', 'qt_clothing', 5],
  ['lowcost', 'socket_city', 5],
  ['lowcost', 'university', 5],
  ['lowcost', 'security_apts', 6],
  // --- living at Security Apartments ---------------------------------------
  ['security_apts', 'university', 2],
  ['security_apts', 'rent_office', 3],
  ['security_apts', 'bank', 4],
  ['security_apts', 'qt_clothing', 4],
  ['security_apts', 'socket_city', 4],
  ['security_apts', 'employment', 4],
  ['security_apts', 'monolith', 4],
  ['security_apts', 'factory', 5],
  ['security_apts', 'zmart', 5],
  ['security_apts', 'pawn', 6],
  // --- the jobs board on the bridgehead ------------------------------------
  ['employment', 'monolith', 1],
  ['employment', 'rent_office', 2],
  ['employment', 'factory', 2],
  ['employment', 'zmart', 2],
  ['employment', 'blacks_market', 2],
  ['employment', 'pawn', 2],
  ['employment', 'bank', 3],
  ['employment', 'qt_clothing', 3],
  ['employment', 'socket_city', 3],
  ['employment', 'university', 3],
  // --- arriving in town ----------------------------------------------------
  ['bus_depot', 'factory', 1],
  ['bus_depot', 'employment', 3],
];

/** The thirteen classic locations, by district, for reports. */
export const DISTRICTS = {
  bridgehead: ['employment', 'monolith'],
  mill: ['factory', 'lowcost'],
  strip: ['zmart', 'blacks_market', 'pawn'],
  uptown: ['bank', 'qt_clothing', 'socket_city', 'rent_office'],
  campus: ['university', 'security_apts'],
} as const;
