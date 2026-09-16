import type { LocationId } from '@jones2/town';

export type LocationFeature =
  | 'start'
  | 'employment'
  | 'bank'
  | 'newsstand'
  | 'university'
  | 'clinic'
  | 'food'
  | 'store'
  | 'clothing'
  | 'grocery'
  | 'auto'
  | 'pawn'
  | 'activity'
  | 'employer'
  | 'housing'
  | 'lottery'
  | 'rent';

export interface Location {
  id: LocationId;
  name: string;
  tagline: string;
  features: LocationFeature[];
}

export const LOCATIONS: Record<LocationId, Location> = {
  bus_depot: { id: 'bus_depot', name: 'Bus Depot', tagline: 'Everyone starts somewhere.', features: ['start'] },
  employment: { id: 'employment', name: 'Employment Office', tagline: 'Take a number.', features: ['employment'] },
  bank: { id: 'bank', name: 'First Jones Bank', tagline: 'Your money is our money.', features: ['bank', 'employer'] },
  newsstand: { id: 'newsstand', name: 'Corner Newsstand', tagline: 'All the news that fits.', features: ['newsstand', 'lottery'] },
  university: { id: 'university', name: 'Hi-Tech University', tagline: 'Knowledge is power. Tuition is due.', features: ['university', 'employer'] },
  clinic: { id: 'clinic', name: "Doc's Walk-In Clinic", tagline: 'No appointment, no problem, no guarantees.', features: ['clinic', 'employer'] },
  monolith: { id: 'monolith', name: 'Monolith Burgers', tagline: 'Billions and billions sold. Some of them eaten.', features: ['food', 'employer'] },
  cafe: { id: 'cafe', name: 'Java Hut', tagline: 'Wi-Fi extra.', features: ['food', 'employer'] },
  qt_clothing: { id: 'qt_clothing', name: 'QT Clothing', tagline: 'Dress for the job you want.', features: ['clothing', 'employer'] },
  socket_city: { id: 'socket_city', name: 'Socket City', tagline: 'Plug in, tune out.', features: ['store', 'employer'] },
  blacks_market: { id: 'blacks_market', name: "Black's Market", tagline: 'Fresh-ish produce daily.', features: ['grocery'] },
  zmart: { id: 'zmart', name: 'Z-Mart', tagline: 'Everything you never needed.', features: ['store', 'employer', 'lottery'] },
  pawn: { id: 'pawn', name: 'Pawn Shop', tagline: 'No questions asked. Few answers given.', features: ['pawn'] },
  auto: { id: 'auto', name: "Honest Al's Autos", tagline: 'Would Al lie to you?', features: ['auto'] },
  park: { id: 'park', name: 'Riverside Park', tagline: 'Mind the geese.', features: ['activity'] },
  gym: { id: 'gym', name: 'Flex Factory Gym', tagline: 'Pain is temporary. Membership is monthly.', features: ['activity'] },
  cinema: { id: 'cinema', name: 'Bijou Cinema', tagline: 'Now showing: whatever.', features: ['activity'] },
  gilded_fork: { id: 'gilded_fork', name: 'The Gilded Fork', tagline: 'Organic. Artisanal. Expensive.', features: ['food', 'employer'] },
  chez_cholesterol: { id: 'chez_cholesterol', name: 'Chez Cholesterol', tagline: 'Butter is a food group.', features: ['food', 'employer'] },
  factory: { id: 'factory', name: 'Consolidated Widgets', tagline: 'Widgets since whenever.', features: ['employer'] },
  shady_acres: { id: 'shady_acres', name: 'Shady Acres', tagline: 'Roommates included. Locks not.', features: ['housing'] },
  lowcost: { id: 'lowcost', name: 'Low-Cost Housing', tagline: 'It has a kitchen. Technically.', features: ['housing'] },
  security_apts: { id: 'security_apts', name: 'Security Apartments', tagline: 'Deadbolts on every door.', features: ['housing'] },
  rent_office: { id: 'rent_office', name: 'Rent Office', tagline: 'Rent is due on the first. Every first.', features: ['rent', 'employer'] },
  house_elm: { id: 'house_elm', name: '12 Elm Street', tagline: 'A starter home with a garage.', features: ['housing'] },
  house_hill: { id: 'house_hill', name: 'Hilltop Manor', tagline: 'Look down on everyone.', features: ['housing'] },
  house_lake: { id: 'house_lake', name: 'Lakeside Cottage', tagline: 'Far from everything. Worth it.', features: ['housing'] },
  lookout: { id: 'lookout', name: 'Lookout Point', tagline: 'You can see the whole town from here.', features: ['activity'] },
};
