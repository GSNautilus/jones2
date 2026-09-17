/**
 * Shared id types for the classic ruleset's content tables.
 * Source: docs/original-rules.md (the whole document; see each table's own file for citations).
 */

/** The 13 classic locations. Ids match packages/sim/src/content/locations.ts's LOCATIONS keys. */
export type ClassicLocationId =
  | 'employment'
  | 'monolith'
  | 'zmart'
  | 'qt_clothing'
  | 'socket_city'
  | 'blacks_market'
  | 'university'
  | 'bank'
  | 'factory'
  | 'pawn'
  | 'rent_office'
  | 'lowcost'
  | 'security_apts';

/** The 11 degrees. "# Degrees", "## List of Degrees" (original-rules.md:2379-2436). */
export type ClassicDegreeId =
  | 'junior_college'
  | 'trade_school'
  | 'business_admin'
  | 'academic'
  | 'electronics'
  | 'pre_engineering'
  | 'graduate_school'
  | 'engineering'
  | 'post_doctoral'
  | 'research'
  | 'publishing';

/**
 * Clothing categories ("# Clothes", original-rules.md:2799-2922). Also the uniform tier
 * ordering jobs require (casual < dress < business) — "# Uniform" (original-rules.md:2925-2991).
 */
export type ClassicClothingTier = 'casual' | 'dress' | 'business';

export type ClassicJobId = string;
export type ClassicItemId = string;
export type ClassicFoodId = string;
export type ClassicStockId = string;
