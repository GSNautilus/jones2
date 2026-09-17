import type { ClassicLocationId } from './ids';

/**
 * The 13 classic locations, their opening hours, and the clerk's quotes.
 * Source: original-rules.md, each location's own "# <Name>" section ("## Opening Hours",
 * "## Quotes" -> "### Greetings" and other quote subsections).
 *
 * Low-Cost Housing and Security Apartments have no clerk/greeting quotes of their own in the
 * wiki — renting happens at the Rent Office, whose "### Renting Low-Cost Housing" and
 * "### Renting Security Apartment" quote sets are recorded under `rent_office` below.
 */
export interface ClassicLocation {
  id: ClassicLocationId;
  name: string;
  /** Verbatim/summarised from the location's "## Opening Hours" section. */
  openingHours: string;
  /** "### Greetings" quotes, shown when entering. */
  greetings: string[];
  /** Other quote categories keyed by their wiki subheading (e.g. "Bought an Item"). */
  quotes?: Record<string, string[]>;
}

export const CLASSIC_LOCATIONS: Record<ClassicLocationId, ClassicLocation> = {
  employment: {
    id: 'employment',
    name: 'Employment Office',
    // original-rules.md:1761-1769
    openingHours: 'Open every Week. Applying for a job or a raise requires at least 1 Hour remaining on the clock.',
    // original-rules.md:1908-1930
    greetings: [
      'Welcome to ACNE Employment. Why work for the best when you can work like the rest.',
      "Welcome to ACNE Employment. We'll either find you a job, or we won't.",
      'Welcome to ACNE Employment, where your skills and our expertise add up to disappointment!',
      'Welcome to ACNE Employment, where every lost job is a blemish on your resume!',
      "Welcome to ACNE Employment. We'll get you a job no matter what it costs you!",
      'Welcome to ACNE Employment, where your resume zits in our files!',
      'Welcome to ACNE Employment. No matter how bad your skills are, we have a job to match!',
    ],
  },
  monolith: {
    id: 'monolith',
    name: 'Monolith Burgers',
    // original-rules.md:4208-4213
    openingHours: 'Open every Week. Purchases are allowed even after the turn has ended.',
    // original-rules.md:4276-4335
    greetings: [
      'Welcome to Monolith Burger. Our Assistant Manager knows the Heimlich Manuever!',
      'Welcome to Monolith Burger. Next week, come meet Monny the Burger Clown!',
      'Welcome to Monolith Burger. You just missed Monny the Burger Clown!',
      "Welcome to Monolith Burger. Buy 'em by the bushel!",
      'Welcome to Monolith Burger. Our food is untouched by human hands, only by teenagers.',
      'Welcome to Monolith Burger. Cleanest restrooms in the game!',
      'Welcome to Monolith Burger. Free bibs with every order of Lobster Nuggets!',
      'Welcome to Monolith Burger. Try a box of Chocolate-Like(R) Cookie Shards!',
      'Welcome to Monolith Burger. Have you played our Guess the Chicken Part Game?',
      'Welcome to Monolith Burger. Special orders will take an extra 45 minutes.',
      'Welcome to Monolith Burger. Our soup today is Cream of Taco.',
      'Welcome to Monolith Burgers. Home of the Toemain Express and the Stomach Pump special.',
      'Welcome to Monolith Burgers, where we use only 100% Pure Extruded Beeflike Product!',
      'Welcome to Monolith Burgers, where even the wrappers have wrappers!',
      "Welcome to Monolith Burgers, where our Food(TM) is patented!",
      'Welcome to Monolith Burgers. Our buns are the softest!',
      'Welcome to Monolith Burgers, where our fat is always freshly rendered!',
      'Welcome to Monolith Burgers, where quality eats are in the bag!',
      'Welcome to Monolith Burgers, where our drinks have twice the ice!',
      'Welcome to Monolith Burgers, where our burgers come from contented cows!',
    ],
    quotes: {
      // original-rules.md:4338-4442
      'Bought an Item': [
        'Will that be all?',
        'Would you like fries with that?',
        'Something else with that?',
        'Take some home for your family too.',
        'Have a nice day.',
        'Sounds delicious.',
        'Will that be cash or charge? Tee hee.',
        "Well, aren't WE happy today.",
        "Would you like some Thousand Isla...I mean, Secret Sauce, with that?",
        "Does your Mother know you're eating here?",
        'Incidentally, we also sell used hairnets.',
        'Our pure beef burgers have half the soybeans of the other leading brands!',
        'Would you like some deep-fried potatoes and deep-fried pie with your deep-fried sandwich?',
        'This week only: buy two burgers and get the shakes for free!',
        'You can save 45 minutes by flushing that right now.',
        'Mmmmm...that looks almost good enough to eat!',
        'We now make our sandwiches from 100% biodegradable material!',
        "Is that 'to go,' to eat here, or neither?",
        'Please dispose of trash properly!',
        'Would you like a Prepubescent Irradiated Kung Fu Tortise statuette with that?',
        'Our Manager would like you to sign a petition to abolish the Minimum Wage.',
        "Did you know there's only 45 calories per french fry?",
        "Next to disposable diapers, we're the most familiar sight on the highways!",
        'Have you tried our new Breakfast Chile Releno?',
        'This is my first job, so forgive me if I totally mess up your order.',
        "Try our new Licorice 'n Liver Shake!",
        'Did you want a handful of ketchup packets with that?',
        "Remember, if it's a 6-lb. Beefburger, it must be a Monolith!",
        "Our burgers aren't broiled OR fried...they're poached!",
        'You can find us in any town...just follow the trail of empty wrappers!',
        'Remember...NO food is better than OUR food!',
        'Would you like to take home some complimentary advertising on a placemat?',
        "Our shakes are so thick, you can't even swallow 'em!",
        "Help yourself to a piece of our new 90-foot Compressed Salad Bar!",
        'Free refills if you can finish one cup of our coffee!',
      ],
    },
  },
  zmart: {
    id: 'zmart',
    name: 'Z-Mart',
    // original-rules.md:3210-3216
    openingHours: 'Open every Week. Purchases are allowed even after the turn has ended.',
    // original-rules.md:3322-3353
    greetings: [
      'Welcome to Z-Mart. Home of low cost, low quality, and cheap help.',
      "Welcome to Z-Mart, where low prices don't always mean low quality!",
      'Welcome to Z-Mart. Our overhead is so low, the clerks are stoop-shouldered!',
      'Welcome to Z-Mart. Our overhead is so low, we hire only midgets!',
      "Welcome to Z-Mart. If we see a line with more than 50 people waiting, we'll open another!",
      "Welcome to Z-Mart, where our everyday values are other stores' remainders!",
      'Welcome to Z-Mart, where shoddy merchandise comes home to roost!',
      "Welcome to Z-Mart, where yesterday's trash is today's bargain!",
      "Welcome to Z-Mart. If you can't find it here, it must be worth having!",
      'Welcome to Z-Mart, where Quality is something we often talk about!',
      "Welcome to Z-Mart, where we've closed over 600 stores from coast- to-coast!",
    ],
    quotes: {
      // original-rules.md:3357-3403
      'Bought an Item': [
        'Thank you for shopping at Z-Mart.',
        'Have a very good day!',
        'Have you checked out our red light specials?',
        'Please visit us again soon.',
        'Can I have a price check on register two please!',
        'Come back again. We have new specials each week.',
        'If you want cheap, we got it.',
        'Save some for our next...customer.',
        'Well, you get what you pay for!',
        'Check out our new shipment of Taiwanese microwave cozies!',
        "Don't forget to look in Aisle 14 for slightly irregular automotive parts!",
        "Be sure to look for our service department...and if you find it, let us know!",
        'Have you noticed our 83-piece steak knife set for only $4.95?',
        "We're having a special on dented or scratched floppy disks...only $3.50 a box!",
        'Take a look in Aisle 22 for half-price batteries. Sorry, demo models only!',
        "If you don't see what you're looking for, look underneath something else!",
      ],
    },
  },
  qt_clothing: {
    id: 'qt_clothing',
    name: 'QT Clothing',
    // original-rules.md:3022-3027
    openingHours: 'Open every Week. Purchases are allowed even after the turn has ended.',
    // original-rules.md:3088-3113
    greetings: [
      'Welcome to QT Clothing. We will sell you anything, no matter how bad it looks.',
      'Welcome to QT Clothing. Meet our tailor, Howie Fitzhugh!',
      "Welcome to QT Clothing. Our ties don't bind and our belts are a cinch.",
      'Welcome to QT Clothing. We have legal briefs and law suits.',
      'Welcome to QT Clothing, open 24 hours...we never clothes!',
      'Welcome to QT Clothing. Thursday is Double Shoulder Pad Day!',
      "Welcome to QT Clothing. Wear our clothes and you'll be a QT, too!",
      'Welcome to QT Clothing. The only place in the world where you can buy just 1 pant!',
      'Welcome to QT Clothing. Try on our soothing new Medicated Tux!',
    ],
    quotes: {
      // original-rules.md:3117-3178
      'Bought an Item': [
        "My! Don't WE look nice today!",
        "It's the real you.",
        'Spiffy.',
        'Faaabulous!!!',
        'Our clothes are of the highest quality.',
        'Have a wonderful day!',
        "Lookin' good!",
        "You can't go wong at QT.",
        'Perhaps you should stock up now while the prices are so reasonable.',
        'With your figure, perhaps you should consider going to a tent maker.',
        'Oooh, you look good enough to eat!',
        "Don't you just love the new spring fashions? Tres magnifique!",
        "It's nice like that, just a tad tight around the bottom.",
        "Good choice...rayon is back in this year!",
        'Now what are you going to do about your HAIR?',
        "Don't forget to accessorize!",
        'Nice! It really accentuates those pectorals.',
        'You know, a little tummy tuck would take care of that slight pucker in back.',
        "Stop slouching and it won't crease across the torso.",
        'With a physique like yours, you could wear ANYthing!',
        'Let me mention just two little words. Lipo. Suction.',
      ],
    },
  },
  socket_city: {
    id: 'socket_city',
    name: 'Socket City',
    // original-rules.md:3441-3446
    openingHours: 'Open every Week. Purchases are allowed even after the turn has ended.',
    // original-rules.md:3527-3573
    greetings: [
      "Welcome to Socket City. If you paid full price, you must've bought it here!",
      "Welcome to Socket City. You're just in time for our Pre-Arbor Day Value Fest!",
      'Welcome to Socket City. Apply for our Revolving Algorithmic Usury Credit Line!',
      'Welcome to Socket City. Our salespeople are here to help you...spend!',
      'Welcome to Socket City. Special today on useless Yuppie electronic gadgets!',
      'Welcome to Socket City. We only charge 10% over list price!',
      'Welcome to Socket City. Go ahead and TRY to talk us down.',
      'Welcome to Socket City. Next Friday is Double Commission Day!',
      'Welcome to Socket City. Come to our Moonlight Madness sale. 20% off if you wear your pajamas!',
      'Welcome to Socket City. Values direct from the factory to the jobber to the wholesaler to us to YOU!',
      'Welcome to Socket City, Home of High Pressure Sales!',
      "Welcome to Socket City, where Quality meets its match!",
      'Welcome to Socket City, where you get less for more!',
      'Welcome to Socket City, where our Service Department never sleeps, eats or bathes!',
      'Welcome to Socket City, where the customer is always ripe!',
      'Welcome to Socket City. Where everything quits working the day after the warranty expires.',
    ],
    quotes: {
      // original-rules.md:3577-3668
      'Bought an Item': [
        'Thank You very much.',
        'I’m sure that you will be very happy with your purchase.',
        'Thanks. You will have many years of trouble free service.',
        'Thank you for visiting Socket City.',
        'You sure know a deal when you see one.',
        'Come and see us again, anytime.',
        'Thank You. Let me know how you enjoy it.',
        'Perhaps I can interest you in something else.',
        'Have you seen our vacuum cleaners? They really suck!',
        'Would you like the $200 Extended Service Contract with that?',
        "You'll want the $150 Factory Extension Warranty with that, right?",
        'Can we interest you in the $300 1-Year Lifetime Replacement Guarantee?',
        'How about a $250 Extended Factory Service Warranty Replacement Guarantee Contract Agreement Deal with that?',
        'If you ever require service, you know where to go!',
        'Of course, for another $75, you could have gotten the next model up.',
        'Our free installation is only $45 today!',
        "Sorry, we only had a floor sample left, but trust me, it's in perfect condition.",
        'Remember, we offer free delivery anywhere within the game!',
        "Do you smell something burning? Oh, it's that cash in your pocket!",
        "Now that didn't hurt a bit, did it?",
        "Notice how we ignore anybody who's browsing the under-$200 items?",
        "Since you're spending, how about replacing your car stereo with an $800 Kerplunkett?",
        "Should we call the paramedics to treat your wallet for shock?",
        'Care to go double-or-nothing for that 92 inch Projection TV?',
        'Now, if I can steer you towards some of our higher-margin products...',
        "Didn't you have your eye on that complete Home Videotape Production Studio?",
        "If you're not completely satisfied, we'll be glad to give you partial credit.",
        "We're members of the Bait 'n Switch(TM) Retailer's Association!'",
        'We finance 90 Days, Same as Bankruptcy!',
        "With every purchase over $5200, we're giving away free Chapter 11 Auto-Filers!",
        'Please be aware that our Extended Service Contract excludes parts and labor.',
      ],
    },
  },
  blacks_market: {
    id: 'blacks_market',
    name: "Black's Market",
    // original-rules.md:3945-3950
    openingHours: 'Open every Week. Purchases are allowed even after the turn has ended.',
    // original-rules.md:4032-4072
    greetings: [
      'Welcome to Black’s Market. Where quality and service are unheard of and you will stand in line forever.',
      "Welcome to Black's Market, where you can grow old in our checkout lines.",
      "Welcome to Black's Market. Our meats are a cut above!",
      "Welcome to Black's Market. You can't beat our eggs!",
      "Welcome to Black's Market, where every day is Double Coupon Day!",
      "Welcome to Black's Market. Look for our special on day-old sushi!",
      "Welcome to Black's Market. Open all day and night for your binging pleasure!",
      "Welcome to Black's Market. Lowest prices in town on pickled octopus!",
      "Welcome to Black's Market. Hey, check out those melons!",
      "Welcome to Black's Market. Our butcher loves to stop and chew the fat!",
      "Welcome to Black's Market. Don't bypass our artichoke hearts!",
      "Welcome to Black's Market. This time, please don't take home the shopping cart.",
      "Welcome to Black's Market, the grosser grocer!",
      "Welcome to Black's Market. Our Swiss Cheese is made from Hole Milk!",
    ],
    quotes: {
      // original-rules.md:4076-4171
      'Bought an Item': [
        'Would you like fries with that? Oops, sorry, I usedta work at Monolith Burger.',
        'Just so you know, we saw you eating those grapes in the produce section.',
        'Cookies, ice cream and soda? Any REAL food in that shopping cart?',
        'If you wanna write a check, I need 8 forms of ID and a blood sample.',
        'You had eleven items, not ten. Next time, use the right aisle.',
        "One of your eggs is broken. Better use it quickly.",
        "Price check, please...a 5-pound box of Quintuple-Stuff Sandwich Cookies!",
        "Have you tried the Deli Department's Cheezy Sweet 'n Saurkraut Salad?",
        'Thank You. See you next time',
        'Will that be paper or plastic?',
        'Have a Good day.',
        'We appreciate your business.',
        "It's clear that you are a person who knows how to shop.",
        "I'm happy to see that you're well today.",
        "Thank you for shopping at Black's Market.",
        'Next time, give peas a chance!',
        'No tipping, please!',
        'Can we help you out to your marble?',
        'Come back for all your grocery needs!',
        "Say, two more trips and you'll have enough stamps!",
        "Hope you didn't buy any of those recalled mushrooms last week!",
        "Next time, don't dent the cans and expect a discount.",
        "Your selection of food indicates you're compensating for a lack of affection.",
        'Please be more careful with the mayonnaise in Aisle 7 next time.',
        'Arugla, Raddichio and Belgian Endive? What a yuppie!',
        "I'm sorry we were out of those little corns this week.",
        "Would you like to be a checker? OK. YOU'RE A RED ONE.",
        'Look in our Italian Pet Food section for Dog Ciao!',
        "If you can find lower prices on groceries, you're playing a different game.",
        "Check out our corn...you'll love to nibble our ears.",
        'Our celery stalks at midnight.',
        "Meet our dairy department managers, Sam 'n Ella!",
      ],
    },
  },
  university: {
    id: 'university',
    name: 'Hi-Tech U',
    // original-rules.md:2579-2588
    openingHours: 'Open every Week. Studying/Working requires at least 1 Hour left; Enrollment Fees may be paid even after the turn has ended.',
    // original-rules.md:2730-2794
    greetings: [
      'Welcome to Hi-Tech U. We will learn you for the future.',
      "Welcome to Hi-Tech U. We'll learn you to talk English good!",
      'Welcome to Hi-Tech U. Our Geology classes will put rocks in your head!',
      "Welcome to Hi-Tech U, where you'll never be bored of education!",
      'Welcome to Hi-Tech U. Enroll now for the third trimester!',
      'Welcome to Hi-Tech U. All our professors have tweed jackets with elbow patches!',
      'Welcome to Hi-Tech U. Our diplomas are genuine cheepskin!',
      "Welcome to Hi-Tech U. Our alumni haven't complained yet!",
      'Welcome to Hi-Tech U. Next semester is Double Credits Semester!',
      'Welcome to Hi-Tech U. When it comes to education, we will NOT be undersold!',
      "Welcome to Hi-Tech U. Already got your BA and MBA? We'll give you the third degree!",
      'Welcome to Hi-Tech U. No matriculating in the dormitories, please!',
      'Welcome to Hi-Tech U. Enroll now for our fifth quarter!',
      'Welcome to Hi-Tech U. You come in with a skull full of mush and you leave thinking like a shyster.',
      'Welcome to Hi-Tech U. Draw Kenny and YOU could win an art scholarship!',
      'Welcome to Hi-Tech U. Check out our Job Displacement Service!',
      'Welcome to Hi-Tech U. Need financial assistance? What do we look like, a bank?',
      "Welcome to Hi-Tech U, where one good term deserves another!",
      "Welcome to Hi-Tech U. The CIA recruitment center's right here on campus!",
      'Welcome to Hi-Tech U. Meet Ed Fiz, our Phys Ed instructor!',
      'Welcome to Hi-Tech U. CPA degrees or 65% x 1.2146/5ths of your money back!',
      'Welcome to Hi-Tech U. Where our campus ROTC stands for Really Obnoxious Teenage Civilians!',
    ],
  },
  bank: {
    id: 'bank',
    name: 'Pacific International Grand Gratuity Yield Bank',
    // original-rules.md:5273-5281
    openingHours: 'Open every Week. Deposit/withdraw work with no time left; other functions require at least 1 Hour remaining.',
    // original-rules.md:5417-5445
    greetings: [
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. We take very little interest in you.',
      "Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. You'll always find yourself a loan here!",
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. No charge for deposits!',
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Tuesdays are Double Dollar Days!',
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Have you gotten your free Toast Point Tongs?',
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our fixed-rate CDs spin at 1500 RPM!',
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. This little P.I.G.G.Y. plays the market!',
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Where we do Savings and Loans without a crisis!',
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our loan officers are real Yes-men!',
      'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our San Andreas branch is in default!',
    ],
    quotes: {
      // original-rules.md:5449-5451
      'Withdrawing Cash': ['There is always a penalty for early withdrawal.'],
    },
  },
  factory: {
    id: 'factory',
    name: 'Factory',
    // original-rules.md:6455-6461
    openingHours: 'Open every Week.',
    // original-rules.md:6496-6518
    greetings: [
      'Welcome to the Factory. We will overwork you, under pay you, and expect you to take it with a smile.',
      'Welcome to the Factory. Where else can you have this much fun and get paid for it too.',
      'Welcome to the Factory. Where the work is hard, the pay is low, and the conditions are miserable.',
      "Welcome to the Factory. Thursday is Double Workman's Compensation Day!",
      'Welcome to the Factory. We pay Top Dollar for Blue Collar!',
      'Welcome to the Factory. No sweat...no paycheck!',
      'Welcome to the Factory. Where money is our most important product.',
      'Welcome to the Factory. Please wear your safety helmet during scheduled inspections.',
    ],
  },
  pawn: {
    id: 'pawn',
    name: 'Pawn Shop',
    // original-rules.md:6066-6072
    openingHours: 'Open every Week. Pawning, redeeming and purchasing are allowed even after the turn has ended.',
    // original-rules.md:6168-6191
    greetings: [
      'Welcome to the Pawn Shop. Nothing is too hot for us to handle.',
      "Welcome to the Pawn Shop. Down on your luck? Save the story for someone who hasn't heard it.",
      "Welcome to the Pawn Shop. I may look mean on the outside, but I've got a heart of stone.",
      'Welcome to the Pawn Shop. Why crawl to anybody else?',
      "Welcome to the Pawn Shop, where we pardon your beg!",
      'Welcome to the Pawn Shop. Your first stop on the way down the corporate ladder!',
      "Welcome to the Pawn Shop. Where 'pawn' is just another word for nothing left to lose!",
      "Welcome to the Pawn Shop. Please don't beg, it scuffs the carpet.",
    ],
  },
  rent_office: {
    id: 'rent_office',
    name: 'Rent Office',
    // original-rules.md:777-804 — open only if: employed here, on a rent extension, or the last week of the month.
    openingHours:
      "Open if the player works here (every Week, but no services); is on a Rent Extension (that Week only); or it is the last Week of the Month (open to everyone).",
    // original-rules.md:947-969
    greetings: [
      "Welcome to the Rent Office. Don't snivel. Just pay your rent and leave.",
      'Welcome to the Rent Office. The rent is high, but where else can you get so little for so much.',
      "Welcome to the Rent Office. We don't charge any extra rent for the cockroaches.",
      'Welcome to the Rental Office. No waterbeds, pets or velvet toreador paintings, please.',
      'Welcome to the Rental Office. Where Sunday is Double Rent Increase Day!',
      "Welcome to the Rental Office. Our closets are so roomy, you'll never want to come out!",
      'Welcome to the Rental Office. Our security apartments feature 24-hour eunuch guards!',
      'Welcome to the Rental Office. Come in and meet your slumlo...I mean, your landlord!',
    ],
    quotes: {
      // original-rules.md:973-986
      'Pay Rent': [
        'Thank you. See you soon.',
        'Come back again soon.',
        "I'm here for all of your renting needs.",
        "Please tell all your rich friends about m... I mean us.",
        "Thank You, but please don't call me at 4 in the morning again.",
      ],
      // original-rules.md:990-994
      'Extension Approved': ['Sure, you can pay your rent next week.', 'I already told you Yes!'],
      // original-rules.md:998-1011
      'Extension Rejected': [
        'Sorry, your rent must be paid now.',
        "I'll say it again. NO!",
        'WhaddoI look like? A bank?. Get outa here!',
        "If I told you once, I've told you a thousand times. NO!!!!!",
        "Click on that button one more time and I'll break your finger.",
      ],
      // original-rules.md:1015-1028 — shown when renting Low-Cost Housing
      'Renting Low-Cost Housing': [
        "Ah. Well, I expect you'll find the neighborhood quite challenging.",
        "Oh. Well, hopefully you'll still be around at rent time.",
        'Of course, that comes furnished with a disgusting old chair. Enjoy!',
        "You'll be happy to know that we just put a fresh battery in the smoke detector.",
        'Just remember, the cockroaches are more frightened of you than you are of them.',
      ],
      // original-rules.md:1032-1045 — shown when renting a Security Apartment
      'Renting Security Apartment': [
        'Just a few rules: no pets, no children, no smoking, no parties, and no jogging in the halls.',
        "You'll love it! 24-hour security, spa, exercise room and free parking for BMWs.",
        'A wise choice. Our other building has just been condemned.',
        "Oh, good! You'll fit right in...EVERYBODY there has an attitude.",
        'We’ve just put in a sun deck for your slow-roasting pleasure.',
      ],
    },
  },
  lowcost: {
    id: 'lowcost',
    name: 'Low-Cost Housing',
    // original-rules.md:1050-1082 — no separate "Opening Hours" section; it's always enterable if renting it.
    openingHours: 'Enterable whenever the player currently rents this apartment (original-rules.md has no explicit hours for it).',
    // No greeting quotes of its own — see rent_office.quotes['Renting Low-Cost Housing'].
    greetings: [],
  },
  security_apts: {
    id: 'security_apts',
    name: 'Le Security Apartments',
    // original-rules.md:1284-1306 — same as Low-Cost: no explicit "Opening Hours" section.
    openingHours: 'Enterable whenever the player currently rents this apartment (original-rules.md has no explicit hours for it).',
    // No greeting quotes of its own — see rent_office.quotes['Renting Security Apartment'].
    greetings: [],
  },
};

export const CLASSIC_LOCATION_LIST = Object.values(CLASSIC_LOCATIONS);
