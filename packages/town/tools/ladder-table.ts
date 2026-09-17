/**
 * THE HOUR LADDER. The classic ruleset charges whole hours per trip
 * (`routeHours`: minutes rounded up, minimum one), so the map is tuned so that
 * the trips a player actually makes land in the intended hour. This table is
 * the spec: `test/scheme.test.ts` asserts it and `tools/ladder.ts` prints it.
 *
 * Read it as the two lives a player can lead. Living at Low-Cost Housing on
 * the poor bank, the Factory, the jobs board and cheap food are an hour away,
 * the cheap strip and the Rent Office two, and everything on the rich bank
 * three. Living at Security Apartments beside the campus, lessons are an hour
 * away, the Rent Office, uptown shops and the jobs board two, and the poor
 * side three. The Employment Office on the bridgehead is an hour from every
 * poor-side place and two from every rich-side one. Everyone arrives at the
 * Bus Depot beside Low-Cost Housing, so the first trip to the jobs board is
 * two hours: that is the cost of arriving poor.
 */
export const LADDER: Array<[from: string, to: string, hours: number]> = [
  // --- living at Low-Cost Housing ------------------------------------------
  ['lowcost', 'bus_depot', 1],
  ['lowcost', 'factory', 1],
  ['lowcost', 'employment', 1],
  ['lowcost', 'monolith', 1],
  ['lowcost', 'zmart', 2],
  ['lowcost', 'blacks_market', 2],
  ['lowcost', 'pawn', 2],
  ['lowcost', 'rent_office', 2],
  ['lowcost', 'bank', 3],
  ['lowcost', 'qt_clothing', 3],
  ['lowcost', 'socket_city', 3],
  ['lowcost', 'university', 3],
  ['lowcost', 'security_apts', 3],
  // --- living at Security Apartments ---------------------------------------
  ['security_apts', 'university', 1],
  ['security_apts', 'rent_office', 2],
  ['security_apts', 'bank', 2],
  ['security_apts', 'qt_clothing', 2],
  ['security_apts', 'socket_city', 2],
  ['security_apts', 'employment', 2],
  ['security_apts', 'monolith', 2],
  ['security_apts', 'factory', 3],
  ['security_apts', 'zmart', 3],
  ['security_apts', 'pawn', 3],
  // --- the jobs board on the bridgehead ------------------------------------
  ['employment', 'monolith', 1],
  ['employment', 'rent_office', 1],
  ['employment', 'factory', 1],
  ['employment', 'zmart', 1],
  ['employment', 'blacks_market', 1],
  ['employment', 'pawn', 1],
  ['employment', 'bank', 2],
  ['employment', 'qt_clothing', 2],
  ['employment', 'socket_city', 2],
  ['employment', 'university', 2],
  // --- arriving in town ----------------------------------------------------
  ['bus_depot', 'factory', 1],
  ['bus_depot', 'employment', 2],
];

/** The thirteen classic locations, by district, for reports. */
export const DISTRICTS = {
  bridgehead: ['employment', 'monolith'],
  mill: ['factory', 'lowcost'],
  strip: ['zmart', 'blacks_market', 'pawn'],
  uptown: ['bank', 'qt_clothing', 'socket_city', 'rent_office'],
  campus: ['university', 'security_apts'],
} as const;
