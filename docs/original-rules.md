# Time

Jones in the Fast Lane
 is a Turn-Based Game, where each player takes a single turn before passing control to the next player. 

Beyond this, the game also tracks the passage of time within each turn, and from one turn to the next. As in-game time passes, the state of the game changes as well.

- 
Turn
: From the moment a player gets control to the moment they pass it on to the next player. Each turn starts with a 
Weekend
, followed by several potential events that could occur due to the player's previous actions and random rolls. After that, the player is placed at their current 
Apartment
 and is free to move around the board and perform actions.

- 
Hour
: Each player's Turn is split into 60 Hours, which are essentially "time points" that players spend on various actions and on moving around the board. Each action costs a different number of Hours. The turn ends once all 60 points have been spent - though players may be allowed to perform extra "Free" actions before relinquishing control to the next player. The current Hours remaining are always displayed on the town clock at the bottom of the screen.

- 
Week
: This measures the passage of time on a longer scale. Once each player has had their turn, control passes back to the first player, and the game advances by one Week. The sequential number of the current Week is shown at all times under the clock at the bottom of the screen. This number measures how long the game has been going for. Certain events can only take place once a specific number of Weeks has elapsed, to ensure that catastrophes don't happen too early on.

- 
Month
: Every four Weeks of the game constitute one Month. The fourth (last) week of the Month is different from all the others, as it is the Week during which 
Rent
 becomes due and 
Loans
 must be paid. Months are not visibly tracked in the game.


---

# Goals

In order to win a game of 
Jones in the Fast Lane
, a player must fulfill all four of their pre-set 
Goals
.

Each of the four Goals is set at the start of the game for each player. Different players may have different goals in each of the four categories.

Each goal is set at anywhere between 10 to 100. A player's progress towards each goal is calculated based on different 
Stats
 or other in-game values.

As soon as a player achieves all four goals at the start of their 
Turn
, they win the game. After the win screen, it is possible to allow the remaining players to keep playing until someone else manages to fulfill their goals. This can be repeated until all remaining players have won the game.

## List of Goals

The four goals in the game are:

| Goal | Icon | Calculation |
| Wealth Goal | | Liquid Assets / 100 |
| Happiness Goal | | Equal to the Happiness Stat |
| Education Goal | | 1 + (9 * Degrees ) |
| Career Goal | | 1.25 * Dependibility |

## Setting the Goals

Goals are set at the start of the game for each individual player (except 
Jones
, whose goals are set at random).

Each player can have any combination of goals. It is up to the players themselves to decide whether all players should have the same goals, the same total values of all goals combined, or any other specific requirements (e.g. "Wealth Goal must be at 100", etc.).

Goals may not be "turned off". Each goal must be between 10 and 100; It cannot be lowered to 0. However, achieving a 10-point goal is extremely easy, and can sometimes be done on the very first turn of the game.

## Checking Progress

Each player's current progress towards their assigned Goals can be checked using the "Goals" screen. This is accessed by pressing the F6 button or the Middle-Mouse-Button.

The Goals screen shows a bar for each player in the game, showing how close they are to achieving their goal. A percentage value is also displayed above the bar to indicate the same value.

Clicking on a player's number (or 
Jones
's face) shows a break-down of their progress towards each of the four individual goals. A small white box shows how far the player has progressed. Once a goal has been fulfilled, the star representing that goal lights up in gold.


---

# Wealth Goal

The 
Wealth Goal
 is one of four 
Goals
 a player must meet in order to win a game of 
Jones in the Fast Lane
.

The precise goal to fulfill is determined at the beginning of the game, separately for each player. Its range is between 10 and 100.

Fulfilling a player's Wealth Goal is a simply function of accumulating money. To count towards the Wealth Goal, the money must be held in 
Cash
, in the 
Bank
, or in 
Stocks
.

## Liquid Assets

To measure a player's progress towards fulfilling their Wealth Goal, the game calculates and tracks a special hidden 
Stat
 called "Liquid Assets".

The Liquid Assets Stat is equal to the sum of all of the following:

- 
All 
Cash
 currently in the player's wallet.

- 
All money currently deposited in the player's 
Bank
 account.

- 
The current total value of all 
Stocks
 owned by the player, based on their price this 
Turn
.

This sum is recalculated constantly as the player's assets fluctuate, but the only calculation that really matters happens at the start of the player's turn, just before the game checks whether they've won.

Each $100 the player owns in Liquid Assets is worth 1 point towards their Wealth Goal. Thus, a player needs exactly $10,000 in Liquid Assets to fulfill a 100-point Wealth Goal.

Note that the Liquid Assets formula 
completely ignores all 
Items
 owned by the player
, including even expensive 
Durables
 like the 
Computer
. Thus, purchasing Items actually 
decreases
 the player's advancement towards the Wealth goal, since it spends liquid money on assets that don't count. This can be confusing, since the Liquid Assets stat is 
not
 displayed in the player's Statistics page, but "Net Worth" 
is
 (which does take Items into account).

This also means that owning multiple Durables of the same type (e.g. two 
Refrigerators
) doesn't help the player 
at all
, and is actually a detriment to their progress towards the Wealth Goal!


---

# Happiness Goal

The 
Happiness Goal
 is one of four 
Goals
 a player must meet in order to win a game of 
Jones in the Fast Lane
.

The precise goal to fulfill is determined at the beginning of the game, separately for each player. Its range is between 10 and 100.

Fulfilling a player's Happiness Goal requires them to accumulate an amount of points into their Happiness 
Stat
 that is 
equal to or greater than
 their Goal.

Happiness can be acquired in multiple ways, including from purchases, 
Relaxation
, and several other actions.

Happiness can also decrease due to a variety of events, such as being robbed by 
Wild Willy
, being refused for a 
Loan
, or being fired from one's 
Job
.

## Happiness Stat

The player's current 
Happiness 
Stat
 is tracked for them individually using a single number. This number is increased or decreased during the game according to the events and actions listed in the following chapters.

This Stat is directly compared to the Happiness Goal to determine whether the player has accomplished that goal. For example, if the player has a Happiness Goal of 50 (the default), they need exactly 50 Happiness to meet that goal.

## Increasing Happiness

The following is a list of all actions and events that 
increase
 the player's Happiness Stat.

### Events

| Event | Happiness | Notes |
| Owning a Microwave or Stove at the start of a new Turn | +1 | If either item is owned. Owning both items only awards +1 per Turn. |
| Economic Boom | +5 | Only if the player has at least $1000 invested in the Stock Market . |
| Weekend involves driving a senior citizen's bus | +2 to +4 | A chance of about 1/41 of this happening each Turn . |
| Make money using the Computer | +3 | A chance of 1/7 each Turn , only if the player owns a Computer . |
| Win the Lottery small or medium prize. | +5 | A chance of about 1/500 per Lottery Ticket . |
| Win $5000 in the Lottery | +10 | A chance of about 1/10000 per Lottery Ticket . |

### Actions

| Event | Happiness | Notes |
| Relax at your Apartment | +2 | Only once per Turn . Additional Relaxation does not award Happiness, but does increase the Relaxation Stat . |
| Get a new Job | +3 | Each time. |
| Get a Raise | +3 | Each time. |
| Get a Bank Loan | +5 | Each time. |
| Get a Rent Extension | +1 | Each time. |
| Get a new Degree | +5 | Each time. |

### Purchases

| Item | Store | Happiness | Notes |
| | Refrigerator | Socket City | +1 | Only if the player does not currently own the item being purchased. |
| | Freezer | +2 |
| | Stove | +1 |
| | Color TV | +2 |
| | VCR | +2 |
| | Stereo | +2 |
| | Microwave | +2 |
| | Hot Tub | +3 |
| | Computer | +3 |
| | Refrigerator | Z-Mart | +1 | Only if the player does not currently own the item being purchased. |
| | Stove | +1 |
| | Color TV | +1 |
| | VCR | +1 |
| | Stereo | +1 |
| | Microwave | +1 |
| | Encyclopedia | +1 |
| | Dictionary | +1 |
| | Atlas | +1 |
| | Baseball Tickets | Z-Mart | +2 | Only for the first ticket of each type purchased that Turn . |
| | Theatre Tickets | +2 |
| | Concert Tickets | +2 |
| | 1 Week of Food | Black's Market | +1 | Only for the first purchase of any Fresh Food this Turn . |
| | 2 Weeks of Food | +2 |
| | 4 Weeks of Food | +4 |
| | Lottery Tickets | Black's Market | +2 | Only for the first purchase this Turn . |
| | Dress Clothes | QT Clothing | +1 | Each and every purchase. |
| | Business Suit | +2 |
| | Cheeseburger | Monolith Burgers | +1 | Only on the first purchase of either Cheeseburger or Astro Chicken this Turn . |
| | Astro Chicken | +2 |
| | Colas | Monolith Burgers | +1 | Only on the first purchase of either Colas or Shakes this Turn . |
| | Shakes | +2 |

## Decreasing Happiness

The following is a list of all actions and events that 
decrease
 the player's Happiness Stat.

### Events

| Event | Happiness | Notes |
| Starvation | -2 | When the player did not buy Fast Food and does not own any Fresh Food . |
| Doctor Visit | -4 | When eating Spoiled Food (50% chance) or when Relaxation is at its minimum (20% chance). |
| Appliance broken | -1 | Per Appliance that broke. Chance is 1/35 or 1/50 per Appliance, depending on where they were bought. |
| All Food Spoiled | -2 | When owning Fresh Food but no Refrigerator |
| Some Food Spoiled | -1 | When owning more Fresh Food than your Refrigerator (and Freezer ) can store. |
| Minor Market Crash | -1 | Only to the player whose turn it is when the crash occurs. Add -1, -2, or -5 (based on the severity of the Crash) if the player has at least $1,000 in Stock Market investments. |
| Moderate Market Crash | -2 |
| Major Market Crash | -3 |
| Lost Job due to Market Crash | -7 | May occur due to Major Market Crash (and is cumulative with that penalty). |
| Wage reduction due to Market Crash | -3 | May occur due to Moderate or Major Market Crash (and is cumulative with that penalty). |
| Mugged on the Street by Wild Willy | -3 | 1/31 chance each time you leave the Bank ; 1/51 chance each time you leave Black's Market . |
| Apartment robbed by Wild Willy | -4 | Only occurs if player lives at the Low-Cost Housing . |
| Defaulted on a Loan | -1 | Once per Month while Loan Debts are left unpaid. |

### Actions

| Action | Happiness | Notes |
| Refused a new Job | -1 | Per refusal. |
| Denied a Loan | -2 | Per refusal, when you don't currently have any Loans. |
| Denied a Loan Increase | -1 | Per refusal, when you already have a loan. |
| Refused Rent Extension | -1 | Only on first attempt each Turn . |
| Pawned any Item . | -1 | On each Pawning . |
| Pawned a Refrigerator while owning Fresh Food | -1 | On top of the normal penalty for Pawning . |

### Purchases

| Item | Store | Happiness | Notes |
| | Dog Food | Z-Mart | -1 | Each and every purchase. |
| | 8-Track Player | -1 |
| | Works of Capote | -2 |


---

# Career Goal

The 
Career Goal
 is one of four 
Goals
 a player must meet in order to win a game of 
Jones in the Fast Lane
.

The precise goal to fulfill is determined at the beginning of the game, separately for each player. Its range is between 10 and 100.

Fulfilling a player's Career Goal requires them to increase their 
Career Stat
, which is directly proportional to the player's 
Dependibility
. This stat is then compared to their Career Goal to determine whether they've fulfilled it.

Dependibility is increased by 
Working
, but is limited by several factors. The limits must be increased to allow Dependibility to increase as needed for the Career Stat.

Since Dependibility decreases each 
Turn
, it is possible to "unfulfill" the Career Goal after it had already been fulfilled.

## Career Stat

At the start of the game, each player's 
Career 
Stat
 is equal to 0. It will remain 0 so long as the player does not have a 
Job
. If the player ever loses their job, the Career Stat gets temporarily set to 0 until they can find a new Job.

Once the player acquires a Job, their Career Stat is immediately set to 1.25 * 
Dependibility
, and will continue tracking the Dependibility stat this way as long as the player remains employed.

As such, for a player to get 100 in their Career Stat, they would need to have 80 Dependibility.

Note that Dependibility is limited according to the parameters of the player's current Job. Only high-paying jobs allow Dependibility to increase to high levels. On the other hand, 
Degrees
 help push the limit higher than the job itself would allow.


---

# Education Goal

The 
Education Goal
 is one of four 
Goals
 a player must meet in order to win a game of 
Jones in the Fast Lane
.

The precise goal to fulfill is determined at the beginning of the game, separately for each player. Its range is between 10 and 100.

Fulfilling a player's Education Goal requires them to earn 
Degrees
 at 
Hi-Tech U
. Each Degree adds 9 points to their 
Education Stat
. This stat is then compared to their Education Goal to determine whether they've fulfilled it.

Since the number of Degrees a player owns cannot decrease during the game, once the Education Goal is fulfilled it will remain fulfilled.

## Education Stat

At the start of the game, each player's 
Education 
Stat
 is equal to 1.

A player's current Education 
Stat
 is recalculated each time they earn a new 
Degree
 at 
Hi-Tech U
 by completing a course.

Each Degree acquired adds exactly 9 points to the Education Stat.

With exactly 11 Degrees available in the game, the maximum achievable Education Stat is 1 + (11*9) = 100.

This Stat is then compared to the Education Goal to determine whether the player has accomplished that goal. For example, if the player has an Education Goal of 50 (the default), they need to earn at least 50 Education Stat points to achieve it (by completing at least 6 Degrees).


---

# Month

A 
Week
 is a unit of in-game time that is equal to 
X 
Turns
, where X is the number of players participating in the game.

The game begins on Week #1. Once each player has taken a Turn, the game advances to the next Week and the first player gets their Turn. This repeats for the rest of the game.

The progress of Weeks is important for several reasons:

- 
Every four Weeks constitutes a single 
Month
. On the fourth (last) Week of every Month, 
Rent
 and 
Loans
 become due and must be paid. The 
Rent Office
 will only open on the fourth Week of the month, for players who do not have a 
Job
 there.

- 
Certain events, such as 
Market Crashes
, can only occur after a certain number of Weeks have passed. This prevents catastrophes from occurring too early in the game.

- 
Consumables
 are depleted at a rate of 1 per Week, unless noted otherwise. This includes 
Fresh Food
, 
Clothing
 and 
Tickets
.

Some players consider the term "Week" and "Turn" to be interchangeable, but this Wiki treats them as two separate concepts. A Turn only measures the time from the moment a player gets control to the moment they pass it on to the next player; Whereas a Week measures the time between a player's Turn and their next Turn. In case there is only one player in the game, these are identical; Otherwise they are not.

## Display

The game displays the number of the current Week at the bottom of the screen, underneath the town clock. This number will advance by 1 after all players have had one Turn.

There is no practical limit to the number of Weeks that can be played, though the game will likely crash (or experience some other glitch) if the number of Weeks played exceeds #32767, due to software limitations.

## Months

Every four Weeks constitute one 
Month
. The first month of the game ends on Week #4, and begins on Week #5.

The game does not display the current month, but it does take months into account in that the fourth (last) Week of every Month is handled slightly differently from any other Week:

- 
The 
Rent Office
 is normally only open only at the end of the Month. It will open on subsequent weeks for players who have a 
Rent Extension
. It also opens every week for any player who has a 
Job
 there, but does not provide them rent services except on the end of the month.

- 
Rent
 is due at the end of each month. Failure to pay the Rent on that particular week causes the player to go into 
Rent Debt
, unless they as for a 
Rent Extension
. Each Rent payment pushes the deadline back by one whole Month (4 Weeks).

- 
Loans
 are due at the end of each month, but can be paid at any time until then. Failure to make at least one loan payment each Month results in 
Defaulting
 on the loan. Each Loan payment delays the next due date by one whole Month (4 Weeks).

## Delayed Events

Several game events can only occur after a certain number of Weeks have passed:

### Week 4+

In the 
CD-ROM version
 of the game, 
Wild Willy
 can only rob players on the street (outside the 
Bank
 or 
Black's Market
) starting on Week #4.

In the 
Floppy Disk version
 of the game, 
Market Crashes
 can only occur starting on Week #4.

### Week 8+

In the 
CD-ROM version
 of the game, until Week #8, 
Weekends
 can't cost more than $55. On Week #8 and after, the maximum cost of a Weekend is increased to $100.

In the 
CD-ROM version
 of the game, 
Market Crashes
 and 
Economic Booms
 can only occur starting on Week #8.

## Consumables

A player's 
Consumable Items
 are depleted at a constant rate at the start of their 
Turn
 during each week. Thus, most Consumables are counted by how many weeks they have remaining until they are all gone.

All three types of 
Clothes
 owned by a player deplete each week, even if the player doesn't wear them. Expensive clothes bought at 
QT Clothing
 can last up to 13 weeks per purchase.

Fresh Food
 depletes at a rate of 1 unit per week (though it can also 
Spoil
, if not stored properly). Fresh Food is often bought in batches of 4, as this is both cheaper and time-saving.

Tickets
 purchased by a player deplete as soon as their next Turn starts, under certain conditions. Tickets can sometimes remain in the inventory for additional weeks if they aren't immediately used to trigger a specific 
Weekend
 or the 
Lottery
.


---

# Rent

Rent
 is a payment each player must make once a 
Month
 for living in their 
Apartment
. Rent can only be paid at the 
Rent Office
 on the last 
Week
 of the Month.

A player's Rent remains static so long as they keep the same apartment; Their Rent will only change if they lease a different Apartment. Rents for other Apartments available on the market fluctuate with the 
Economy
. A player can therefore lower their Rent by letting go of their current apartment and leasing a cheaper one.

Failure to pay Rent by the end of the month results in 
Rent Debt
, which will be 
Garnished
 from the player's 
Wage
 each time they 
Work
. If a player needs more time to get the money, they may ask the Rent Officer for a one-Week 
Rent Extension
.

## Initial Rent

All players start the game with a 
Low-Cost Housing
 apartment. This apartment is paid for through the end of the month.

Each player's first 
Rent
 payment must be made on 
Week
 #4 -- the end of the first 
Month
 -- and then every 4 Weeks after that.

The Rent for the starting Apartment is always $325, and will remain as such until the player switches Apartments for the first time.

## Rent Notice and Payment

On the fourth 
Week
 of every 
Month
, each player receives a notice that their Rent is due. The player's current Rent is displayed on the note.

Rent can be paid by visiting the 
Rent Office
 during that same Week with enough 
Cash
 on hand. Clicking the "Pay 1 Month of Rent" option deducts the entire Rent from the player's 
Cash
 and extends that player's lease until the end of the following Month.

The Rent Office is normally only open for business on the same Week that the Rent notices appear.

## Rent Debt

If a player fails to pay their 
Rent
 by the end of the 
Month
, they go into Rent Debt. This debt is initially equal to the player's one-month Rent.

While the player is in Rent Debt, each time they 
Work
 at any job, half their 
Wage
 is automatically 
Garnished
 and used to pay off an equal amount of the Rent Debt. The player also loses an extra $2 in interest fees each time this happens.

If half the player's Wage is greater than the remaining Rent Debt, the game garnishes only as much money as needed to clear the debt. No interest is paid in this case.

A player may remain in Rent Debt indefinitely, if they so choose. They will never be evicted from their apartment. The only downside is the interest they must pay each time they Work.

## Rent Advance

A player with enough 
Cash
 on hand can pay an advance on their 
Rent
. This is done by clicking the "Pay 1 Month of Rent" button at the 
Rent Office
 when they don't owe any rent. The price of a Rent Advance is equal to the price of the normal Rent payment.

Paying a Rent Advance extends the lease on the apartment by an extra 4 
Weeks
. A player may pay for multiple Advances all at once, if they can afford it. Each payment adds 4 more weeks to the lease.

NOTE:
 If you plan to switch Apartments any time soon, avoid paying any Advances. They will be all forfeited once you switch apartments!

## Rent Extension

A player whose 
Rent
 is due can ask the Rent Officer for an Extension of one 
Week
.

The Rent Officer may approve or deny any Rent Extension request. Their decision is based on random chance, but is heavily influenced by the number of Extensions that the player had already received in the past.

| Times approved for Rent Extension | Chance of Approval |
| 0 | 100% |
| 1 | 75% |
| 2 | 50% |
| 3 or more | 25% |

A player's very first Extension request is always approved. The chance of any further approvals drops by 25% each time the player receives an Extension, to a minimum of 25%.

- 
If the request is denied, the player must pay their Rent by the end of the 
Turn
 or else go into 
Rent Debt
. The player also receives 
-1 
Happiness
.

- 
If the request is approved, the player does not go into 
Rent Debt
 at the end of the Turn. Instead, the deadline is pushed to the end of the following turn, and the 
Rent Office
 remains open (for that player only) until that time.

A player can only ask for an extension once per Turn. However there is no hard limit on the number of consecutive extensions they can receive, if they keep requesting them and getting approved.

If a player ever goes into Rent Debt for any reason, their Rent Extension requests will henceforth be automatically denied 
until the end of the game
.

## Switching Apartments

A player's Rent can only change if they leave their current Apartment and move into a new one. They will then have to pay the Rent of the new apartment each month. Players may only directly switch from one type of apartment to another, e.g. from 
Low-Cost Housing
 to 
Security Apartments
 and vice versa.

Switching apartments is done at the 
Rent Office
, and is only possible when the Office is open for business (usu. when the Rent is due, at the end of the month).

Switching apartments requires the player to pay a whole month's rent on the new apartment. Any 
Advance Payments
 on the old apartment are forfeited, though any existing 
Rent Debts
 remain unchanged.

The new apartment's monthly Rent depends on its type, as well as the state of the 
Economy
 at the time of the switch. 
Low-Cost Housing
 apartments have a baseline Rent of $325, whereas 
Security Apartments
 have a baseline rent of $475. These values fluctuate together as the Economy improves and declines. During a 
Market Crash
, Rents can reach 
half
 their baseline values.

Since all players start the game with a Low-Cost Housing apartment, their first switch will always be to a Security Apartment. However, if the Economy sinks early on, it is quite possible that their new apartment will cost less than the old one, despite being decidedly better. Conversely, if the player owns a Security Apartment and the Economy 
booms
, switching back to Low-Cost Housing can actually increase their Rent. Pay careful attention to the new Rent before making the switch.

## Lowering Rent

It is possible to use Apartment Switching to keep the same type of apartment while reducing the Rent.

Since a player cannot switch to the same type of apartment they already live in, lowering the rent requires making two consecutive switches during the same 
Turn
.

- 
First, visit the Rent Office during its business hours and determine whether the going rent on the same type of apartment you already own is significantly lower than what you are paying right now for that apartment. If the difference is not great, this trick may cost you more money than it saves.

- 
Note the current prices of both the Low-Cost Housing apartment and the Security Apartment, and add them together. You must gather this much 
Cash
 to make the switch.

- 
Switch from your current apartment type to the other type. Then immediately switch back to the first type.

Naturally, this trick works best during a 
Market Crash
, as prices will be extremely low. It's quite possible that paying for both apartments will be cheaper than one month's Rent for your current apartment.

This trick is not normally recommended during an 
Economic Boom
, even if you are currently paying a very high Rent for your apartment. Wait for the prices to drop first.


---

# Rent Office

The 
Rent Office
 is a 
Location
 where players can go to pay their 
Rent
 and to switch 
Apartments
. It is also a 
Workplace
.

Unless the player has a 
Job
 at the Rent Office, or has a 
Rent Extension
, the Rent Office will only be open on the last 
Week
 of each 
Month
.

Jobs at the Rent Office pay fairly well, are relatively easy to get, and do not require a 
Uniform
, making this a good workplace in the early game.

## Opening Hours

Unlike other 
Locations
, the 
Rent Office
 will only be open if any of these three conditions is met:

- 
The player has a 
Job
 at the Rent Office, in which case it will be open every 
Week
.

- 
The player has a 
Rent Extension
 at the Rent Office, in which case it will be open that week.

- 
It is the last 
Week
 of the 
Month
, in which case the Rent Office is open to everyone.

If none of these conditions are met, the Rent Office will be closed and inaccessible.

## Services

NOTE:
 Rent Office services are only available on the last 
Week
 of the 
Month
; or while on 
Rent Extension
. If the 
only
 reason the Rent Office is open to you this Week is because you work there, no services will be available here.

### Pay Rent

You may pay your 
Rent
 here. Doing so will erase your entire 
Rent Debt
 until the end of the current 
Month
.

If you have a standing 
Rent Debt
, you can pay it all off by choosing this option.

Clicking this option again will buy you an additional rent-free month. In other words, you will not have to visit the Rent Office for one additional month. You may do this as many times as you can afford.

### Ask for Rent Extension

You may ask the Rent Officer for a 
Rent Extension
. This gives you one extra 
Week
 to get the necessary money to pay your 
Rent
.

You may apply for a Rent Extension once a Turn. You may even do so on consecutive turns if you want, potentially extending your Rent payment by a whole month or more. However, the chance of your extension request being approved decreases each time you apply for one -- consecutively or otherwise.

Failure to pay the Rent by the end of the Extension results in 
Rent Debt
, the same as if you'd never asked for an Extension at all.

If you ever have your 
Wages

Garnished
 due to Rent Debt, any further attempts to get a Rent Extension 
will automatically fail
 until the end of the game.

### Pay Garnishment

If you are in 
Rent Debt
, but have managed to acquire the entire sum in 
Cash
, you may pay off your entire debt instantly at the Rent Office.

Generally speaking, there are two reasons to do this:

- 
To avoid the interest fees you would otherwise pay during 
Garnishment
.

- 
To immediately stop your Rent Debt from negatively affecting your 
Liquid Assets
. This is important when you are very close to your 
Wealth Goal
, and are trying to reach it as soon as possible.

### Switch Apartments

You may pay to rent an 
Apartment
 of a different type than the one you own. If you live at 
Low-Cost Apartments
, you may switch to 
Le Security Apartments
, and vice versa.

Switching Apartments requires you to pay one month's worth of Rent for the new apartment.

Any Rent money you've already down-paid for your current Apartment is forfeited.

You will still need to pay off any 
Rent Debt
 you owe for your previous apartment, as normal.

### Reduce Rent

If the Rent Office is currently offering the same type of 
Apartment
 you own for a lower 
Rent
, you may reduce your rent by switching over to the other type of apartment, and then immediately switching back. This is costly in the short term, but can save a lot of money in the long term.

Read more on this in the article on 
Rent
.

## Actions

### Work

If you have a 
Job
 at the 
Rent Office
, you can 
Work
 here to get money. The Rent Office will be open to you every 
Week
 of the 
Month
, though you can only use services at the end of the Month or while on 
Rent Extension
.

## Jobs

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Groundskeeper | $7 | 10 | 20 | -- | Casual Clothes |
| Apartment Manager | $9 | 30 | 30 | Junior College | Casual Clothes |

## Visuals

If visiting the 
Rent Office
 when it is closed, only the exterior of the building is shown.

Like most other portraits, the Rent Officer's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to the Rent Office. Don't snivel. Just pay your rent and leave.

- 
Welcome to the Rent Office. The rent is high, but where else can you get so little for so much.

- 
Welcome to the Rent Office. We don't charge any extra rent for the cockroaches.

- 
Welcome to the Rental Office. No waterbeds, pets or velvet toreador paintings, please.

- 
Welcome to the Rental Office. Where Sunday is Double Rent Increase Day!

- 
Welcome to the Rental Office. Our closets are so roomy, you'll never want to come out!

- 
Welcome to the Rental Office. Our security apartments feature 24-hour eunuch guards!

- 
Welcome to the Rental Office. Come in and meet your slumlo...I mean, your landlord!

### Pay Rent

- 
Thank you. See you soon.

- 
Come back again soon.

- 
I'm here for all of your renting needs.

- 
Please tell all your rich friends about m... I mean us.

- 
Thank You, but please don't call me at 4 in the morning again.

### Extension Approved

- 
Sure, you can pay your rent next week.

- 
I already told you Yes!

### Extension Rejected

- 
Sorry, your rent must be paid now.

- 
I'll say it again. NO!

- 
WhaddoI look like? A bank?. Get outa here!

- 
If I told you once, I've told you a thousand times. NO!!!!!

- 
Click on that button one more time and I'll break your finger.

### Renting Low-Cost Housing

- 
Ah. Well, I expect you'll find the neighborhood quite challenging.

- 
Oh. Well, hopefully you'll still be around at rent time.

- 
Of course, that comes furnished with a disgusting old chair. Enjoy!

- 
You'll be happy to know that we just put a fresh battery in the smoke detector.

- 
Just remember, the cockroaches are more frightened of you than you are of them.

### Renting Security Apartment

- 
Just a few rules: no pets, no children, no smoking, no parties, and no jogging in the halls.

- 
You'll love it! 24-hour security, spa, exercise room and free parking for BMWs.

- 
A wise choice. Our other building has just been condemned.

- 
Oh, good! You'll fit right in...EVERYBODY there has an attitude.

- 
We've just put in a sun deck for your slow-roasting pleasure.


---

# Low-Cost Housing

Low-Cost Housing
 (or 
Low-Cost Apartments
) is a 
Location
 that is one of two possible 
Apartments
 a player can live in. At the start of a new game, all players live in a Low-Cost Apartment and have their 
Rent
 paid through to the end of the first 
Month
.

A Low-Cost Apartment's 
Rent
 is typically cheaper than 
Le Security Apartments
, though it can be more expensive if the 
Economy
 is particularly good.

Low-Cost Apartments can be robbed by 
Wild Willy
 if the player owns particular 
Durables
, though the chance decreases with the player's 
Relaxation

Stat
.

## Renting

All players own a 
Low-Cost Apartment
 by default, with a monthly rent of $325. If a player moves out of this apartment, they can no longer enter the building at all unless switching back to it.

If the player switches to a 
Security Apartment
, they can switch back to a Low-Cost Apartment by visiting the 
Rent Office
 at the end of the 
Month
 or while on 
Rent Extension
. When switching back, you must pay for the first month in advance.

The Base Rent of a Security Apartment is $325. This price is affected by the 
Economy
.

## Benefits

- 
Low-Cost Housing is better for players who work at the 
Z-Mart
, 
Monolith Burgers
 or 
QT Clothing
, since it is closer to those locations.

## Drawbacks

- 
A Low-Cost Apartment can be robbed by 
Wild Willy
 at the beginning of each 
Turn
, if the conditions are met.

## Actions

### Relax

You may 
Relax
 in a 
Low-Cost Apartment
.

## Events

The 
Low-Cost Apartment
 can get robbed by 
Wild Willy
 at the start of each turn. For this to happen, the following conditions must be met:

- 
The player is currently 
Renting
 a Low-Cost Apartment.

- 
The player owns any 
Durables
 that are not a 
Refrigerator
, 
Freezer
 or 
Stove
.

If the player meets these conditions, the game rolls a random number to determine whether a Robbery will take place:

C

h

a

n

c

e

o

f

A

p

a

r

t

m

e

n

t

R

o

b

b

e

r

y

=

1

R

e

l

a

x

a

t

i

o

n

s

t

a

t

+

1

{\displaystyle Chance\ of\ Apartment\ Robbery={1 \over Relaxation\ stat+1}}

Relaxation
 can never drop below 10, so the maximum chance is 1/11, or 0.0909, each turn. Relaxation can never increase above 50, so the minimum chance is 1/51, or 0.0196 each turn.

If the apartment is robbed, each Durable (except the 
Refrigerator
, 
Freezer
 or 
Stove
) has a 25% chance of being stolen that turn. Any number of different durables can be stolen on the same turn. If the player owns multiple durables of the same type, they will all be stolen together.

If all Durables in the player's inventory pass the test, the robbery is canceled and will not take place.

If a robbery does occur, it causes the player to lose 
-4 
Happiness
.

## Visuals

The interior view of a 
Low-Cost Apartment
 shows a dilapidated armchair, a broken table, and a sign on the wall saying "Home Sweet Home". These items will disappear if the player's apartment is robbed by 
Wild Willy
 at the start of the 
Turn
, but will reappear the following week.

None of the player's owned 
Durables
 appear in the visuals for their Low-Cost Apartment.

If you are not currently 
Renting
 a Low-Cost Apartment, the view will be of the outer door.


---

# Security Apartments

Le Security Apartments
 (or 
Security Apartments
) is a 
Location
 that is one of two possible 
Apartments
 a player can live in.

A Security Apartment's 
Rent
 is often more expensive than 
Low-Cost Housing
, though it can be cheaper if the 
Economy
 is bad.

Security Apartments can never be robbed by 
Wild Willy
.

## Renting

Players do not own a 
Security Apartment
 by default. If a player is not currently renting this apartment, they cannot enter the building at all.

To 
Rent
 a Security Apartment, visit the 
Rent Office
 at the end of the 
Month
 or while on 
Rent Extension
. You must pay for the first month in advance.

The Base Rent of a Security Apartment is $475. This price is affected by the 
Economy
.

## Benefits

- 
The Security Apartment cannot by robbed by 
Wild Willy
.

- 
The Security Apartment is better for players who work at the 
Black's Market
, 
Bank
 or 
Factory
, since it is closer to those locations.

## Actions

### Relax

You may 
Relax
 in a 
Security Apartment
.

## Visuals

The interior view of a 
Security Apartment
 will show whether you own a 
Color TV
, 
VCR
, 
Stereo
 and/or 
Encyclopedia
. No other 
Durables
 are shown.

If you are not currently 
Renting
 a Security Apartment, the view will be of the outer door.


---

# Jobs

A 
Job
 is the permission to 
Work
 at a specific 
Workplace
 and receive a specific hourly 
Wage
. Each Workplace in the game offers 2 to 9 different Jobs, usually at different Wages.

Players may apply for Jobs at the 
Employment Office
. Each Job has three minimum requirements (
Experience
, 
Dependibility
 and 
Education
) that must be met in order to be hired for that Job.

Pressing the "Work" button at a player's Workplace causes the player to spend several 
Hours
 of their time in exchange for a proportional amount of 
Cash
, based on their current Wage.

Certain events can cause players to lose their Jobs or get a Wage cut. Players can also ask for a 
Raise
 at the Employment Office as the 
Economy
 improves. 

Players can't work at their Jobs if they don't own the required 
Uniform
 (or better).

Players can only achieve their 
Career Goal
 by getting a sufficiently high-paying Job.

## List of Jobs

See 
List of Jobs
.

## Getting a Job

At the start of the game, all players are unemployed (they have no job). In order to work and make money, each player must apply for a Job.

Jobs are acquired at the 
Employment Office
. Players may apply for a new job at any time before the end of their turn.

To get a new Job, the player must qualify for that job. Each job has three requirements:

- 
Experience
:
 Gained by 
Working
, but there is a limit to how much Experience a player can get at any Job; Better jobs allow accumulating more Experience.

- 
Dependibility
:
 Gained by 
Working
, but there is a limit to how much Dependibility a player can get at any Job; Better jobs allow accumulating more Dependibility. This stat 
gradually decreases every 
Week
.

- 
Education
:
 Gained by 
Graduating
 from courses at 
Hi-Tech U
. Some Jobs have no Education requirements, but many Jobs require the player to hold one or two 
specific

Degrees
.

Additionally, there is a luck-based random factor that may prevent a player from getting a 
specific
 job until the end of their current turn.

If a player manages to get a new Job, they can immediately start Working at their new 
Workplace
.

## Working

Whenever the player is at their current 
Workplace
, a button labeled "Work" appears at the bottom left of the center menu.

Clicking this button attempts to trigger a "Work Session". If successful, the player will spend 6 
Hours
 working, and will make an amount of 
Cash
 equivalent to 8 times their 
Wage
.

If the player has fewer than 6 Hours remaining on the clock when clicking the "Work" button, they will receive less payment relative to how many Hours are left.

Players are not allowed to Work if their 
Turn
 is over. Players also can't work if they aren't wearing the 
Uniform
 required by their job.

Should the player lack sufficient 
Dependibility
 when attempting to Work, they may get 
Fired
 from their Job. This does not prevent them from getting the same Job again later, but the low Dependibility has to be rectified first.

If the player is in 
Rent Debt
, their income will be 
Garnished
 when they Work - taking half of the earned money to pay off part of the Debt, plus $2 as an Interest Fee.

Working increases the player's 
Dependibility
 and 
Experience
, as long as these stats have not yet reached their maximums. The maximums are different for each Job, depending primarily on the Job's requirements for these two stats.

## Wages

When a player is hired for a new Job, their 
Wage
 is set to the value listed at the 
Employment Office
.

The amount of money a player earns for a full 6 
Hours
 of 
Work
 is equal to exactly 
8 times their current 
Wage
.

Working when there are fewer than 6 hours left on the clock reduces the earnings proportionally:

M

o

n

e

y

E

a

r

n

e

d

=

C

u

r

r

e

n

t

W

a

g

e

×

8

×

H

o

u

r

s

R

e

m

a

i

n

i

n

g

6

{\displaystyle Money \ Earned = {Current \ Wage \times 8 \times Hours \ Remaining \over 6}}

Different Jobs have a different "Base Wage". This value determines which jobs are more lucrative than others. However, the actual Wage for each Job is influenced by the 
Economy
, and will fluctuate up and down during the game.

The player normally keeps their original wage. Only specific player actions (like changing Jobs or 
Asking for a Raise
) or major 
Market Crashes
 can causes it to change.

## Losing a Job

There are two cases in which players can lose their current Job:

- 
Insufficient 
Dependibility
.
 This occurs if the player's Dependibility drops 5 points below the 
Required Dependibility
 for their current Job. This happens if the player has not gone to work for a while, since Dependibility increases when Working but decreases constantly every 
Week
. Earning 
University Degrees
 helps decrease the minimum required Dependibility for this calculation.

- 
A severe 
Market Crash
 event
. This may occur at random at the start of any player's 
Turn
. If this occurs, each player has a chance to lose their Job instantly (even if it happens on another player's turn). The worse the Crash, the higher the chance (up to 100% chance in the worst type of Crash).

In both cases, the player is allowed to get another Job immediately. Depending on various conditions, they may or may not be able to get the same Job they'd just lost. The only penalty for losing a Job is a loss of 
Happiness
; Getting fired does not negatively affect future job applications.

## Unemployment

Players are allowed to remain unemployed if they don't currently need a job - e.g. when they have plenty of 
Cash
 and just want to spend more time 
Relaxing
 or 
Studying
.

However, in order to fulfill one's 
Career Goal
, no matter how high it is, the player must have a job. This is because progress on the Career Goal is set to 0 while the player is unemployed, even if their 
Dependibility
 is currently sky-high. In such a case, the player may simply take the 
Cook
 job if they don't want to bother looking for an actual job.

Being unemployed also prevents the player from getting a 
Bank Loan
.

Note that there is no unemployment insurance in the game. The only ways to make money other than working a Job are to play the 
Stock Market
 or the 
Lottery
, both of which are very risky.


---

# List of Jobs

| Location | Job | Base Wage | Requirements | Uniform |
| Experience | Dependibility | Degrees |
| Z-Mart | Clerk | $5 | 10 | 10 | -- | Casual |
| Assistant Manager | $7 | 20 | 20 | -- | Dress |
| Manager | $8 | 30 | 30 | Junior College | Business |
| Monolith Burgers | Cook ** | $5 | 0 | 10 | -- | Casual |
| Clerk | $6 | 10 | 20 | -- | Casual |
| Assistant Manager | $7 | 20 | 30 | -- | Casual |
| Manager | $8 | 30 | 40 | Junior College | Dress |
| QT Clothing | Janitor * | $6 | 10 | 20 | -- | Casual |
| Salesperson | $8 | 30 | 30 | -- | Dress |
| Assistant Manager | $9 | 40 | 40 | Junior College | Business |
| Manager | $12 | 50 | 50 | Business Admin. | Business |
| Socket City | Clerk * | $6 | 10 | 20 | -- | Casual |
| Salesperson | $7 | 30 | 30 | -- | Dress |
| Electronics Repairman | $11 | 40 | 40 | Electronics | Casual |
| Manager | $14 | 40 | 40 | Electronics + Junior College | Business |
| Hi-Tech U | Janitor | $5 | 10 | 10 | -- | Casual |
| Teacher | $11 | 40 | 50 | Academic | Dress |
| Professor | $20 | 50 | 60 | Research | Dress |
| Factory | Janitor | $7 | 10 | 20 | -- | Casual |
| Assembly Worker | $8 | 30 | 30 | Trade School | Casual |
| Secretary | $9 | 40 | 40 | Junior College | Dress |
| Machinist's Helper | $10 | 40 | 40 | Pre-Engineering | Casual |
| Executive Secretary | $18 | 50 | 50 | Business Admin. | Business |
| Machinist | $19 | 50 | 50 | Engineering | Casual |
| Department Manager | $22 | 60 | 60 | Junior College + Engineering | Business |
| Engineer | $23 | 60 | 60 | Junior College + Engineering | Business |
| General Manager | $25 | 70 | 70 | Business Admin. + Engineering | Business |
| Bank | Janitor | $6 | 10 | 20 | -- | Casual |
| Teller | $10 | 40 | 40 | Junior College | Dress |
| Assistant Manager | $14 | 50 | 50 | Business Admin. | Business |
| Manager | $19 | 60 | 60 | Business Admin. | Business |
| Broker | $22 | 70 | 70 | Business Admin. + Academic | Business |
| Black's Market | Janitor | $6 | 10 | 10 | -- | Casual |
| Checker | $8 | 20 | 20 | -- | Casual |
| Butcher | $12 | 30 | 30 | Trade School | Casual |
| Assistant Manager | $15 | 40 | 40 | Junior College | Dress |
| Manager | $18 | 50 | 50 | Business Admin. | Business |
| Rent Office | Groundskeeper | $7 | 10 | 20 | -- | Casual |
| Apartment Manager | $9 | 30 | 30 | Junior College | Casual |

(*) These jobs are only available in the CD-ROM version of the game.

(**) Anyone can get this job, no matter their stats.


---

# Employment Office

The 
Employment Office
 (or 
ACNE Employment
) is a 
Location
 where players can apply for a new 
Job
, or ask for a 
Raise
 in their current Job.

A player may apply for any Job in the game, but will be refused if they don't qualify for the Job they requested. Qualification requires a certain amount of 
Experience
 and 
Dependibility
, and some Jobs also require specific 
University Degrees
. Additionally, there is a chance for players to randomly be refused a job that they do qualify for.

If the player's current Job is listed at a higher 
Wage
 than they're already being paid, they may ask for a Raise to match the listed Wage. Qualifying for a Raise requires only sufficient Dependibility.

## Opening Hours

The 
Employment Office
 is open every 
Week
. Asking for a Job or a Raise requires at least 1 
Hour
 remaining on the clock.

## Applying for a Job

The 
Employment Office
 shows a list of all 
Workplaces
 in the game. Selecting a Workplace from the list displays all 
Jobs
 at that Workplace (including Jobs that the player could not possibly get with their current stats). The current 
Wage
 is displayed next to each Job.

To apply for a Job, simply select it from the list. Applying for a job advances the clock by 
4 
Hours
. A player may apply for multiple Jobs each turn, so long as there is still time left on the clock.

Once a player has applied for a job, the game calculates whether they qualify for that Job, based on their current 
Stats
.

If the player has the necessary stats for the job, they receive the new Job immediately, at the listed hourly Wage. They also receive 
+3 
Happiness
.

If the player has insufficient Stats, the Employment Officer will reject the application and explain which stats are lacking (
Experience
, 
Dependibility
, and/or 
Education
).

Occasionally, the Employment Officer may reject the application due to "No openings". This signifies that the player does have the required stats, but has failed a random roll. If this occurs, the player will not be able to get that 
particular
 job if they try again during the same turn. The Job may become available during the player's next turn.

If the player is refused a job for any reason, they receive 
-1 
Happiness
.

NOTE:
 An application for the 
Cook
 job at 
Monolith Burgers
 will 
always
 be approved.

For more information about qualifying for jobs, see the articles on 
Jobs
.

## No Openings

Whenever qualifying for a new Job (asking for a raise at your current one is different), a random number is rolled between 1 and 100 and it is compared to the player's luck score, which is derived from their 
Dependability
 and 
Experience
 and number of 
Degrees
:

Luck

=

30

+

10

+

Dependability

+

Experience

+

8

⋅

DegreeCount

3

{\displaystyle \operatorname {Luck} =30+{\frac {10+\operatorname {Dependability} +\operatorname {Experience} +8\cdot \operatorname {DegreeCount} }{3}}}

Your luck starts at 43 and can be immediately increased to 44 by taking the free job as the Monolith 
Cook
, at the cost of 4 hours. 

If this check is the **only** reason that you did not get a job, that job gets marked *turned down* and future attempts to get the same job on the same turn will fail. This will display the dreaded prompt, "No openings." You can still try for other jobs at the same location.

However, you **can** get No Openings without getting Turned Down, because No Openings is a default response and during the first 4 weeks, the "Poor Work History" response is suppressed in the game: so if you had the experience and education but not the dependability, in the early weeks you can get a No Openings that is secretly a Poor Work History. For instance, if you do not work in the first week (e.g. you study all that week) you will only have 17 Dependability on Week 2, beneath what is needed for the Monolith Clerk job. Similarly if you job hop Cook -> Clerk -> Cook -> Z-Mart Clerk -> Cook on week 1, you will have 20 Experience but the Monolith Assistant Manager role will always deny you with No Openings because you don't have 30 Dependability.

## Asking for a Raise

If the player's current 
Job
 is listed at a higher hourly 
Wage
 than what they are currently making, the player may select that Job to ask for a Raise. Asking for a Raise advances the clock by 
4 
Hours
.

Qualifying for a Raise is much simpler than qualifying for a new Job, requiring only that the player's 
Dependibility
 be higher than the 
Required Dependibility
 for their current job.

If the Raise is approved, the player's Wage is immediately increased to the listed amount, and they receive 
+3 
Happiness
.

The Dependibility requirement for receiving a raise increases by +5 points each time the player receives a Raise, making it more difficult to get additional raises. This counter resets each time the player switches to a different Job.

NOTE:
 Applying for your current job at the same Wage you're already getting (or less) achieves nothing - but will still waste 4 Hours!

## Visuals

Like most other portraits, the Employment Officer's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to ACNE Employment. Why work for the best when you can work like the rest.

- 
Welcome to ACNE Employment. We'll either find you a job, or we won't.

- 
Welcome to ACNE Employment, where your skills and our expertise add up to disappointment!

- 
Welcome to ACNE Employment, where every lost job is a blemish on your resume!

- 
Welcome to ACNE Employment. We'll get you a job no matter what it costs you!

- 
Welcome to ACNE Employment, where your resume zits in our files!

- 
Welcome to ACNE Employment. No matter how bad your skills are, we have a job to match!


---

# Dependability

Dependibility
 is a hidden 
Stat
 that is tracked independently for each player. It has many effects on the player's ability to 
Work
 and to get 
Jobs
, and is the only factor in determining the player's progress towards their 
Career Goal
.

Players start the game with 20 Dependibility. Each 
Week
, it degrades by 
-3
, to a minimum of 0. If Dependibility is lower than 10 when a player gets a new Job, it is reset to 10.

Dependibility is checked each time the player applies for a new Job. Each job has a 
Required Dependibility
 rating, which the player must reach or surpass to qualify for that Job.

Similarly, getting a 
Raise
 at a player's current Job requires them to have sufficient Dependibility. The more Raises they ask for at any one job, the more Dependibility they need to get another Raise. Switching jobs resets this behavior.

If the player's Dependibility (plus modifiers) drops 5 points below the Required Dependibility for their Job, they will be fired as soon as they try to Work at that Job.

Whenever a player Works at their job, they get 
+1 Dependibility
 per Work session (6 
Hours
 or fewer). However each player has a 
Maximum Dependibility
 which they cannot normally surpass. This limit is increased as the player gets better Jobs and more 
University Degrees
.

## Dependibility Stat

Dependibility
 is a hidden 
Stat
 - you may not check your Dependibility anywhere during the game, though it is tracked constantly behind the scenes.

Each player starts the game with 20 Dependibility.

At the start of a player's 
Turn
, their Dependibility is reduced by 
-3 Points
 regardless of anything else. Dependibility cannot drop below 0.

## Required Dependibility

Each 
Job
 in the game has a specific "Required Dependibility" rating. See the 
List of Jobs
 for the Required Dependibility of each job in the game.

In order to get any Job, the player must have enough Dependibility to match the Required Dependibility or surpass it. If the player does not have enough Dependibility, their application will be rejected on grounds of 
"Poor Work History"
.

Note that Jobs requiring 10 Dependibility actually require 0 Dependibility to be hired. This is an anti-frustration feature that is meant to prevent players from ever being completely locked out of the Job market.

If the player manages to get any new Job while their Dependibility score is less than 10, it is reset to 10.

## Increasing Dependibility

The primary way to increase Dependibility is to 
Work
.

Each successful Work session (where any amount of money was earned) increases Dependibility by 
+1 point
.

This increase only occurs if the player has not yet reached their 
Maximum Dependibility
 -- otherwise no points are received in this stat.

Additionally, each time the player acquired a new 
Degree
, they receive 
+5 Dependibility
. This bonus is allowed to exceed their Maximum Dependibility. The bonus is not permanent, and will decrease as normal each turn (see 
Dependibility Stat
, above).

## Maximum Dependibility

The player's Maximum Dependibility prevents them from accumulating more Dependibility than their current Job allows.

Each time the player gets a new 
Job
, their Maximum Dependibility is reset according to the formula below:

M

a

x

i

m

u

m

D

e

p

e

n

d

i

b

i

l

i

t

y

=

20

+

R

e

q

u

i

r

e

d

D

e

p

e

n

d

i

b

i

l

i

t

y

f

o

r

J

o

b

+

(

U

n

i

v

e

r

s

i

t

y

D

e

g

r

e

e

s

×

5

)

{\displaystyle Maximum \ Dependibility = 20 + Required \ Dependibility \ for \ Job + (University \ Degrees \times 5)}

Normally this means that players can exceed their job's Dependibility requirement by 20 points. This requires 
Working
 at least 20 times at their job, plus any extra required to make up for however much Dependibility they lose between 
Turns
.

This limitation means that players are normally forced to climb from one Job to a slightly better one, collecting more and more Dependibility each time before proceeding to a better job.

Each 
University Degree
 acquired by the player increases their Maximum Dependibility by a permanent 
+5 points
. Thus, a player who has all 11 Degrees and a Job that requires only 10 Dependibility has a maximum of 20 + 10 + 55 = 
85 Dependibility
, which is enough to jump straight to the highest-paying Jobs in the game without having to slowly climb the Jobs ladder.

## Minimum Dependibility

In order to actually 
Work
 at their current 
Job
, a player needs to have at least as much Dependibility as the 
Minimum Dependibility
 rating for that job.

A job's Minimum Dependibility is equal to its listed "Required Dependibility" minus 5 points. 

If the player lacks enough Dependibility to meet this Minimum, they will be fired as soon as they try Working.

If the player has 3 to 5 points of Dependibility below the job's listed Required Dependibility rating, they will only be warned by their employer.

## Getting a Raise

Dependibility also plays a major factor in determining whether the player can get a 
Raise
 at their current Job.

A Raise will only be granted if the player meets the following requirement:

D

e

p

e

n

d

i

b

i

l

i

t

y

>=

R

e

q

u

i

r

e

d

D

e

p

e

n

d

i

b

i

l

i

t

y

f

o

r

J

o

b

+

(

5

×

R

a

i

s

e

s

A

l

r

e

a

d

y

R

e

c

e

i

v

e

d

)

{\displaystyle Dependibility >= Required \ Dependibility \ for \ Job + (5 \times Raises \ Already \ Received)}

Therefore, for the first Raise at a job, the player only needs to meet the job's "Required Dependibility" rating. Each additional Raise requires the player to acquire 5 more Dependibility points.

The number of Raises received is only tracked while the player holds the same Job. If they switch to a new Job, this counter is reset, making it easier to get Raises again.

## Career Stat

The player's 
Career Stat
 -- their progress towards their 
Career Goal
 -- is measured entirely by their current Dependibility.

The Career Stat is calculated as 1.25 times the player's current Dependibility. Thus, with 80 Dependibility the player has 100 Career Stat, which is the amount needed to fulfill the highest possible Career Goal.

Since 
Degrees
 increase a player's 
Maximum Dependibility
, it is possible to reach 80 Dependibility simply by studying a lot and then working at a low-end Job. However this may sometimes be more difficult than simply climbing the Jobs ladder.


---

# Degrees

A 
Degree
 is an acknowledgement that a player has 
Graduated
 from a course at 
Hi-Tech U
. Players are awarded a new Degree each time they finish a course.

The Degree given at the end of a course is unique to that course. There is a total of 11 Degrees to be acquired. Once a Degree is acquired, it can never be lost.

Obtaining Degrees in general has several important benefits, primarily in advancing the player towards their 
Education Goal
. Additionally, some specific Degrees are required in order to get certain 
Jobs
 - particularly high-paying jobs. The highest-paying Jobs are only available if the player obtains 
two
 specific Degrees.

Only two Degrees are available to get at the start of the game. As Degrees are acquired, additional courses may be unlocked for study, until all 11 Degrees have been acquired.

## List of Degrees

| Degree | Becomes Available After... | Required for Jobs |
| Job | Location | Base Wage |
| Junior College | Always Available | Manager | Z-Mart | $8 |
| Manager | Monolith Burgers | $8 |
| Assistant Manager | QT Clothing | $9 |
| Manager | Socket City | $14 |
| Secretary | Factory | $9 |
| Department Manager | Factory | $22 |
| Engineer | Factory | $23 |
| Teller | Bank | $10 |
| Assistant Manager | Black's Market | $15 |
| Apartment Manager | Rent Office | $9 |
| Trade School | Always Available | Assembly Worker | Factory | $8 |
| Butcher | Black's Market | $12 |
| Business Administration | Junior College | Manager | QT Clothing | $12 |
| Executive Secretary | Factory | $18 |
| General Manager | Factory | $25 |
| Assistant Manager | Bank | $14 |
| Manager | Bank | $19 |
| Broker | Bank | $22 |
| Manager | Black's Market | $18 |
| Academic | Junior College | Teacher | Hi-Tech U | $11 |
| Broker | Bank | $22 |
| Electronics | Trade School | Electronics Repairman | Socket City | $11 |
| Manager | $14 |
| Pre-Engineering | Trade School | Machinist's Helper | Factory | $10 |
| Graduate School | Academic | -- | -- | -- |
| Engineering | Pre-Engineering | Machinist | Factory | $19 |
| Department Manager | $22 |
| Engineer | $23 |
| General Manager | $25 |
| Post-Doctoral | Graduate School | -- | -- | -- |
| Research | Post-Doctoral | Professor | Hi-Tech U | $20 |
| Publishing | Research | -- | -- | -- |

## Benefits

There are multiple benefits for acquiring degrees. Some of these benefits are specific to each Degree earned, while others are simply benefits of 
Graduating
 from courses in general.

### Education Goal

A player's progress towards their 
Education Goal
 depends only on the number of Degrees they've acquired.

The player's 
Education Score
 is calculated with the following formula:

Education Score = 1 + (9 * Number of Degrees)

As there are 11 Degrees to acquire, the maximum Education Goal of 100 can only be reached by acquiring every single degree available.

### Job Qualification

When applying for a 
Job
, the application will always be refused (with the message "Not enough Education") if the player does not have all of the necessary Degrees for that specific job.

The majority of jobs require no Degrees at all.

Many Jobs require only one degree, typically one that can be acquired within completion of one or two University courses.

The highest-paying Jobs, including the 
General Manager
, 
Engineer
 and 
Broker
, among a few others, require 
two
 different Degrees.

Junior College
 is the most frequently-required Degree. Since it is available for study at the very start of the game, acquiring this Degree opens up a lot of new options.

### Job Openings

The number of acquired Degrees also affects the chance that a Job application will be refused for the reason "No Openings".

The chance of being refused in this way depends on the player's total 
Degrees
, 
Dependibility
 and 
Experience
 in near-equal amounts. Acquiring all available Degrees guarantees 
at least
 a 66% chance to avoid the "No Openings" refusal (assuming the worst possible Dependibility and Experience).

### Dependibility

Upon 
Graduating
 from a course at 
Hi-Tech U
, the player receives a boost of 
+5 Dependibility
.

This is a temporary boost, since Dependibility decreases constantly at a rate of 
-3 Dependibility
 every 
Week
. A boost of +5 therefore lasts just two weeks before Dependibility returns to its previous level.

This boost does not care about the 
Maximum Dependibility
 cap, and can freely exceed it.

This bonus may be meant to offset the loss of Dependibility that a player might incur when they spend more time at the University than at their Job. Having a little bit of extra Dependibility helps ensure that the player doesn't get fired from their Job.

### Maximum Dependibility and Experience

Each time a player 
Works
 at their Job, their 
Dependibility
 and 
Experience
 stats increase by +1 each -- unless they exceed their 
Maximum Dependibility
 / 
Maximum Experience
 caps, respectively.

These caps are mostly based on the Job's 
Required Dependilibity
 and 
Required Experience
 (respectively). They prevent players from massively increasing their stats just by going to work at a low-end job every single 
Turn
.

Each Degree acquired by the player provides a permanent 
+5 Maximum Dependibility
 and 
+5 Maximum Experience
. Therefore, the more Degrees a player has, the higher their Dependibility and Experience can rise - even when working very low-end jobs.

As a result, players who earn a lot of Degrees early on can jump straight from low-paying Jobs to high-paying Jobs without having to take any intermediate jobs. This assumes the player spends enough time Working after acquiring the Degrees, to actually reach the new Maximums.


---

# Hi-Tech U

Hi-Tech U
 (or 
Hi-Tech University
) is a 
Location
 where players can 
Enroll
 and study 
Degrees
, advancing towards their 
Education Goal
 and qualifying themselves for certain high-end 
Jobs
. It is also a 
Workplace
.

Getting a Degree requires players to pay a small Enrollment Fee, and then spend up to 60 
Hours
 studying the course (not necessarily all at once). As each Degree is acquired, more Degrees become available for study. Players may enroll in up to 4 courses simultaneously, and may complete them whenever they desire.

Jobs at the University generally require players to hold certain Degrees, but they pay relatively well and give the player a good opportunity to study often. These jobs require no more than 
Dress Clothes
 as a 
Uniform
.

## Opening Hours

Hi-Tech U
 is open every 
Week
. Studying or Working at the University require at least 1 
Hour
 remaining on the clock, but you may pay 
Enrollment Fees
 even if the turn has already ended.

## Enrolling

Before a player is allowed to study for a 
Degree
, they must first pay their Enrollment Fees. This is done by clicking the "Enroll" button and accepting the fee. Enrollment has a base cost of 
$50 per course
, adjusted to the current state of the 
Economy
. 

Enrolling allows the player to take one course. A player may enroll multiple times in a row without choosing any course to study; The "Enroll" action simply purchases the 
ability
 to take one course. For example, a player may pay 5 Enrollment Fees, and only later decide which 5 courses to actually take.

Once enrolled, the player may select any of the courses available to them in the University menu. This turns the course "active", and causes the player to take their first lesson in that course. A number then appears next to the name of the course, showing how many additional 
Study
 sessions are required to complete the course and acquire the Degree.

Though Enrollment takes no time off the clock (and can be done even if the player's 
Turn
 is over), it is not possible to choose a course (and take your first lesson in it) unless you have at least 1 
Hour
 left on the clock.

## Studying

Selecting a new course from the University menu immediately expends one "enrollment fee" paid by the player, and causes them to take the first lesson in that course. Any additional click on the same course causes the player to take another lesson.

Each time a player takes a lesson in a course, the number on the right side of the course "book" decreases by 1. When this number reaches 0, the player 
Graduates
 from the course and acquires the relevant 
Degree
.

By default, each course takes 10 lessons to complete. This number may be reduced by owning certain 
Durables
 (see 
Extra Credit
, below), down to a minimum of 8 lessons per course.

To take a lesson, the player must have at least 1 
Hour
 left on the clock. Each lesson advances the clock by 6 
Hours
. If there are fewer than 6 hours remaining on the clock, the player still takes the entire lesson without any penalty.

If the player has multiple courses "active" at the same time, they may take lessons in any of these courses as they see fit. There is no imperative to Graduate from one course before continuing with another. There is also no time limit on completing a course - you may study and complete it whenever it's suitable for you.

### Extra Credit

Certain 
Durables
 can decrease the number of lessons required to 
Graduate
 from any course:

- 
If the player owns a 
Computer
, they require 
1 fewer lesson
 to Graduate.

- 
If the player owns an 
Encyclopedia
, 
Dictionary

and

Atlas
, they require 
1 fewer lesson
 to Graduate. This only applies if all three items are owned.

Owning all four of these Durables reduces the number of lessons required to Graduate to 8 - saving 20% of the time required to complete each course. This can be of extreme importance for players with a high 
Education Goal
.

## Graduating

Once 10 lessons (minus 
Extra Credit
) of a specific course have been completed, the player receives the corresponding 
Degree
. The game signifies this by showing the player's new diploma. It then refreshes the available courses list, removing the completed course and adding any new courses unlocked by completing it.

Beyond the benefits of the Degree itself, there are several important benefits bestowed on a player 
each time they Graduate
:

- 
The player receives 
+5 
Happiness
.

- 
The player receives 
+5 
Dependibility
. This bonus may push Dependibility beyond its normal maximum cap. However, Dependibility will continue to degrade each turn as normal from that point. This bonus somewhat offsets any Dependibility losses incurred by Studying instead of Working.

- 
The player receives a permanent 
+5 
Maximum Dependibility
 and 
+5 
Maximum Experience
. They still need to 
Work
 to reach these maximums, but once that is achieved the player might be able to qualify for a better job than they could otherwise reach. Graduating from multiple courses may enable a player to go straight from a low-paying job to a high-paying job.

## Work

If you have a 
Job
 at the 
University
, you can 
Work
 here to get money.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Janitor | $5 | 10 | 10 | -- | Casual Clothes |
| Teacher | $11 | 40 | 50 | Academic | Dress Clothes |
| Professor | $20 | 50 | 60 | Research | Dress Clothes |

## Visuals

Like most other portraits, the Hi-Tech U Professor's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to Hi-Tech U. We will learn you for the future.

- 
Welcome to Hi-Tech U. We'll learn you to talk English good!

- 
Welcome to Hi-Tech U. Our Geology classes will put rocks in your head!

- 
Welcome to Hi-Tech U, where you'll never be bored of education!

- 
Welcome to Hi-Tech U. Enroll now for the third trimester!

- 
Welcome to Hi-Tech U. All our professors have tweed jackets with elbow patches!

- 
Welcome to Hi-Tech U. Our diplomas are genuine cheepskin!

- 
Welcome to Hi-Tech U. Our alumni haven't complained yet!

- 
Welcome to Hi-Tech U. Next semester is Double Credits Semester!

- 
Welcome to Hi-Tech U. When it comes to education, we will NOT be undersold!

- 
Welcome to Hi-Tech U. Already got your BA and MBA? We'll give you the third degree!

- 
Welcome to Hi-Tech U. No matriculating in the dormitories, please!

- 
Welcome to Hi-Tech U. Enroll now for our fifth quarter!

- 
Welcome to Hi-Tech U. You come in with a skull full of mush and you leave thinking like a shyster.

- 
Welcome to Hi-Tech U. Draw Kenny and YOU could win an art scholarship!

- 
Welcome to Hi-Tech U. Check out our Job Displacement Service!

- 
Welcome to Hi-Tech U. Need financial assistance? What do we look like, a bank?

- 
Welcome to Hi-Tech U, where one good term deserves another!

- 
Welcome to Hi-Tech U. The CIA recruitment center's right here on campus!

- 
Welcome to Hi-Tech U. Meet Ed Fiz, our Phys Ed instructor!

- 
Welcome to Hi-Tech U. CPA degrees or 65% x 1.2146/5ths of your money back!

- 
Welcome to Hi-Tech U. Where our campus ROTC stands for Really Obnoxious Teenage Civilians!


---

# Clothes

Clothes
 or 
Clothing
 are a type of 
Consumable
 item that is required for players to do any 
Work
. The player's 
Job
 requires them to wear a specific 
Uniform
 (or better), otherwise the "Work" button will do nothing.

Clothes wear out over time, and must periodically be replaced. Clothes bought at 
QT Clothing
 last longer than those bought at 
Z-Mart
.

The player automatically wears their best owned Clothing item, but all clothes in their possession wear out over time regardless of what they're wearing.

High-end Clothing items also provide a small 
Happiness
 bonus whenever they are purchased at QT Clothing (but not at Z-Mart).

Players who have run out of clothing items will appear naked (or in underwear), and cannot Work anywhere. If they also lack the money to buy new Clothes, they might be eligible to receive a 
Donation
.

## List of Clothes

| Item | Store | Base Price | Lasts for... | Happiness |
| | Casual Clothes | QT Clothing | $73 | 11 Weeks | -- |
| | Z-Mart | $35 | 9 Weeks | -- |
| | Dress Clothes | QT Clothing | $ 125 | 13 Weeks | +1 |
| | Z-Mart | $90 | 9 Weeks | -- |
| | Business Suit | QT Clothing | $295 | 13 Weeks | +2 |

## Effects

Each player has three Clothing "Categories" in their inventory: 
Casual
, 
Dress
, and 
Business
. Each of these has a corresponding value that tracks how many 
Weeks
 of that particular category of clothing the player currently owns.

All players start the game with 6 Weeks' worth of 
Casual Clothes
, and 0 Weeks' worth of 
Dress
 and 
Business
 clothes.

At the start of each 
Turn
, the game subtracts 1 "Week of Clothing" from 
each
 of the three categories in the player's inventory. If any category reaches 0, the player no longer has any clothes to wear from that category.

Each time a player purchases a new piece of Clothing, the "Weeks of Clothing" value in the appropriate category is increased as per the table 
above
. For example, purchasing a new set of 
Dress Clothes
 at 
QT Clothing
 increases the "Dress" category by 13 - allowing that player to wear Dress Clothes for the next 13 weeks. Players may purchase multiple instances of the same category of clothing, increasing the counter appropriately with each purchase.

Whenever the player tries to 
Work
, the game checks to see whether they have at least 1 Week of Clothes remaining 
in the necessary category for their Job
 or in a higher category. If no Weeks are left in any of the checked categories, the "Work" button will do nothing, and the player is notified that they are not suitably dressed for work.

When a player has no more than 1 week of Clothing left in any of the three categories, they receive a notice at the start of their turn indicating that they should buy new Clothes.

### Happiness

Purchasing 
Dress Clothes
 or a 
Business Suit
 at the 
QT Clothing
 store gives a small bonus to the player's 
Happiness
. This bonus is provided with each and every purchase.

## Visuals

Whenever the player starts their turn or leaves a 
Location
, the game re-checks their inventory to find the most expensive item of Clothing they own. That item is worn on the player's avatar as they walk around town. 
Business Suits
 take precedence over all other clothes, followed by 
Dress Clothes
 and finally 
Casual Clothes
.

If the player has no Clothes in their inventory, their character appears naked (censored) or in underwear.

NOTE:
 The game will subtract a "Week of Clothing" from 
each category
 at the start of the player's 
Turn
, 
regardless of what clothes the player is visibly wearing.

| Character | Naked | Casual | Dress | Business |
| Character 1 | | | | |
| Character 2 | | | | |
| Character 3 | | | | |
| Character 4 | | | | |
| Jones | | | | |


---

# Uniform

A 
Uniform
 is the minimum level of 
Clothing
 required for the player to be able to 
Work
 at a specific 
Job
.

Each Job in the game requires the player to wear a different minimum level of Clothing. Generally speaking, low-paying jobs require only 
Casual Clothes
, mid-level jobs require 
Dress Clothes
, and high-paying jobs require a 
Business Suit
. Players are allowed to be "over-dressed" for their job, but not "under-dressed".

Failure to wear the required level of clothing (or better) results in being unable to work the current job. Players must then either buy the appropriate Clothes, or look for a different Job.

## List of Uniforms

| Location | Job | Base Wage | Accepted Uniforms |
| Casual | Dress | Business |
| Z-Mart | Clerk | $5 | | | |
| Assistant Manager | $7 | | | |
| Manager | $8 | | | |
| Monolith Burgers | Cook | $5 | | | |
| Clerk | $6 | | | |
| Assistant Manager | $7 | | | |
| Manager | $8 | | | |
| QT Clothing | Janitor * | $6 | | | |
| Salesperson | $8 | | | |
| Assistant Manager | $9 | | | |
| Manager | $12 | | | |
| Socket City | Clerk * | $6 | | | |
| Salesperson | $7 | | | |
| Electronics Repairman | $11 | | | |
| Manager | $14 | | | |
| Hi-Tech U | Janitor | $5 | | | |
| Teacher | $11 | | | |
| Professor | $20 | | | |
| Factory | Factory | $7 | | | |
| Assembly Worker | $8 | | | |
| Secretary | $9 | | | |
| Machinist's Helper | $10 | | | |
| Executive Secretary | $18 | | | |
| Machinist | $19 | | | |
| Department Manager | $22 | | | |
| Engineer | $23 | | | |
| General Manager | $25 | | | |
| Bank | Janitor | $6 | | | |
| Teller | $10 | | | |
| Assistant Manager | $14 | | | |
| Manager | $19 | | | |
| Broker | $22 | | | |
| Black's Market | Janitor | $6 | | | |
| Checker | $8 | | | |
| Butcher | $12 | | | |
| Assistant Manager | $15 | | | |
| Manager | $18 | | | |
| Rent Office | Groundskeeper | $7 | | | |
| Apartment Manager | $9 | | | |

(*) These jobs are only available in the CD-ROM version of the game.


---

# QT Clothing

QT Clothing
 is a 
Location
 where players can buy new 
Clothes
. It is also a 
Workplace

Clothes are required in order to 
Work
 anywhere. Certain jobs - especially high-paying jobs - require specific minimum 
Uniforms
 beyond the basic 
Casual Clothes
. Clothes deteriorate over time, and therefore must be purchased regularly every few 
Months
. Clothes purchased at QT Clothing cost more than those purchased at 
Z-Mart
, but also last longer. QT Clothing is the only place to purchase a 
Business Suit
.

Low-level Jobs at QT Clothing are generally desirable, but mid/high-level jobs are not; They pay less and require more expensive Uniforms than similar-level jobs elsewhere.

## Opening Hours

QT Clothing
 is open every 
Week
. You may purchase items even if the turn has ended while you're in the store.

## Items

QT Clothing
 offers all manners of 
Clothes
. All items are available every 
Week
.

Clothes purchased at QT Clothing last longer before having to be replaced than those purchased at 
Z-Mart
.

The more expensive types of Clothes provide a small bonus to 
Happiness
 when purchased.

| Item | Base Price | Lasts for... | Happiness |
| | Business Suit | $295 | 13 Weeks | +2 |
| | Dress Clothes | $125 | 13 Weeks | +1 |
| | Casual Clothes | $73 | 11 Weeks | -- |

Actual prices at QT Clothing are affected by the 
Economy
.

## Actions

### Work

If you have a 
Job
 at 
QT Clothing
, you can 
Work
 here to get money.

## Jobs

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Janitor * | $6 | 10 | 20 | -- | Casual Clothes |
| Salesperson | $8 | 30 | 30 | -- | Dress Clothes |
| Assistant Manager | $9 | 40 | 40 | Junior College | Business Suit |
| Manager | $12 | 50 | 50 | Business Administration | Business Suit |

NOTE:
 The 
Janitor
 Job at QT Clothing is only available in the CD-ROM version of the game.

## Visuals

Like most other portraits, the QT Clothing Salesperson's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to QT Clothing. We will sell you anything, no matter how bad it looks.

- 
Welcome to QT Clothing. Meet our tailor, Howie Fitzhugh!

- 
Welcome to QT Clothing. Our ties don't bind and our belts are a cinch.

- 
Welcome to QT Clothing. We have legal briefs and law suits.

- 
Welcome to QT Clothing, open 24 hours...we never clothes!

- 
Welcome to QT Clothing. Thursday is Double Shoulder Pad Day!

- 
Welcome to QT Clothing. Wear our clothes and you'll be a QT, too!

- 
Welcome to QT Clothing. The only place in the world where you can buy just 1 pant!

- 
Welcome to QT Clothing. Try on our soothing new Medicated Tux!

### Bought an Item

- 
My! Don't WE look nice today!

- 
It's the real you.

- 
Spiffy.

- 
Faaabulous!!!

- 
Our clothes are of the highest quality.

- 
Have a wonderful day!

- 
Lookin' good!

- 
You can't go wong at QT.

- 
Perhaps you should stock up now while the prices are so reasonable.

- 
With your figure, perhaps you should consider going to a tent maker.

- 
Oooh, you look good enough to eat!

- 
Don't you just love the new spring fashions? Tres magnifique!

- 
It's nice like that, just a tad tight around the bottom.

- 
Good choice...rayon is back in this year!

- 
Now what are you going to do about your HAIR?

- 
Don't forget to accessorize!

- 
Nice! It really accentuates those pectorals.

- 
You know, a little tummy tuck would take care of that slight pucker in back.

- 
Stop slouching and it won't crease across the torso.

- 
With a physique like yours, you could wear ANYthing!

- 
Let me mention just two little words. Lipo. Suction.


---

# Z-Mart

The 
Z-Mart
 (or 
Discount Store
) is a 
Location
 where players can buy various 
Items
 at discount prices. It is also a 
Workplace
.

At the start of each player's turn, 6 items are chosen at random to be put up for sale at the Z-Mart. The items are randomized again at the start of the next player's turn. Some of these items can be purchased at other stores, but will 
usually
 (not always!) be cheaper at the Z-Mart. Other items can only be purchased here.

Appliances
 bought at Z-Mart have a higher likelyhood of requiring 
Repair
.

Jobs at the Z-Mart are relatively easy to get, but the higher-paying jobs require proportionally better 
Uniforms
.

## Opening Hours

The 
Z-Mart
 is open every 
Week
. You may purchase items even if your turn has ended while you're in the store.

## Items

The 
Z-Mart
 offers a variety of different 
Items
 for sale, including both 
Durables
 and 
Consumables
 (but no 
Food
). Some of these items can only be purchased at the Z-Mart. Other items can be purchased at other stores, but are 
typically
 cheaper at the Z-Mart.

At the start of each player's turn, the items available for sale at the Z-Mart are randomized. Out of the 17 possible items, only 6 are available to purchase each turn. Once a player's turn starts, the items on sale remain the same until the start of the next player's turn.

| Item | Type | Base Price | You save... | Compared to prices at... |
| | Refrigerator | Appliance | $650 | 25% | Socket City |
| | Stove | Appliance | $490 | 14% | Socket City |
| | Stereo | Appliance | $450 | -9% (!) | Socket City |
| | Color TV | Appliance | $349 | 33% | Socket City |
| | Black & White TV | Appliance | $110 | -- | -- |
| | Microwave | Appliance | $220 | 33% | Socket City |
| | VCR | Appliance | $250 | 25% | Socket City |
| | Encyclopedia | Book | $475 | -- | -- |
| | Dictionary | Book | $70 | -- | -- |
| | Atlas | Book | $55 | -- | -- |
| | Casual Clothes | Clothing | $35 | 52% | QT Clothing |
| | Dress Clothes | Clothing | $90 | 28% | QT Clothing |
| | Baseball Tickets | Ticket | $45 | -- | -- |
| | Theatre Tickets | Ticket | $30 | -- | -- |
| | Concert Tickets | Ticket | $40 | -- | -- |
| | Dog Food | Junk | $18 | -- | -- |
| | 8-Track Player | Junk | $75 | -- | -- |
| | Works of Capote | Junk | $100 | -- | -- |

Actual prices at Z-Mart are affected by the 
Economy
. However the discount percentage (where applicable) always stays the same, relative to the price of the same item at another store.

NOTE:
 The 
Stereo
 costs a little 
more
 at Z-Mart than it does at 
Socket City
.

### Happiness

Depending on circumstances, a player purchasing an item at Z-Mart may be given a bonus or penalty to their 
Happiness
 stat.

| Item | Happiness | When? |
| Refrigerator | +1 each | Only if the player currently owns zero of the specific item being purchased. If the player purchases an item but loses it (e.g. due to Wild Willy apartment robbery or Pawning ), purchasing that same item again will award Happiness. |
| Stove |
| Stereo |
| Color TV |
| Microwave |
| VCR |
| Encyclopedia |
| Dictionary |
| Atlas |
| Black & White TV | 0 | |
| Casual Clothes |
| Dress Clothes |
| Baseball Tickets | +2 each | Only if the player hasn't already purchased the same type of ticket this Turn . The Happiness bonus is cumulative for different types of tickets, for a maximum of +6 per Turn if all three tickets are purchased. |
| Theatre Tickets |
| Concert Tickets |
| Dog Food | -1 | On each and every purchase. NOTE: All three of the items in this group are Junk items, and serve no purpose in the game besides lowering your Happiness. |
| 8-Track Player |
| Works of Capote | -2 |

## Actions

### Work

If you have a 
Job
 at 
Z-Mart
, you can 
Work
 here to get money.

## Jobs

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Clerk | $5 | 10 | 10 | -- | Casual Clothes |
| Assistant Manager | $7 | 20 | 20 | -- | Dress Clothes |
| Manager | $8 | 30 | 30 | Junior College | Business Suit |

## Visuals

Like most other portraits, the Z-Mart Clerk's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to Z-Mart. Home of low cost, low quality, and cheap help.

- 
Welcome to Z-Mart, where low prices don't always mean low quality!

- 
Welcome to Z-Mart. Our overhead is so low, the clerks are stoop-shouldered!

- 
Welcome to Z-Mart. Our overhead is so low, we hire only midgets!

- 
Welcome to Z-Mart. If we see a line with more than 50 people waiting, we'll open another!

- 
Welcome to Z-Mart, where our everyday values are other stores' remainders!

- 
Welcome to Z-Mart, where shoddy merchandise comes home to roost!

- 
Welcome to Z-Mart, where yesterday's trash is today's bargain!

- 
Welcome to Z-Mart. If you can't find it here, it must be worth having!

- 
Welcome to Z-Mart, where Quality is something we often talk about!

- 
Welcome to Z-Mart, where we've closed over 600 stores from coast- to-coast!

### Bought an Item

- 
Thank you for shopping at Z-Mart.

- 
Have a very good day!

- 
Have you checked out our red light specials?

- 
Please visit us again soon.

- 
Can I have a price check on register two please!

- 
Come back again. We have new specials each week.

- 
If you want cheap, we got it.

- 
Save some for our next...customer.

- 
Well, you get what you pay for!

- 
Check out our new shipment of Taiwanese microwave cozies!

- 
Don't forget to look in Aisle 14 for slightly irregular automotive parts!

- 
Be sure to look for our service department...and if you find it, let us know!

- 
Have you noticed our 83-piece steak knife set for only $4.95?

- 
We're having a special on dented or scratched floppy disks...only $3.50 a box!

- 
Take a look in Aisle 22 for half-price batteries. Sorry, demo models only!

- 
If you don't see what you're looking for, look underneath something else!


---

# Socket City

Socket City
 is a 
Location
 where players can buy 
Appliances
.

Appliances are 
Durable
 items, most of which give bonuses to any player who owns them. Players may also receive a 
Happiness
 bonus for purchasing an Appliance they do not own yet.

Socket City sells its Appliances at full price (compared to the discount prices at 
Z-Mart
), but the relevant Happiness bonuses are higher. Some high-end Appliances are only available here. Appliances bought at Socket City have a lower chance to require 
Repair
 each turn.

Low-paying 
Jobs
 at Socket City are 
somewhat
 easy to get, but the higher-paying jobs require a 
Degree
 in 
Electronics
. They are typically seen as a possible stepping-stone towards a cushy job at the 
Factory
.

## Opening Hours Read More

Socket City
 is open every 
Week
. You may purchase items even if the turn has ended while you're in the store.

## Items Read More

Socket City
 sells every type of 
Appliance
 except the 
Black & White TV
. All items are available every 
Week
.

A 
Happiness
 bonus is given for the purchase of a new Appliance, but only if the player currently owns zero of that specific Appliance. If the player purchases an Appliance but loses it (e.g. due to 
Wild Willy
 apartment robbery or 
Pawning
), purchasing that same Appliance again 
will
 award Happiness.

Prices at Socket City are higher than those at 
Z-Mart
 (except for the 
Stereo
, which is cheaper here). However, Appliances purchased here are less likely to require 
Repairs
, and generally provide a larger 
Happiness
 bonus.

| Item | Base Price | Happiness | Notes |
| | Refrigerator | $876 | +1 | Prevents 6 units of Fresh Food from Spoiling . Can't be stolen by Wild Willy . |
| | Freezer | $513 | +2 | Together with a Refrigerator , prevents 12 units of Fresh Food from Spoiling . Can't be stolen by Wild Willy . |
| | Stove | $570 | +1 | Gives +1 Happiness at the beginning of each turn ( not cumulative with the Microwave ). Can't be stolen by Wild Willy . |
| | Color TV | $525 | +2 | Displayed at the Security Apartment . |
| | VCR | $333 | +2 | Displayed at the Security Apartment . |
| | Stereo | $412 | +2 | Displayed at the Security Apartment . |
| | Microwave | $330 | +2 | Gives +1 Happiness at the beginning of each turn ( not cumulative with the Stove ). |
| | Hot Tub | $1255 | +3 | Prevents the Relaxation stat from decreasing each turn. |
| | Computer | $1599 | +3 | Reduces the number of Courses required to complete a Degree by -1. 1-in-7 chance each turn to make $20-$100 and receive +3 Happiness . |

Actual prices at Socket City are affected by the 
Economy
.

## Actions Read More

### Work

If you have a 
Job
 at 
Socket City
, you can 
Work
 here to get money.

## Jobs Read More

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Clerk * | $6 | 10 | 20 | -- | Casual Clothes |
| Salesperson | $7 | 20 | 30 | -- | Dress Clothes |
| Electronics Repairman | $11 | 40 | 40 | Electronics | Casual Clothes |
| Manager | $14 | 40 | 40 | Electronics Junior College | Business Suit |

NOTE:
 The 
Clerk
 Job at Socket City is only available in the CD-ROM version of the game.

## Visuals Read More

Like most other portraits, the Socket City Salesperson's face is slightly different in the CD-ROM version of the game.

## Quotes Read More

### Greetings

- 
Welcome to Socket City. If you paid full price, you must've bought it here!

- 
Welcome to Socket City. You're just in time for our Pre-Arbor Day Value Fest!

- 
Welcome to Socket City. Apply for our Revolving Algorithmic Usury Credit Line!

- 
Welcome to Socket City. Our salespeople are here to help you...spend!

- 
Welcome to Socket City. Special today on useless Yuppie electronic gadgets!

- 
Welcome to Socket City. We only charge 10% over list price!

- 
Welcome to Socket City. Go ahead and TRY to talk us down.

- 
Welcome to Socket City. Next Friday is Double Commission Day!

- 
Welcome to Socket City. Come to our Moonlight Madness sale. 20% off if you wear your pajamas!

- 
Welcome to Socket City. Values direct from the factory to the jobber to the wholesaler to us to YOU!

- 
Welcome to Socket City, Home of High Pressure Sales!

- 
Welcome to Socket City, where Quality meets its match!

- 
Welcome to Socket City, where you get less for more!

- 
Welcome to Socket City, where our Service Department never sleeps, eats or bathes!

- 
Welcome to Socket City, where the customer is always ripe!

- 
Welcome to Socket City. Where everything quits working the day after the warranty expires.

### Bought an Item

- 
Thank You very much.

- 
I'm sure that you will be very happy with your purchase.

- 
Thanks. You will have many years of trouble free service.

- 
Thank you for visiting Socket City.

- 
You sure know a deal when you see one.

- 
Come and see us again, anytime.

- 
Thank You. Let me know how you enjoy it.

- 
Perhaps I can interest you in something else.

- 
Have you seen our vacuum cleaners? They really suck!

- 
Would you like the $200 Extended Service Contract with that?

- 
You'll want the $150 Factory Extension Warranty with that, right?

- 
Can we interest you in the $300 1-Year Lifetime Replacement Guarantee?

- 
How about a $250 Extended Factory Service Warranty Replacement Guarantee Contract Agreement Deal with that?

- 
If you ever require service, you know where to go!

- 
Of course, for another $75, you could have gotten the next model up.

- 
Our free installation is only $45 today!

- 
Sorry, we only had a floor sample left, but trust me, it's in perfect condition.

- 
Remember, we offer free delivery anywhere within the game!

- 
Do you smell something burning? Oh, it's that cash in your pocket!

- 
Now that didn't hurt a bit, did it?

- 
Notice how we ignore anybody who's browsing the under-$200 items?

- 
Since you're spending, how about replacing your car stereo with an $800 Kerplunkett?

- 
Should we call the paramedics to treat your wallet for shock?

- 
Care to go double-or-nothing for that 92 inch Projection TV?

- 
Now, if I can steer you towards some of our higher-margin products...

- 
Didn't you have your eye on that complete Home Videotape Production Studio?

- 
If you're not completely satisfied, we'll be glad to give you partial credit.

- 
We're members of the Bait 'n Switch(TM) Retailer's Association!'

- 
We finance 90 Days, Same as Bankruptcy!

- 
With every purchase over $5200, we're giving away free Chapter 11 Auto-Filers!

- 
Please be aware that our Extended Service Contract excludes parts and labor.


---

# Appliances

An 
Appliance
 is a type of 
Durable Item
 that can break, requiring 
Repair
. The majority of Durables are Appliances, excluding only three types of books.

All Appliances are sold at 
Socket City
, while some are also available randomly at 
Z-Mart
 for a lower price. Appliances bought at Socket City have a lesser chance to break, but typically cost more to repair when and if they do break.

## List of Appliances

| Item | Base Price | Notes |
| Socket City | Z-Mart |
| | Refrigerator | $876 | $650 | Prevents 6 units of Fresh Food from Spoiling . Can't be stolen by Wild Willy . |
| | Freezer | $513 | -- | Together with a Refrigerator , prevents 12 units of Fresh Food from Spoiling . Can't be stolen by Wild Willy . |
| | Stove | $570 | $490 | Gives +1 Happiness at the beginning of each turn ( not cumulative with the Microwave ). Can't be stolen by Wild Willy . |
| | Color TV | $525 | $450 | Displayed at the Security Apartment . |
| | VCR | $333 | $250 | Displayed at the Security Apartment . |
| | Black & White TV | -- | $110 | |
| | Stereo | $412 | $450 | Displayed at the Security Apartment . |
| | Microwave | $330 | $220 | Gives +1 Happiness at the beginning of each turn ( not cumulative with the Stove ). |
| | Hot Tub | $1255 | -- | Prevents the Relaxation stat from decreasing each turn. |
| | Computer | $1599 | -- | Reduces the number of Courses required to complete a Degree by -1. 1-in-7 chance each turn to make $20-$100 and receive +3 Happiness . |

## Repairs

At the start of each player's turn, if that player has more than $500 in 
Cash
, there is a small chance for each 
Appliance
 in the player's inventory to break. A broken Appliance requires Repairs, automatically costing the player some money and 
Happiness
.

The chance for an Appliance to break depends on where the item was purchased:

| Place of Purchase | Chance to Break |
| Socket City | 1/51 (1.96%) |
| Z-Mart | 1/36 (2.77%) |
| Pawn Shop | 1/36 (2.77%) |

For each Appliance that breaks, the player is instantly charged a random amount of money between 1/20 to 1/4 the price originally paid to purchase the item. A notice appears on screen showing which Appliance broke, and how much money has been paid to repair it.

For each item that breaks, the player also receives 
-1 
Happiness
.

### Multiple Items

No matter how many units of a single Appliance type a player owns, only one can break each turn.

If the player owns multiple units of the same Appliance, the following rules are applied:

- 
"Place of Purchase" is the place where the last unit was purchased.

- 
"Original Price" is the price at which the last unit was purchased.

### Pawned Appliances

Appliances that are currently at the 
Pawn Shop
 - whether they are 
Redeemable
 or up for sale - cannot be broken. This applies even if the player owns multiple other units of the same Appliance, or buys additional units elsewhere while one is still pawned.

If a player redeems their own Appliance from the Pawn Shop, or buys a pawned Appliance that has gone up for sale, its behavior is reset and it can become broken again.

Buying a pawned Appliance from the Pawn Shop gives it a 1/36 chance of breaking each turn, even if it was originally bought at Socket City. However, simply Redeeming a pawned Appliance that was originally bought at Socket City will retain its 1/51 breakage chance.


---

# Durables

Durables
 are 
Items
 that stay in the player's inventory permanently, and can only be removed by rare special events. Many Durables have additional effects on the player who owns them.

Durables can be purchased at 
Socket City
 and 
Z-Mart
. Several Durables can be purchased at both stores, though Z-Mart's inventory is randomized every turn. When a Durable appears in Z-Mart, its price is 
typically
 lower.

You may purchase multiple instances of the same Durable, though only the purchase your first Durable of a particular type has a positive effect on your 
Happiness
. All instances of a single Durable type count towards the player's 
Liquid Assets
, though only one is sufficient to give the full effect on the player (if any).

Durables can be 
Pawned
, 
Redeemed
 and 
Rebought
 at the 
Pawn Shop
.

Some Durables in your inventory will be displayed in your 
Security Apartment
.

## List of Durables

| Item | Base Price | Notes |
| Socket City | Z-Mart |
| | Refrigerator | $876 | $650 | Prevents 6 units of Fresh Food from Spoiling . Can't be stolen by Wild Willy . |
| | Freezer | $513 | -- | Together with a Refrigerator , prevents 12 units of Fresh Food from Spoiling . Can't be stolen by Wild Willy . |
| | Stove | $570 | $490 | Gives +1 Happiness at the beginning of each turn ( not cumulative with the Microwave ). Can't be stolen by Wild Willy . |
| | Color TV | $525 | $450 | Displayed at the Security Apartment . |
| | VCR | $333 | $250 | Displayed at the Security Apartment . |
| | Black & White TV | -- | $110 | |
| | Stereo | $412 | $450 | Displayed at the Security Apartment . |
| | Microwave | $330 | $220 | Gives +1 Happiness at the beginning of each turn ( not cumulative with the Stove ). |
| | Hot Tub | $1255 | -- | Prevents the Relaxation stat from decreasing each turn. Can't be stolen by Wild Willy . |
| | Computer | $1599 | -- | Reduces the number of Courses required to complete a Degree by -1. 1-in-7 chance each turn to make $20-$100 and receive +3 Happiness . |
| | Encyclopedia | -- | $475 | All three items together reduce the number of Courses required to complete a Degree by -1. The Encyclopedia is displayed at the Security Apartment . None of these items can be stolen by Wild Willy . |
| | Dictionary | -- | $70 |
| | Atlas | -- | $55 |


---

# Consumables

Consumables
 are 
Items
 that go into the player's inventory when purchased, but are either immediately or gradually removed at the start of each turn, usually having some sort of effect. 
Food
 and 
Clothing
 are the two main groups of Consumables, and there are several others.

Consumables can be purchased at 
Monolith Burgers
, 
Black's Market
, 
QT Clothing
 and 
Z-Mart
, though Z-Mart's inventory is randomized every turn. The price of most consumables fluctuates with the 
Economy
, though some have a fixed price.

A player may purchase multiple instances of the same Consumable. In some cases, purchasing multiple instances makes the Consumable last longer. In other cases, all instances of the same consumable in the player's inventory are erased at the start of the next turn.

The effects of purchasing a Consumable differ greatly from one item to another. The purchase itself usually adds a small 
Happiness
 bonus, but the full effect of the item usually only takes place at the start of the player's next turn.

## List of Consumables

| Item | Sub-type | Base Price | Store | Effect |
| | Hamburgers | Fast Food | $79 | Monolith Burgers | Any purchased Fast Food item prevents Starvation for one turn. All purchased Fast Food items disappears at the start of the next turn. |
| | Cheeseburger | $89 |
| | Astro Chicken | $124 |
| | Fries | $65 |
| | Food for 1 Week | Fresh Food | $55 | Black's Market | One unit of Fresh Food is consumed at the start of each Turn , preventing Starvation for that week. Up to 6 units can be stored in a Refrigerator . An additional 6 units can be stored if the player also owns a Freezer . If the player lacks a Refrigerator or exceeds the limits, Fresh Food will Spoil , potentially causing Starvation and/or a visit to the Doctor . |
| | Food for 2 Weeks | $100 |
| | Food for 4 Weeks | $190 |
| | 10 Lottery Tickets | Tickets | $10 | Black's Market | The more Lottery Tickets are purchased, the higher the chance of winning the Lottery on the next turn, and the higher the chance of winning a larger prize. All purchased Lottery Tickets are removed at the start of the next turn. |
| | Baseball Tickets | Tickets | $45 | Z-Mart | If a player owns any of these three Tickets , the next Weekend will be a specific type with a cost of $15-$55. All Tickets of the type corresponding to that Weekend are removed, but any other types of Tickets are retained for the next Weekend. |
| | Theatre Tickets | $30 |
| | Concert Tickets | $40 |
| | Casual Clothes | Clothes | $73 | QT Clothing | The player will automatically wear their most expensive Clothes . A new set of clothes lasts only for a certain number of Weeks, whether it is worn or not. Different Jobs require a specific Uniform to allow Working there. |
| $35 | Z-Mart |
| | Dress Clothes | Clothes | $125 | QT Clothing |
| $90 | Z-Mart |
| | Business Suit | Clothes | $295 | QT Clothing |


---

# Junk

Junk Items
 are 
Items
 that have an effect on purchase, but are then immediately removed from the player's inventory. For the most part, Junk Items are simply used to give a small boost to 
Happiness
 -- though some actually give a 
penalty
.

Junk can be purchased at 
Monolith Burgers
, 
Black's Market
 and 
Z-Mart
. The price of most Junk Items fluctuates with the 
Economy
; The 
Newspaper
 has a fixed price.

A player may purchase multiple instances of the same Junk Item, but in most cases only the first purchase of each type of Junk Item has any effect. This is reset at the start of the next turn.

## List of Junk Items

| Item | Base Price | Store | Happiness | Notes |
| | Colas | $69 | Monolith Burgers | +1 | Only the first of these bought during the player's turn has any effect. Subsequent purchases have no effect whatsoever, until the next Week . |
| | Shakes | $102 | +2 |
| | Newspaper | $1 | Black's Market | -- | Shows a random newspaper headline, or repeats any headline displayed previously that turn. Wastes 1 Hour . |
| | Dog Food | $18 | Z-Mart | -1 | Happiness lost on each and every purchase. No other effects. |
| | 8-Track Player | $75 | -1 |
| | Works of Capote | $100 | -2 |


---

# Black's Market

Black's Market
 is a 
Location
 where players can buy 
Fresh Food
, 
Lottery Tickets
, and read the 
Newspaper
. It is also a 
Workplace
.

Fresh Food
 can only be stored in a 
Refrigerator
, otherwise it will 
Spoil
 and make the player 
sick
. However it can be bought in larger quantities than 
Fast Food
, and remains in your inventory from Week to Week.

The 
Lottery
 is a way to gamble for a 
Cash
 prize. The 
Newspaper
 allows tracking events, and may reveal tips about 
Stock Market
 investments.

Jobs at Black's Market are generally very desirable. Most are easy to get, and they pay well. A Job here also allows a player to purchase Fresh Food right after 
Work
, and Black's Market is very near to important late-game locations like the 
Bank
 and 
Le Security Apartments
.

## Opening Hours

Black's Market
 is open every 
Week
. You may purchase items even if the turn has ended while you're in the store.

## Items

Black's Market's
 primary sale item is 
Fresh Food
, which can be bought in groups of 1, 2, or 4 units. So long as the player owns a 
Refrigerator
, Fresh Food is consumed at a rate of 1 unit per Week, preventing 
Starvation
 until it runs out. A Refrigerator can store up to 6 units without 
Spoiling
, while a Refrigerator + Freezer can store up to 12 units. Buying Fresh Food awards 
+1 
Happiness
 per every unit purchased.

Lottery Tickets
 are bought in packs of 10, and make the player eligible to win the 
Lottery
 at the start of their next turn. The first pack bought during a player's turn awards 
+2 
Happiness
.

Reading the 
Newspaper
 is the only purchase action that requires at least 1 
Hour
 left on the clock. Each purchase of a Newspaper advances time by 1 Hour. It has no direct benefit, though it may reveal important information about the 
Economy
 and the 
Stock Market
.

| Item | Type | Base Price | Notes |
| | Food for 1 Week | Fresh Food | $55 | +1 Happiness , only on the first purchase of Fresh Food each Turn . |
| | Food for 2 Weeks | $100 | +2 Happiness , only on the first purchase of Fresh Food each Turn . |
| | Food for 4 Weeks | $190 | +4 Happiness , only on the first purchase of Fresh Food each Turn . |
| | 10 Lottery Tickets | Tickets | $10 * | +2 Happiness , only on the first purchase each Turn . |
| | Newspaper | Junk | $1 * | Displays the last headline that appeared this turn. If none appeared, displays a random headline. Requires at least 1 Hour left on the clock, and advances time by 1 Hour each purchase. |

Actual prices of 
Fresh Food
 at Black's Market are affected by the 
Economy
.

Prices for 
Lottery Tickets
 and 
Newspaper
 are fixed and will never change.

## Work

If you have a 
Job
 at 
Black's Market
, you can 
Work
 here to get money.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Janitor | $5 | 10 | 10 | -- | Casual Clothes |
| Checker | $8 | 20 | 20 | -- | Casual Clothes |
| Butcher | $12 | 30 | 30 | Trade School | Casual Clothes |
| Assistant Manager | $15 | 40 | 40 | Junior College | Dress Clothes |
| Manager | $18 | 50 | 50 | Business Admin. | Business Suit |

## Visuals

Like most other portraits, the Black Market Checker's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to Black's Market. Where quality and service are unheard of and you will stand in line forever.

- 
Welcome to Black's Market, where you can grow old in our checkout lines.

- 
Welcome to Black's Market. Our meats are a cut above!

- 
Welcome to Black's Market. You can't beat our eggs!

- 
Welcome to Black's Market, where every day is Double Coupon Day!

- 
Welcome to Black's Market. Look for our special on day-old sushi!

- 
Welcome to Black's Market. Open all day and night for your binging pleasure!

- 
Welcome to Black's Market. Lowest prices in town on pickled octopus!

- 
Welcome to Black's Market. Hey, check out those melons!

- 
Welcome to Black's Market. Our butcher loves to stop and chew the fat!

- 
Welcome to Black's Market. Don't bypass our artichoke hearts!

- 
Welcome to Black's Market. This time, please don't take home the shopping cart.

- 
Welcome to Black's Market, the grosser grocer!

- 
Welcome to Black's Market. Our Swiss Cheese is made from Hole Milk!

### Bought an Item

- 
Would you like fries with that? Oops, sorry, I usedta work at Monolith Burger.

- 
Just so you know, we saw you eating those grapes in the produce section.

- 
Cookies, ice cream and soda? Any REAL food in that shopping cart?

- 
If you wanna write a check, I need 8 forms of ID and a blood sample.

- 
You had eleven items, not ten. Next time, use the right aisle.

- 
One of your eggs is broken. Better use it quickly.

- 
Price check, please...a 5-pound box of Quintuple-Stuff Sandwich Cookies!

- 
Have you tried the Deli Department's Cheezy Sweet 'n Saurkraut Salad?

- 
Thank You. See you next time

- 
Will that be paper or plastic?

- 
Have a Good day.

- 
We appreciate your business.

- 
It's clear that you are a person who knows how to shop.

- 
I'm happy to see that you're well today.

- 
Thank you for shopping at Black's Market.

- 
Next time, give peas a chance!

- 
No tipping, please!

- 
Can we help you out to your marble?

- 
Come back for all your grocery needs!

- 
Say, two more trips and you'll have enough stamps!

- 
Hope you didn't buy any of those recalled mushrooms last week!

- 
Next time, don't dent the cans and expect a discount.

- 
Your selection of food indicates you're compensating for a lack of affection.

- 
Please be more careful with the mayonnaise in Aisle 7 next time.

- 
Arugla, Raddichio and Belgian Endive? What a yuppie!

- 
I'm sorry we were out of those little corns this week.

- 
Would you like to be a checker? OK. YOU'RE A RED ONE.

- 
Look in our Italian Pet Food section for Dog Ciao!

- 
If you can find lower prices on groceries, you're playing a different game.

- 
Check out our corn...you'll love to nibble our ears.

- 
Our celery stalks at midnight.

- 
Meet our dairy department managers, Sam 'n Ella!


---

# Monolith Burgers

Monolith Burgers
 is a 
Location
 where players can buy various types of 
Fast Food
 and 
Soft Drinks
. It is also a 
Workplace
.

Fast Food is the only way to avoid 
Starvation
 until you can buy a 
Refrigerator
, but must be bought every single 
Week
. Soft Drinks only increase 
Happiness
 for money.

Jobs at Monolith Burgers Z-Mart are very easy to get, especially the 
Cook
 job which will 
never
 reject an application. Only the highest-paying job here requires more than 
Casual Clothes
 as a 
Uniform
.

## Opening Hours

Monolith Burgers
 is open every 
Week
. You may purchase items even if the turn has ended while you're in the store.

## Items

Monolith Burgers
 offers a variety of 
Fast Food
 and 
Soft Drink
 items. All items are available every 
Week
.

Purchasing at least one Fast Food item prevents 
Starvation
 at the start of the player's next 
Turn
. The more expensive Fast Food items also provide a small bonus to 
Happiness
; Fast Food can only give one Happiness bonus per turn, no matter how many are purchased and from what types. All purchased Fast Food items disappear from the player's inventory at the start of their next Turn.

The first Soft Drink purchased during the player's Turn provides a Happiness bonus. Additional purchases that same turn do nothing. Soft Drinks do not prevent Starvation.

| Item | Type | Base Price | Happiness |
| | Hamburgers | Fast Food | $79 | -- |
| | Cheeseburger | $89 | +1 |
| | Astro Chicken | $124 | +2 |
| | Fries | $65 | -- |
| | Shakes | Soft Drink | $102 | +2 |
| | Colas | $69 | +1 |

Actual prices at Monolith Burgers are affected by the 
Economy
.

## Actions

### Work

If you have a 
Job
 at 
Monolith Burgers
, you can 
Work
 here to get money.

## Jobs

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Cook | $5 | 0 | 10 | -- | Casual Clothes |
| Clerk | $6 | 10 | 20 | -- | Casual Clothes |
| Assistant Manager | $7 | 20 | 30 | -- | Casual Clothes |
| Manager | $8 | 30 | 40 | Junior College | Dress Clothes |

## Visuals

Like most other portraits, the Monolith Burgers Clerk's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to Monolith Burger. Our Assistant Manager knows the Heimlich Manuever!

- 
Welcome to Monolith Burger. Next week, come meet Monny the Burger Clown!

- 
Welcome to Monolith Burger. You just missed Monny the Burger Clown!

- 
Welcome to Monolith Burger. Buy 'em by the bushel!

- 
Welcome to Monolith Burger. Our food is untouched by human hands, only by teenagers.

- 
Welcome to Monolith Burger. Cleanest restrooms in the game!

- 
Welcome to Monolith Burger. Free bibs with every order of Lobster Nuggets!

- 
Welcome to Monolith Burger. Try a box of Chocolate-Like(R) Cookie Shards!

- 
Welcome to Monolith Burger. Have you played our Guess the Chicken Part Game?

- 
Welcome to Monolith Burger. Special orders will take an extra 45 minutes.

- 
Welcome to Monolith Burger. Our soup today is Cream of Taco.

- 
Welcome to Monolith Burgers. Home of the Toemain Express and the Stomach Pump special.

- 
Welcome to Monolith Burgers, where we use only 100% Pure Extruded Beeflike Product!

- 
Welcome to Monolith Burgers, where even the wrappers have wrappers!

- 
Welcome to Monolith Burgers, where our Food(TM) is patented!

- 
Welcome to Monolith Burgers. Our buns are the softest!

- 
Welcome to Monolith Burgers, where our fat is always freshly rendered!

- 
Welcome to Monolith Burgers, where quality eats are in the bag!

- 
Welcome to Monolith Burgers, where our drinks have twice the ice!

- 
Welcome to Monolith Burgers, where our burgers come from contented cows!

### Bought an Item

- 
Will that be all?

- 
Would you like fries with that?

- 
Something else with that?

- 
Take some home for your family too.

- 
Have a nice day.

- 
Sounds delicious.

- 
Will that be cash or charge? Tee hee.

- 
Well, aren't WE happy today.

- 
Would you like some Thousand Isla...I mean, Secret Sauce, with that?

- 
Does your Mother know you're eating here?

- 
Incidentally, we also sell used hairnets.

- 
Our pure beef burgers have half the soybeans of the other leading brands!

- 
Would you like some deep-fried potatoes and deep-fried pie with your deep-fried sandwich?

- 
This week only: buy two burgers and get the shakes for free!

- 
You can save 45 minutes by flushing that right now.

- 
Mmmmm...that looks almost good enough to eat!

- 
We now make our sandwiches from 100% biodegradable material!

- 
Is that 'to go,' to eat here, or neither?

- 
Please dispose of trash properly!

- 
Would you like a Prepubescent Irradiated Kung Fu Tortise statuette with that?

- 
Our Manager would like you to sign a petition to abolish the Minimum Wage.

- 
Did you know there's only 45 calories per french fry?

- 
Next to disposable diapers, we're the most familiar sight on the highways!

- 
Have you tried our new Breakfast Chile Releno?

- 
This is my first job, so forgive me if I totally mess up your order.

- 
Try our new Licorice 'n Liver Shake!

- 
Did you want a handful of ketchup packets with that?

- 
Remember, if it's a 6-lb. Beefburger, it must be a Monolith!

- 
Our burgers aren't broiled OR fried...they're poached!

- 
You can find us in any town...just follow the trail of empty wrappers!

- 
Remember...NO food is better than OUR food!

- 
Would you like to take home some complimentary advertising on a placemat?

- 
Our shakes are so thick, you can't even swallow 'em!

- 
Help yourself to a piece of our new 90-foot Compressed Salad Bar!

- 
Free refills if you can finish one cup of our coffee!

## Trivia

- 
The "Monolith Burgers" fast food franchise was first featured in another Sierra On-Line game, 
"Space Quest III"
, where it was a space diner serving bizarre alien meals. "Astro Chicken" was the name of an arcade game at that diner, which was central to the plot of the game.


---

# Fast Food

Fast Food
 is a type of 
Consumable
. If a player purchases 
at least
 one Fast Food item during their 
Turn
, it prevents 
Starvation
 at the start of their next turn. All Fast Food items are then immediately removed from the player's inventory.

Additionally, some Fast Food items give a 
Happiness
 bonus. Only one such bonus can be received from Fast Food per turn.

All Fast Food is purchased at 
Monolith Burgers
.

## List of Fast Food

| Item | Base Price | Store | Happiness |
| | Hamburgers | $79 | Monolith Burgers | -- |
| | Cheeseburger | $89 | +1 |
| | Astro Chicken | $124 | +2 |
| | Fries | $65 | -- |

## Effects

### Starvation

When a new turn begins, the game scans the player's inventory for any Fast Food items.

If a Fast Food item is found, the player will not 
Starve
 this 
Week
. 
All
 Fast Food items in the player's inventory are then removed immediately - they do not carry over to the next week.

Even if Fast Food was consumed this way, if the player also has any 
Fresh Food
 in their inventory, one unit of Fresh Food will also be consumed. There is no benefit to eating both Fast Food and Fresh Food - it is wasteful. Additionally, eating Fast Food does not prevent Fresh Food from 
Spoiling
.

### Happiness

If a 
Cheeseburger
 or 
Astro Chicken
 is purchased, they give the player a 
Happiness
 bonus as listed above.

Once such a bonus is received, the player cannot receive any further Happiness bonuses from Fast Food until their next 
Turn
. Any additional Fast Food items purchased that same turn will not provide any Happiness bonus.


---

# Fresh Food

Fresh Food
 is a type of 
Consumable
. One unit of Fresh Food is consumed at the start of a player's 
Turn
, preventing 
Starvation
 that Week. Fresh Food will 
Spoil
 if the player does not have a 
Refrigerator
 (or exceeds a certain limit), costing 
Happiness
 and possibly sending the player to the 
Doctor
.

Fresh Food can only be purchased at 
Black's Market
. Each unit of Fresh Food purchased provides 
+1 
Happiness
, but only if this was the first Fresh Food purchase made this Turn. Multiple units purchased as a "pack" are cheaper than purchasing single units.

## List of Fresh Food

| Item | Base Price | Store | Happiness |
| | Food for 1 Week | $55 | Black's Market | +1 |
| | Food for 2 Weeks | $100 | +2 |
| | Food for 4 Weeks | $190 | +4 |

## Effect

As long as the player owns a 
Refrigerator
 and has any amount of 
Fresh Food
 in their inventory at the start of their 
Turn
, one unit of Fresh Food is consumed and the player avoids 
Starvation
 this 
Week
.

Eating 
Fast Food
 during the Week does not prevent Fresh Food from being consumed the following week.

### Spoiled Food

If the player does not own a Refrigerator at the start of their turn, all Fresh Food in their inventory spoils immediately. A notice pops up on the screen to announce this. This event causes all Fresh Food to be removed from the player's Inventory. The player suffers 
-2 
Happiness
. If the player didn't purchase any 
Fast Food
 during the previous Week, they will 
Starve
. If the player has any 
Cash
, they also have a 50% chance of having to visit the 
Doctor
.

If the player owns a Refrigerator, but has more than 6 units of Fresh Food in their inventory at the start of their turn, all but 6 units of Fresh Food will spoil and be removed from the inventory. The player suffers 
-1 
Happiness
 for this. However, they still consume one unit of the remaining Fresh Food and avoid Starvation.

If the player owns both a Refrigerator and a 
Freezer
, they can store up to 12 units of Fresh Food in their inventory without it spoiling. Any units above 12 will spoil at the start of the turn and be removed from the inventory, causing 
-1 
Happiness
. One unit of Fresh Food is then consumed, and the player avoids Starvation.


---

# Soft Drinks

Soft Drinks
 are a type of 
Junk Item
 sold at 
Monolith Burgers
. The first Soft Drink purchased during a player's turn gives a small bonus to 
Happiness
.

Soft Drinks have no additional effect after purchase, and are not added to the player's inventory.

## List of Soft Drinks

| Item | Base Price | Store | Happiness |
| | Shakes | $102 | Monolith Burgers | +2 |
| | Colas | $69 | +1 |

## Effects

The effect of 
Soft Drinks
 is very simple: The 
first
 Soft Drink bought by a player during their turn provides the 
Happiness
 bonus listed above. Additional Soft Drinks purchased during that same turn do nothing.

Soft Drinks disappear when bought; They do not have any lingering effect, they do not prevent 
Starvation
 like 
Fast Food
 does, and they are not added to the player's inventory. Purchasing more than one Soft Drink per turn is wasteful.


---

# Starvation

Starvation
 is an event that occurs at the start of a player's 
Turn
 if they've failed to purchase any food during the previous turn.

## Triggering Starvation

Starvation is triggered at the start of a player's 
Turn
 if 
neither
 of the following conditions is true:

- 
The player purchased at least one 
Fast Food
 item during their previous Turn.

- 
The player has at least one 
Week
's worth of 
Fresh Food
 in their inventory.

If either condition is 
true
, Starvation will not occur.

## Effects

If Starvation occurs, the game displays a notice alerting the player that they have starved.

The clock at the bottom of the screen advances by 20 
Hours
. The player also suffers 
-2 
Happiness
.

Starvation has a 25% chance of sending the player to the 
Doctor
. This would advance the clock by another 10 Hours, and costs the player a random sum of money.

Note:
 Purchasing any amount of 
Fresh Food
 without owning a 
Refrigerator
 will keep a player fed for exactly 1 Week. At the start of the player's turn, all Fresh Food will spoil. They will not Starve that turn, but have a very high chance of having to visit the Doctor.


---

# Relaxation

Relaxation
 is a player 
Stat
, as well as an action that can be performed at the player's 
Apartment
 to increase that Stat.

Raising the Relaxation stat prevents 
Doctor
 visits, and helps reduce the chance of 
Wild Willy
 robbing the 
Low-Cost Apartments
. Relaxing also increases 
Happiness
, but only once per turn.

A player's Relaxation drops gradually over time, unless the player owns a 
Hot Tub
.

## Relaxation Stat

Each player has a 
"Relaxation"

Stat
 that is set to 10 at the start of the game.

The Relaxation stat can only be increased by Relaxing at the player's current 
Apartment
, to a maximum of 50.

The Relaxation Stat 
decreases by -1 point
 at the start of each 
Turn
, unless the player own a 
Hot Tub
 (in which case the stat will not decrease at all). Relaxation can never drop below 10.

## Relaxation Action

The Player can 
Relax
 at their 
Apartment
 by clicking the "Relax" button.

Relaxing takes 
6 
Hours
. Since this action costs time, it only works if the 
Turn
 has not yet ended, otherwise the button will do nothing.

Each time a player Relaxes, their Relaxation stat is 
increased by +3 points
, to a maximum of 50.

The first time a player relaxes in any given Turn, they also get 
+2 
Happiness
 points
. Relaxing again during the same turn will not increase Happiness.

## Effects

### Doctor Visit

If a player's 
Relaxation
 stat is at 10 (the minimum) at the start of any 
Turn
, they stand a 25% chance of having to visit the 
Doctor
, wasting 10 
Hours
 of time and costing up to 
$200
. They also lose 
-4 
Happiness
 points
 if this occurs.

### Apartment Robbery

At the start of each 
Turn
, a player living at the 
Low-Cost Apartments
 who owns any 
Durables
 has a chance for their apartment to be robbed by 
Wild Willy
.

The chance of this happening is directly related to the "Relaxation" stat:

C

h

a

n

c

e

o

f

A

p

a

r

t

m

e

n

t

R

o

b

b

e

r

y

=

1

R

e

l

a

x

a

t

i

o

n

S

t

a

t

+

1

{\displaystyle Chance \ of \ Apartment \ Robbery = {1 \over Relaxation \ Stat + 1 }}

If this event occurs the player suffers 
-4 
Happiness
, and may lose any number of Durables.


---

# Weekend

The 
Weekend
 is the time between a player's 
Turns
. At the very start of a player's Turn, the game reports what that player did during the Weekend, and how much money they spent on said activity.

Weekends and their prices are selected at random, although they are influenced greatly by various factors such as 
Durables
 owned or 
Tickets
 purchased. The maximum price of a Weekend also increases after several 
Weeks
 have passed in the game.

Once a Weekend and its Price have been selected, they are displayed on the screen. Pressing the "Done" button proceeds with the start-of-turn events (e.g. 
Starvation
, 
Repairs
, 
Rent
 notices, etc.), after which the player gets control and begins their actual turn.

## Selecting a Weekend

The process of selecting a Weekend is an algorithm that scans the player's inventory to determine whether their items influence (or directly set) which Weekend will be selected. If no relevant items are found, the game simply picks a random Weekend out of a limited pool.

### Tickets

If the player has any 
Tickets
 in their inventory (except 
Lottery Tickets
), these tickets will 
force
 a specific weekend to occur.

The game prioritizes 
Baseball Tickets
 first, followed by 
Theatre Tickets
, and finally 
Concert Tickets
. Each of these has its own specific Weekend text.

If a Ticket was found and triggered its Weekend, all instances of that specific type of Ticket are removed from the player's inventory. Other Ticket types, if present, are untouched. 

For example
, if the player buys Baseball Tickets and Concert Tickets on the same turn, they will go to a baseball game on the next Weekend (removing all Baseball tickets from their inventory), and then go to a Concert the Weekend after that (removing all Concert tickets from their inventory).

### Durables

If no Tickets were found in the player's inventory, the game will then go through each and every 
Durable
 owned by the player to see if any of them will trigger a specific Weekend.

Each type of Durable in the player's inventory has a 20% chance of triggering its own special Weekend - so long as it hadn't triggered the 
previous player's
 Weekend. 

For example
, if a player owns a 
Microwave
, there's a 20% chance to trigger a microwave-specific Weekend. If the next player in line also owns a Microwave, their Microwave 
cannot
 trigger its specific weekend at the start of their turn.

### Random Weekend

If no Tickets were found and no Durables triggered their specific Weekends, the game will simply choose one of the 42 other available Weekends at random. The 
Floppy Disk version
 has 44 Random Weekends available.

If any Random Weekend is selected, it cannot be selected again at the start of the 
next player's
 turn.

Note:
 Random Weekend #42, if selected, awards the player with a random amount of 
Happiness
 between +2 and +4. In the 
Floppy Disk version
, this applies to Weekends #42 to #44.

## Prices

When a Weekend is selected, the game also chooses a specific price range for this Weekend. It selects a price at random within that range, and charges the player accordingly.

There are three different Price Ranges: Cheap, Medium, or Expensive.

The player is never forced to pay more money than they have - but can drop to $0 if the Weekend costs as much or more than their current 
Cash
.

If the player has no Cash at the start of their turn, their Weekend will cost $0.

### Cheap Weekends

A Cheap Weekend costs anywhere between $5 and $20.

All 
Durable
-specific Weekends are Cheap Weekends.

The first 28 
Random Weekends
 are also Cheap Weekends.

### Medium Weekends

A Medium Weekend costs anywhere between $15 and $55.

Up to and including the 7th 
Week
 of the game, all Weekends that are not Cheap Weekends are Medium Weekends.

From Week #8 onwards, only 
Ticket
-specific Weekends and Random Weekends #29 through #36 are Medium Weekends.

### Expensive Weekends

An Expensive Weekend costs anywhere between $50 and $100.

From Week #8 onwards, Random Weekends #36 through #42 are Expensive Weekends. Until then, they are Medium Weekends.

In the 
Floppy Disk version
, Random Weekends #36 through 
#44
) are always Expensive.

## List of Weekends

### Ticket-Specific Weekends

| Ticket | Text | Price |
| Baseball Tickets | You went to the baseball game this weekend and ate hotdogs till you puked. | Medium |
| Theatre Tickets | You went to the theatre this weekend and saw the one MAN version of Cats. | Medium |
| Concert Tickets | You had front row seats at a rock concert. The doctor said that the hearing loss shouldn't be permanent. | Medium |

### Durable-Specific Weekends

| Durable | Text | Price |
| Refrigerator | You spent the whole weekend watching some of the food in your refrigerator grow mold and spores. It sure was fun. | Cheap |
| Freezer | You spent the whole weekend watching the water in your refrigerator freeze. | Cheap |
| Stove | You spent the whole weekend baking oatmeal cookies. | Cheap |
| Color TV | You spent the entire weekend watching Star Trek reruns. | Cheap |
| VCR | You rented some movies and ate artificially flavored buttered popcorn. | Cheap |
| Stereo | You spent the weekend playing your stereo and patching the plaster your speakers cracked. | Cheap |
| Microwave | You spent the weekend cleaning your microwave after you tried to dry your pet rat in it. You also need a new pet rat. | Cheap |
| Hot Tub | You and some friends had a hot tub party this weekend. | Cheap |
| Computer | You played games on your computer all weekend. | Cheap |
| Black & White TV | You watched CELEBRITY INCOME TAX EVASION on TV this weekend. | Cheap |
| Encyclopedia | You read all about the mating habits of the North American computer programmer in your encyclopedia. | Cheap |
| Dictionary | You read your dictionary all weekend. Boy, was that fun. | Cheap |
| Atlas | You read your atlas and committed the population of 43 countries to memory. OH WOW!!! | Cheap |

### Random Weekends

| # | Text | Price |
| 1 | You watched them change the mannequins at QT Clothing this weekend. | Cheap |
| 2 | You washed and waxed your marble this weekend right before it rained. | Cheap |
| 3 | You stayed home and did absolutely nothing this weekend. | Cheap |
| 4 | You spent the weekend hiking around Yosemite. | Cheap |
| 5 | You listened to the Talking Bear 256 times this weekend. | Cheap |
| 6 | You read the 'Wall Street Journal' this weekend. | Cheap |
| 7 | You thought about what you would do on your next turn. | Cheap |
| 8 | You spent the weekend in a hotel because they had to fumigate your apartment. | Cheap |
| 9 | You played in a ping pong tournament this weekend. | Cheap |
| 10 | You pitched horseshoes in your apartment all weekend. The people downstairs love you. | Cheap |
| 11 | You sat around and played solitaire all weekend. | Cheap |
| 12 | You went panning for gold this weekend, but all you got was wet. | Cheap |
| 13 | You spent the weekend in the laundromat washing your clothes. Now that was exciting. | Cheap |
| 14 | You took a friend out to a cheap restaurant this weekend. | Cheap |
| 15 | You went out and caught your own froglegs this weekend. | Cheap |
| 16 | You crawled around on your knees chasing snails this weekend. | Cheap |
| 17 | You spent your weekend thinking about work. Eccch. | Cheap |
| 18 | You spent your weekend trying to remove the mildew between the shower tiles. | Cheap |
| 19 | You spent the weekend listening to the newlyweds in the next apartment set up a new waterbed. | Cheap |
| 20 | This weekend, you won first prize in a beauty contest and collected $10. Whoops, wrong game. | Cheap |
| 21 | This weekend, you closed your curtains, locked your doors, turned off the lights, and ate presweetened morning breakfast cereal, with little marshmallows! | Cheap |
| 22 | You played stickball this weekend with the neighborhood kids and ended up wrenching your back and spraining your ankle. | Cheap |
| 23 | You read a romance novel, NURSE'S TURN TO CRY, in one sitting. | Cheap |
| 24 | You took a long hot bath this weekend and emerged looking like a California Raisin. | Cheap |
| 25 | You watched a torrid romance movie, LIBRARIAN'S DILEMMA, this weekend. | Cheap |
| 26 | One of your fillings came loose this weekend. It's a good thing you're handy with a soldering iron. | Cheap |
| 27 | You spent the weekend examining yourself under the fluorescent lights in the bathroom. Eccch! | Cheap |
| 28 | You spent the weekend wondering if black holes were lit with black lights. | Cheap |
| 29 | This weekend, you hung out at the mall, filled up on junk food, and made your mother ashamed of you. | Medium |
| 30 | You went bowling with friends this weekend. | Medium |
| 31 | You played two rounds of golf this weekend. | Medium |
| 32 | This weekend, you had to bail your nephew out of jail. | Medium |
| 33 | You had your marble repainted this weekend. | Medium |
| 34 | You played in a volleyball tournament this weekend. | Medium |
| 35 | You took a friend out to an expensive restaurant this weekend. | Medium |
| 36 | You went to San Diego to play in the Over The Line Tournament. | Expensive* |
| 37 | You went to Las Vegas in a $20,000 car and came back in a $200,000 Greyhound bus. | Expensive* |
| 38 | You tried to drive to Hawaii to watch a surfing contest. | Expensive* |
| 39 | You went scuba diving in La Jolla. | Expensive* |
| 40 | You went deep sea fishing this weekend. | Expensive* |
| 41 | You volunteered to take the local scouts to Disneyland. | Expensive* |
| 42 | You drove the senior citizens' bus this weekend and they drove you - crazy. | Expensive* |

(*) Before Week #8, all Expensive weekends are Medium price. This rule applies only in the 
CD-ROM version
.

### Floppy Disk Version

The 
Floppy Disk version
 had two additional Random Weekends that for some reason were made impossible to pick in the 
CD-ROM version
. Both of these grant 
+2 to +4 
Happiness
 if picked.

| # | Text | Price |
| 43 | You helped several little old ladies cross the street to get to their aerobics class. | Expensive |
| 44 | You visited a sick friend in the hospital. REALLY! | Expensive |


---

# Newspaper

The 
Newspaper
 is a 
Junk
 item. It can be purchased from 
Black's Market
 for $1 (fixed price).

Buying a Newspaper from Black's Market requires at least 1 
Hour
 remaining on the clock. It advances time by 1 Hour on purchase.

A free Newspaper is also automatically received at the start of the turn, if a serious 
Economic
 event occured this 
Turn
. This does not cost time to read.

Similarly, a Newspaper is provided if the player's 
Apartment
, or the player themselves, are robbed by 
Wild Willy
.

## Effect

When a 
Newspaper
 is purchased (or received at the start of a turn), the game displays the front page of the Daily News newspaper on the screen.

The headline of the Newspaper is selected at random at the start of the turn. However, if a major 
Economic
 event happens this turn, or if the player is robbed by 
Wild Willy
 during the turn, the headline will change to report that instead.

Unless the player is robbed by Wild Willy, the headline remains the same until the end of the 
Turn
. Purchasing multiple Newspapers in the same turn simply repeats the same headline over and over.

## List of Headlines

### Specific Events

These headlines describe an event that occurred this turn. They supersede the Random Headlines (see next subsection).

| Headline | Event |
| INFLATION IS UP! PRICES COULD SOAR! | Indicates that a Economic Boom has occurred. |
| MORE S & L'S FAIL! ECONOMY SUFFERS | Indicates that a minor Market Crash has occurred. |
| SCANDAL ON WALL ST. ECONOMY DROPS! UNEMPLOYMENT RISES | Indicates that a moderate Market Crash has occurred. |
| BANKS FALTER! SAVINGS LOST! JOBS LOST! | Indicates that a major Market Crash has occurred. |
| WILD WILLY RIPS OFF ANOTHER APARTMENT | If the player's Apartment has been robbed by Wild Willy . |
| WILD WILLY HAS LIFTED ANOTHER WALLET | If the player has been robbed by Wild Willy outside the Bank or Black's Market . |

### Random Headlines

| Headline | Notes |
| PRESIDENT HATES BROCCOLI | George H.W. Bush, President of the United States in 1990, had a well-known dislike for Broccoli. This was during a time when the vegetable was becoming more popular. |
| MORE FAST FOOD PLACES USING SOYBEANS | |
| SCHOOL ENROLLMENT UP | |
| SCHOOL ENROLLMENT DOWN | |
| THERE IS MONEY IN COMPUTERS | Owning a Computer does indeed give you a small chance of making extra money each turn. |
| HOUSING MARKET LOOKS GOOD | |
| SALES OF NEWSPAPERS HAVE SKYROCKETED | You just bought one! |
| PAWN SHOPS SERVE USEFUL PURPOSE | |
| NORTH SHORE OF BASS LAKE SINKS | Bass Lake is a lake in Yosemite National Park, very close to Sierra On-Line's offices at Oakhurts, CA. |
| ALICE COOPER GIVES BIRTH TO TWIN BOYS | Alice Cooper is a male Rock/Metal musician. |
| COARSEGOLD PURCHASED BY JAPAN | Coarsegold, CA is the next town from from the Sierra On-Line offices at Oakhurst. |
| SPACE QUEST III WINS BIG AWARD | Space Quest III is another game by Sierra On-Line. |
| ELVIS SIGHTED AT KFC IN OAKHURST | Oakhurst, CA was the location of Sierra On-Line's offices. |
| TALKING BEAR KIDNAPPED! FBI INVESTIGATING | |
| KINGS QUEST XXIX GOES TO PRODUCTION | King's Quest was Sierra's longest-running series in 1990, with 5 installments. |
| MR. WHIPPLE FOUND SQUEEZED TO DEATH IN APARTMENT | Mr. Whipple was a mascot for "Charmin" toilet paper, who would squeeze toilet rolls in secret while publicly scolding others for doing so. |
| REAGAN'S NAP INTERRUPTS SPEECH | Ronald Reagan was President of the United States in the 1980s. Symptoms of his advanced age were already showing at the time. |
| MOTHER GOOSE GETS DIVORCE! FEATHERS RUFFLED | |
| MOTHER GOOSE SUSPECTED OF FOWL PLAY | |
| SALMON BITING OFF NORTH SHORE OF BASS LAKE | Salmon and Bass are two different types of fish. Bass Lake is a lake in Yosemite National Park, very close to Sierra On-Line's offices at Oakhurts, CA. |
| NIXON MAKES ROCK VIDEO | Nixon was President of the United States in the 1970s. |
| FORD STUMBLES ON CURE | Gerald Ford was President of the United States in the late 1970s. He was infamous for physically stumbling and falling. |
| NEW GOVT STUDY SHOWS GAME PLAYERS GET SICK TOO! | |
| IMELDA M. LOOKING FOR A FEW GOOD SHOES | Imelda Marcos was the wife of the President of the Philippines. She was known for owning a collection of thousands of shoes. |
| NANCY IS LOOKING FOR A NEW DRESS | Nancy Reagan was First Lady of the United States in the 1980s. She owned a very large collection of expensive designer dresses. |
| TYpEsETTrs U ion shr ds Agre mNt! | |
| FIREMEN ARE ALWAYS IN HEAT | |
| PRESIDENT FINALLY EATS BROCCOLI | George H.W. Bush, President of the United States in 1990, had a well-known dislike for Broccoli. This was during a time when the vegetable was becoming more popular. |
| PRESIDENT EATS BROCCOLI AND LIVES! | George H.W. Bush, President of the United States in 1990, had a well-known dislike for Broccoli. This was during a time when the vegetable was becoming more popular. |
| STUDY SHOWS WE HAVE MORE LEISURE TIME | |
| EXTRA! EXTRA! | A cliche phrase shouted by Newsies in period-piece movies when they try to sell newspapers. Usually followed by the actual headline of the day, but not in this case. |
| TORNADO KILLS 8 THEN COMMITS SUICIDE! | An amalgamation of a headline about killer tornados and violent shooting sprees. |
| CIGARETTES FOUND TO CAUSE LABORATORY ANIMALS! | Typical headlines of the period would often tout that cigarettes had been found to cause something in Laboratory Animals. Here, that something was removed. |
| COURTS JAMMED! WAPNER REINSTATED! | Joseph Wapner was a California judge who retired in order to preside over the world's first courtroom Reality TV show "The People's Court" during the 1980s. |
| GRAND CANYON DESIGNATED NATIONAL LANDFILL! | |
| CELEBRITY BULLFIGHTING DISASTER; LESLEY GORED | Lesley Gore was an American singer, with several famous popular songs like "It's My Party". |
| GURUKA SINGH GETS HAIRCUT! PHOTOS UNDER WRAPS! | Guruka Singh Khalsa, producer of Jones in the Fast Lane , is a practicing Sikh and wears a Dastar (a head wrap) at all times. |
| RAP GROUP ARRESTED FOR NOT STARTING RIOT! | |
| TRAILER PARK DEMOLISHES 6 TORNADOES! | A reversal of a common news headline. |


---

# Bank

The 
Bank
 (full name: 
Pacific International Grand Gratuity Yield Bank
) is a 
Location
 where players can store their 
Cash
, apply for a 
Loan
, or invest in the 
Stock Market
. It is also a 
Workplace
.

Depositing money in the Bank is a safe way to protect your 
Liquid Assets
 against 
Wild Willy
, though savings could get wiped out during a 
Market Crash
.

Loans can serve as a good way to get a lot of money very quickly (e.g. for buying an expensive 
Appliance
 or paying 
Rent
), though a good 
Job
 is necessary to get a loan of any substance. Payments must be made at the Bank itself every 
Month
 to avoid defaulting.

The Stock Market is an interesting way to accumulate money, but requires time and attention to the 
Economy
. Sudden Market Crashes can destroy investments as well.

Jobs at the Bank pay well, and are some of the best-paying jobs in the game - but most require a substantial 
Education
 and expensive 
Uniform
.

The Bank is one of two Locations where 
Wild Willy
 can rob the player's 
Cash
 as they leave. The other is 
Black's Market
.

## Opening Hours

The 
Bank
 is open every 
Week
, but most of its functions (with the exception of depositing/withdrawing money) require at least 1 
Hour
 remaining on the clock.

## Bank Account

Whenever a player is at the Bank, they may deposit 
Cash
 into their Bank Account, or withdraw cash from it. This is possible even if the clock has run out of time.

Cash is deposited into one's Account in $100 portions, and is withdrawn in the same manner. There is no limit to the amount of money a Bank Account can store.

Money in the Bank Account counts toward's a player's 
Liquid Assets
, and thus counts towards the 
Wealth Goal
. However it cannot be spent directly from the account.

There is no extra fee to deposit or withdraw money, nor to keep money in the Account for any period of time. Similarly, there is no interest accrued for money kept in a Bank Account.

Money in the Account cannot be stolen by 
Wild Willy
. However, withdrawing a large amount of money in Cash is very risky because Wild Willy often strikes right outside the Bank itself.

Money in the Bank Account is not 100% safe. A particularly severe 
Market Crash
 can wipe out all money in the account instantly (setting it to $0). This sort of event is typically much rarer than a Wild Willy robbery, but it has a non-zero chance of happening each turn. The weaker the Economy, the riskier it is to keep money in a Bank Account.

## Loans

A 
Loan
 is an amount of money given to a player by the 
Bank
, with the promise of paying it back (plus interest) over time.

Players may apply for a Loan at the Bank if there is at least 1 
Hour
 left on the clock. Applying for a loan advances the clock by 2 Hours.

A Loan Application can be rejected by the Bank if the player's current 
Wage
 and 
Liquid Assets
 are very low. The amount of money loaned to the player also depends on these two values; The more money a player makes and the more money they have, the larger the loan they can receive.

Once a loan has been approved and the money received, the player is reminded to pay it off on the last 
Week
 of every 
Month
, until the entire debt is cleared. Players may pay back part (or all) of the loan whenever they want, but making at least one payment before the end of the Month will avoid 
Defaulting
 on the loan. Additional payments in the same Month will delay the next payment deadline by a whole Month.

Each payment is equal to $45, but incurs an additional $5 interest fee that is paid to the Bank instead of decreasing the debt.

Each time a player Defaults on a loan, their chance to get any future Loans (and the amount of money they would get if approved) decreases permanently. However, if the player does not intend to ever get another loan, they may completely avoid paying back their current loan -- though they will lose a little bit of 
Happiness
 every Month.

The amount of money owed to the Bank counts 
against
 a player's 
Liquid Assets
.

## Stock Market

The 
Stock Market
 can be accessed from the 
Bank
 menu by clicking the "See the Broker" option.

The Stock Market allows a player to purchase and sell 
Stocks
. Stock prices rise and drop with some correlation to trends in the 
Economy
, though they do not match it like 
Item
 prices and 
Wages
. This allows players to essentially gamble on Stock prices, buying low and selling high.

Stock investments count towards a player's 
Liquid Assets
, and cannot be completely wiped out by a 
Market Crash
 (though they can easily lose a lot of their value). This makes Stocks one the most secure way to keep 
some
 amount of liquid assets from disappearing instantly, especially if the stocks are bought when their price is already extremely low.

## Wild Willy

Each time a player leaves the 
Bank
, there is a 1/31 chance that they will be mugged by 
Wild Willy
.

This event cannot happen before 
Week
 #4, and will only occur if the player is carrying any amount of 
Cash
.

Once robbed by Willy, the player's Cash is set to $0, and they lose 
-3 
Happiness
.

## Work

If you have a 
Job
 at the 
Bank
, you can 
Work
 here to get money.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Janitor | $6 | 10 | 20 | -- | Casual Clothes |
| Teller | $10 | 40 | 40 | Junior College | Dress Clothes |
| Assistant Manager | $14 | 50 | 50 | Business Admin. | Business Suit |
| Manager | $19 | 60 | 60 | Business Admin. | Business Suit |
| Broker | $22 | 70 | 70 | Business Admin. + Academic | Business Suit |

## Visuals

Like most other portraits, the Bank Teller's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. We take very little interest in you.

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. You'll always find yourself a loan here!

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. No charge for deposits!

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Tuesdays are Double Dollar Days!

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Have you gotten your free Toast Point Tongs?

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our fixed-rate CDs spin at 1500 RPM!

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. This little P.I.G.G.Y. plays the market!

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Where we do Savings and Loans without a crisis!

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our loan officers are real Yes-men!

- 
Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our San Andreas branch is in default!

### Withdrawing Cash

- 
There is always a penalty for early withdrawal.


---

# Loans

A 
Loan
 is a sum of money given to the player by the 
Bank
, with the promise to pay it back (with interest) over time.

To get a loan, the player must have at least a bit of personal wealth to back it up. Otherwise the request for a Loan can be refused by the Bank. The amount of money loaned to the player is also based on their personal wealth.

Payments must be made regularly by the end of the 
Month
, though players can pay in advance to push the deadline back further. A player may pay back their entire loan all at once, if they wish.

Failure to pay on time results in a slight loss of 
Happiness
, but the Bank will not attempt to collect forcibly. Instead, failing to pay one's loan debt only results in lower chance to get additional loans in the future.

## Applying for a Loan

To get a 
Loan
, the player must visit the 
Bank
 and click "Apply for a Loan". Clicking this option advances the clock by 2 
Hours
. It does nothing if the player's Turn is already over.

Once the button is clicked, the Bank has to decide whether to approve the loan. This is done by weighing two factors against each other: The player's 
Liquidity
 and their 
Risk Factor
 (both explained below).

If a player's Liquidity is 
less than or equal to
 their Risk, or if the player is currently in 
Default
 on an existing loan, the loan will be rejected. This gives the player 
-1 
Happiness
.

If a player's Liquidity is 
greater than
 their Risk, the loan will be approved. The player receives a certain amount of 
Cash
 immediately (see 
next chapter
), as well as 
+5 
Happiness
. The first Loan Payment is set to be due at the start of the next 
Month
.

### Liquidity

Liquidity
 is a rough measurement of the player's capability to pay back a Loan, based on their current financial situation and estimated wealth.

Liquidity is based entirely on the player's current 
Wage
 and their 
Liquid Assets
. Therefore getting a better job, and/or accumulating more money, increase the chance to be approved for a loan.

L

i

q

u

i

d

i

t

y

=

C

u

r

r

e

n

t

W

a

g

e

+

L

i

q

u

i

d

A

s

s

e

t

s

1000

{\displaystyle Liquidity=Current\ Wage+{Liquid\ Assets \over 1000}}

### Risk Factor

Risk
 is a rough measurement of the player's unlikelihood to pay back a loan on time, as demonstrated by their past behavior with previous Loans.

If the player has never taken a Loan before, or has paid back all previous loans without 
Defaulting
, their Risk factor 
is equal to 5
.

If the player currently 
has
 a loan, or has Defaulted on a loan at any point in the game, the formula is more complicated:

R

i

s

k

F

a

c

t

o

r

=

5

+

T

i

m

e

s

D

e

f

a

u

l

t

e

d

s

o

f

a

r

+

C

u

r

r

e

n

t

L

o

a

n

D

e

b

t

100

+

(

1

i

f

C

u

r

r

e

n

t

D

e

b

t

>

0

)

{\displaystyle Risk\ Factor=5+{Times\ Defaulted\ so\ far}+{Current\ Loan\ Debt \over 100}+(1\ if\ Current\ Debt>0)}

Thus, currently 
having
 a loan makes it less likely to get more loan money until the debt is fully paid; whereas the more times you Default on a Loan the harder to get loans in the future altogether.

## Loan Size

The amount of Loan money given to the player changes based on their current circumstances. It is equal to their 
Liquidity
 minus their 
Risk Factor
, multiplied by 100.

L

o

a

n

S

i

z

e

=

$

100

×

(

L

i

q

u

i

d

i

t

y

−

R

i

s

k

)

{\displaystyle Loan\ Size={\$100\times (Liquidity-Risk)}}

The result is reported to the player before they apply for the Loan.

## Loan Payments

At any time, the player may go to the 
Bank
 to pay back part or all of their Loan Debt.

To make a Loan Payment, the player must have at least $50 in 
Cash
, or as much as is left in their Loan Debt (whichever is lower). Click the "Loan Payment" button to make the payment. You can do this even if the clock has already run out.

Each click of the "Loan Payment" button removes $50 from the player's Cash. $45 are deducted from their Loan Debt, while $5 are paid to the Bank as an Interest Fee.

If the player's current Loan Debt is smaller than $50, that entire amount will be paid and the Debt will be completely cleared. No Interest Fee is paid in this case.

So long as the debt is 
not
 fully cleared, each Loan Payment pushes the deadline for the next loan payment forward by four 
Weeks
 (one 
Month
). Therefore, the player can make multiple Loan Debts to push the deadline forward so they don't have to worry about going to the Bank any time soon.

At the start of the player's 
Turn
 on the fourth Week of every Month, if the player has any Loan Debt remaining they receive a notice stating that their debt is "Payable". Failing to make at least one Loan Payment 
by the end of that Turn
 will result in the player 
Defaulting
 on their loan. This impacts their chance to get additional Loans in the future (see 
Risk Factor
, above).

## Loan Default

If a player's loan payment is due (on the fourth 
Week
 of the 
Month
) and they do not make any Loan Payments by the end of that same turn, they are said to have "
Defaulted
" on their Loan.

Once a player is in Default, if they keep withholding payments to the Bank they'll receive a more urgent message on the fourth Week of the coming Month indicating that they are delinquent in their payments. This message comes with a penalty of 
-1 
Happiness
. The player will Default 
again
 if they do not make a payment by the end of that same turn.

This situation continues until the player makes one Loan Payment 
for each month they've missed
. If they make those payments, they are no longer considered to be in Default.

If the player is 
currently
 in Default, any Loan applications will automatically be rejected by the bank.

The game keeps track of the number of times a player has Defaulted since the start of the game. This counter never decreases. The number of times the player has Defaulted so far is taken into account as part of their 
Risk Factor
. This makes it harder to get Loans in the future (even after the player has repaid all of their Debts), and reduces the amount of money the Bank is willing to pay out for each Loan, as explained in the previous chapters above.


---

# Stocks

The 
Stock Market
 is a sub-
Location
 that is only accessible from the 
Bank
. Here you can view the price of different Stocks, and buy and sell those stocks for (hopefully) profit.

The price of different Stocks is affected to some extent by the 
Economy
, but is not directly clamped to it like 
Item
 Prices, 
Wages
, or 
Rent
 prices. Instead, Stocks will 
trend
 towards the Economic Index, but fluctuate around it.

There is no way to view exact Stock prices except visiting the Bank, and a visit to the "Broker" takes even more time, so trading Stocks each week costs time. However, properly trading Stocks can double or triple a player's Wealth (or more!) within a very short timeframe, if they're lucky. 

Investing in T-Bill Stocks is the safest way to store money, since they cannot be robbed by 
Wild Willy
 (unlike 
Cash
), cannot be wiped out by a 
Market Crash
 (unlike Bank Deposits), and always count towards the player's 
Liquid Assets
 (unlike 
Durables
). Unlike other Stocks, T-Bill stocks also never fluctuate in price. However, there is a 3% fee for selling T-Bill stocks.

Reading the 
Newspaper
 carefully each Week was supposed to reveal particularly good or bad Stocks without having to visit the Bank, but this feature is bugged and does not work in any official version of the game.

## List of Stocks

| Stock | Base Price | Lowest Price | Highest Price | Notes |
| T-Bills | $100 | -- | -- | The price of T-Bills is fixed - it never changes - making this a great way to safely store money. On the other hand, selling a unit of T-Bills only returns $97. |
| Gold | $413 | $206 | $1032 | |
| Silver | $14 | $7 | $35 | |
| Pork Bellies | $20 | $10 | $50 | |
| Blue Chip Stocks | $49 | $24 | $122 | |
| Penny Stocks | $7 | $3 | $17 | Even a tiny change in Penny Stock prices can result in a huge margin of profit, making this a great stock to get rich off. However, the low price means that a lot of clicking is required to purchase or sell any substantial amount of Penny Stocks. |

## Accessing the Stock Market

To access the 
Stock Market
, visit the 
Bank
. The last option, "See the Broker", will take you to the Stock Market menu.

Accessing the Stock Market requires you to have at least 1 
Hour
 remaining on the clock. The action advances time by 2 Hours. However, buying and selling Stocks themselves does not take any additional time, nor does exiting the Stock Market menu.

## Buying and Selling Stocks

In the 
Stock Market
 menu, each of the 6 Stocks is listed next to its current price per unit, and the total value of the stocks you own of that particular type (initially $0 for all stocks).

To purchase a particular Stock, select the name of the Stock on the left, and then click the "Buy" button at the bottom. This will buy one stock of the selected type for the listed price. You may click the "buy" button repeatedly to buy more stocks, as long as you have the 
Cash
 to do so.

Selling Stocks works the same. Select the stock you wish to sell, and click the "Sell" button to sell one unit of that stock for the listed price. The money is placed directly in your wallet. You may repeatedly click the button to sell stocks until you have no more stocks of that type.

The "Done" button returns you to the main 
Bank
 menu.

## Stock Prices

The prices of 
Stocks
 fluctuate every single 
Turn
. Unlike the prices of 
Items
 in shops, Stock prices are not clamped to each other. One stock may become more expensive, while another becomes cheaper.

Nevertheless, Stock prices do react to the 
Economy
 in a broad sense, having a better chance to go up (and to go up more sharply) if the Economy is high, or a better chance to go down (and to go down more sharply) when the Economy is low. Events like an 
Economic Boom
 or 
Market Crash
 increase those chances even more on the turn when they occur.

Each stock has a Base Price which indicates its "neutral" state. The price of a stock can normally fluctuate between 50% and 250% of its Base Price.

NOTE:
 The actual formula calculating the price of stocks at the start of the turn is quite complicated, and will not be described here for simplicity's sake. Essentially, the game runs a complex function to set the main Economic Index, then runs it again to get the general trend of the Stock Market, and then finally runs the function 6 more times - one for each individual stock. The result is then applied as a percentage to the Base Price of each stock to get their final price. Running three iterations of the same complex formula per stock is what makes Stocks so volatile compared to the rest of the economy, and is the reason why explaining Stock Price calculations would be futile.

## Newspaper

Reading the 
Newspaper
 every 
Week
 at 
Black's Market
 was supposed to occasionally reveal hints about which Stocks are trending upwards and which are trending downwards. Unfortunately, a bug in the code of both the Floppy and CD-ROM versions of the game prevents specific Stock tips from ever appearing in the Newspaper.


---

# Broker

Broker
 is the top 
Job
 at the 
Bank
, and one of the highest-paying Jobs in the game.

To become a Broker, the player needs 70 
Experience
 and 70 
Dependibility
. Additionally, they require both a 
Business Administration

Degree
 and an 
Academic
 Degree. These are very high requirements, making this Job achievable only during the late stages of the game.

In order to 
Work
 at this Job, the player needs to own a 
Business

Uniform
.

The Base 
Wage
 for this job is 
$22
 ($176 per 6 
Hours
 of 
Work
).

As with any Job at the Bank, there is the risk of being robbed by 
Wild Willy
 each time the player leaves their Workplace. Players should consider depositing most/all of their money into their account before leaving the Bank, or simply working until their turn is over, to avoid this happening.


---

# Pawn Shop

The 
Pawn Shop
 is a 
Location
 where players can pawn their 
Durables
, redeem them, and buy other players' pawned items that have been put up for sale.

Pawning
 an item gives the player a small amount of money - around 40% of the item's original purchase price.

For the next few 
Weeks
, the player who pawned the item may 
Redeem
 it for 1/2 of its original purchase price.

If the item is left at the Pawn Shop for more than a few Weeks, it goes up for sale and can now be 
bought
 by any player for 1/2 of its original price.

## Opening Hours

The 
Pawn Shop
 is open every 
Week
. You may pawn, redeem, and purchase items even if the turn has ended while you're in the store.

## Pawning

"Pawning" is the act of putting an item up as collateral in exchange for a small loan. If the loan is not paid back in time, the Pawn Broker becomes the permanent owner of the item. This is a way to exchange 
Durables
 for some emergency money, and gives the player the opportunity to get their item back if they can return the money quickly enough.

When selecting the "Pawn" option at the 
Pawn Shop
, the game displays a list of each Durable in the player's inventory. Select a Durable from this list to offer it to the Pawn Shop.

After selecting the item, the game displays the size of the loan that would be received in exchange for it. At this point the player can still refuse the offer, keeping their item.

The base payment for any item is equal to 
40% of its original purchase price
, adjusted for the current 
Economy
.

If the player agrees to the offer, they receive the stated amount of money in 
Cash
. The item is removed from their inventory and passed to the Pawn Shop as collateral.

Each time a player pawns an item, they receive 
-1 
Happiness
.

### Item Limits

If any player has pawned an item, the Pawn Shop will refuse to accept any additional items of the same type. Even other players may not pawn the same type of item again. This persists until the item is Redeemed or sold.

For example, if a player pawns a 
Microwave
, no player may pawn another Microwave until that first Microwave is Redeemed or sold.

Furthermore, the 
Pawn Shop
 can only hold 6 different items at a time, no matter who they belong to. Any attempt to pawn another item will be rejected. Pawning can only resume once at least one item has been Redeemed or sold.

## Redeeming

"Redeeming" is the act of returning the money accepted for a pawned item -- with interest -- in exchange for the pawned item.

The Pawn Shop holds a pawned item in reserve for 3 
Weeks
, 
including
 the week on which it was pawned. Only the player who pawned the item may Redeem it during those three weeks.

The cost to redeem an item is equal to 
1/2 its original Purchase Price
, 
not
 adjusted
 by the 
Economy
. This can occasionally be 
less
 than the money received for the item, if the Economy was worse when the item was purchased than when it was Pawned.

At the end of the player's 
Turn
 on the third Week after Pawning an item, the item becomes the property of the Pawn Shop. It is put up for sale, and can now be purchased by any player.

## Buying

Once an item has become property of the Pawn Shop (see 
above
), the shop immediately puts it up for sale. Any player may now purchase the item for 
1/2 of its original purchase price
. This is typically a real bargain, easily rivaling prices for similar items at the 
Z-Mart
.

Buying items from the Pawn Shop does not give the player any 
Happiness
 points.

Buying an 
Appliance
 from the Pawn Shop flags it as a "second hand Appliance", giving it a 1/36 chance to break down each turn - the same as Appliances purchased from 
Z-Mart
. The item is flagged even if it was pawned just a few weeks earlier right after being purchased from 
Socket City
.

## Visuals

Like most other portraits, the Pawn Broker's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to the Pawn Shop. Nothing is too hot for us to handle.

- 
Welcome to the Pawn Shop. Down on your luck? Save the story for someone who hasn't heard it.

- 
Welcome to the Pawn Shop. I may look mean on the outside, but I've got a heart of stone.

- 
Welcome to the Pawn Shop. Why crawl to anybody else?

- 
Welcome to the Pawn Shop, where we pardon your beg!

- 
Welcome to the Pawn Shop. Your first stop on the way down the corporate ladder!

- 
Welcome to the Pawn Shop. Where 'pawn' is just another word for nothing left to lose!

- 
Welcome to the Pawn Shop. Please don't beg, it scuffs the carpet.


---

# Lottery

The 
Lottery
 is weekly, government-operated gambling. Players may purchase 
Lottery Tickets
 for a chance to win one of three 
Cash
 prizes.

Tickets are purchased from 
Black's Market
 in batches of 10, for a total of $10. At the start of the player's next 
Turn
, the game generates a random number to see whether that player has won any money. The more tickets the player has, the more likely they are to win the Lottery, and the more likely they are to win a larger prize.

After running the Lottery, all Lottery Tickets in the player's inventory are removed.

## Chance to Win

At the start of a player's 
Turn
, the game checks to see whether the player owns 
any

Lottery Tickets
. If so, it will run the 
Lottery
 immediately.

The game rolls a number between 0 and 500 at random. If the result is 
smaller than
 the number of Lottery Tickets in the player's inventory, that player has won the Lottery.

This represents a chance of 1/501 
per Ticket
. The player would need 501 tickets to guarantee a win. Since each Ticket costs $1, and tickets can only be bought in batches of 10, the minimum investment to guarantee a win would be $510.

## Prizes

Once a player has won the Lottery, there are three possible prizes they could win: 
$200
, 
$500
, or 
$5000
.

To determine which prize has been won, the game once again compares the same random number from the "Chance to Win" roll to the number of Lottery Tickets in the player's inventory, but this time the number of tickets is divided by a different factor for each prize.

- 
If the Random Roll is 
smaller than or equal to
 the number of Lottery Tickets divided by 20, the player wins $5000.

- 
Otherwise, if the Random Roll is 
smaller than or equal to
 the number of Lottery Tickets divided by 5, the player wins $500.

- 
Otherwise, the player wins $200.

Note that 
only one prize can be won
, in the order listed above.

The chance to win the big prize is therefore about 1/10000 per Ticket purchased. The chance to win the medium prize is about 1/2500 per ticket.

## Effects

Whether the player won the Lottery or not, all 
Lottery Tickets
 are removed from their inventory immediately.

If the player has won the lottery, there is a short animation where bills of money fall from the sky over their portrait. A notice then appears, showing the sum of money won.

Losing the lottery gives no special visuals, and is not even reported at all.


---

# Doctor

The 
Doctor Visit
 is a random event that can be triggered at the start of a player's 
Turn
 if certain conditions are met.

A Doctor Visit has a chance to occur if the player 
Starves
, if all of their 
Fresh Food

Spoils
 due to lack of a 
Refrigerator
, or if the the player simply doesn't have enough 
Relaxation
.

In all three cases, the clock is advanced by 10 
Hours
 immediately, the player suffers 
-4 
Happiness
, and loses an amount of money between $30 and $200. The more 
Cash
 a player has at the time, the more they are likely to lose.

A Doctor Visit can only occur if the player has more than $0 in 
Cash
. Otherwise the event is bypassed completely.

## Triggering the Event

A visit to the 
Doctor
 can be triggered at the start of a player's 
Turn
, under any of the following circumstances:

| Condition | Chance of Doctor Visit |
| Starvation | 25% |
| Spoiled Food due to lack of a Refrigerator | 50% |
| Relaxation stat is at 10 (the minimum limit) | 20% |

If multiple conditions are true, each is tested separately; Only one needs to succeed the roll in order to trigger a Doctor visit. The player can only visit the Doctor once per turn, even if multiple conditions are true.

The player must also have at least $1 in 
Cash
. Otherwise, the event is not triggered regardless of anything else.

## Effects

Once a 
Doctor Visit
 is triggered, a notice pops up on the screen to inform the player that they had to visit the Doctor, and displays the amount of money paid for this visit. A small ambulance moves around the center menu to punctuate this event.

A Doctor Visit advances the clock by 10 
Hours
. It also gives the player 
-4 Happiness
.

The amount of money paid for the visit is calculated at random, depending on the amount of 
Cash
 in the player's wallet at the time:

| Cash on hand | Cost of Doctor Visit |
| $500 or more | Random between $30 and $200. |
| Between $50 and $499 | Random between $30 and $50. |
| Between $31 and $49 | Random between $30 and all Cash on hand. |
| $30 or less | All cash on hand. |


---

# Doctor Visit

The 
Doctor Visit
 is a random event that can be triggered at the start of a player's 
Turn
 if certain conditions are met.

A Doctor Visit has a chance to occur if the player 
Starves
, if all of their 
Fresh Food

Spoils
 due to lack of a 
Refrigerator
, or if the the player simply doesn't have enough 
Relaxation
.

In all three cases, the clock is advanced by 10 
Hours
 immediately, the player suffers 
-4 
Happiness
, and loses an amount of money between $30 and $200. The more 
Cash
 a player has at the time, the more they are likely to lose.

A Doctor Visit can only occur if the player has more than $0 in 
Cash
. Otherwise the event is bypassed completely.

## Triggering the Event

A visit to the 
Doctor
 can be triggered at the start of a player's 
Turn
, under any of the following circumstances:

| Condition | Chance of Doctor Visit |
| Starvation | 25% |
| Spoiled Food due to lack of a Refrigerator | 50% |
| Relaxation stat is at 10 (the minimum limit) | 20% |

If multiple conditions are true, each is tested separately; Only one needs to succeed the roll in order to trigger a Doctor visit. The player can only visit the Doctor once per turn, even if multiple conditions are true.

The player must also have at least $1 in 
Cash
. Otherwise, the event is not triggered regardless of anything else.

## Effects

Once a 
Doctor Visit
 is triggered, a notice pops up on the screen to inform the player that they had to visit the Doctor, and displays the amount of money paid for this visit. A small ambulance moves around the center menu to punctuate this event.

A Doctor Visit advances the clock by 10 
Hours
. It also gives the player 
-4 Happiness
.

The amount of money paid for the visit is calculated at random, depending on the amount of 
Cash
 in the player's wallet at the time:

| Cash on hand | Cost of Doctor Visit |
| $500 or more | Random between $30 and $200. |
| Between $50 and $499 | Random between $30 and $50. |
| Between $31 and $49 | Random between $30 and all Cash on hand. |
| $30 or less | All cash on hand. |


---

# Factory

The 
Factory
 is a 
Location
 that serves only as a 
Workplace
. It has no other functions.

Most Factory Jobs require at least some 
Education
, particularly in 
Trade School
 and subsequent courses, 
Junior College
, and/or 
Business Administration
. Many of these jobs also require a 
Business Suit
 as the 
Uniform
. However, the top jobs at the factory are the highest-paying jobs in the game.

## Opening Hours

The 
Factory
 is open every 
Week
.

## Actions

### Work

If you have a 
Job
 at the 
Factory
, you can 
Work
 here to get money.

## Jobs

| Job | Base Wage | Req. Experience | Req. Dependibility | Req. Degrees | Uniform |
| Janitor | $7 | 10 | 20 | -- | Casual Clothes |
| Assembly Worker | $8 | 30 | 30 | Trade School | Casual Clothes |
| Secretary | $9 | 40 | 40 | Junior College | Dress Clothes |
| Machinist's Helper | $10 | 40 | 40 | Pre-Engineering | Casual Clothes |
| Executive Secretary | $18 | 50 | 50 | Business Admin. | Business Suit |
| Machinist | $19 | 50 | 50 | Engineering | Casual Clothes |
| Department Manager | $22 | 60 | 60 | Junior College + Engineering | Business Suit |
| Engineer | $23 | 60 | 60 | Junior College + Engineering | Business Suit |
| General Manager | $25 | 70 | 70 | Business Admin. + Engineering | Business Suit |

## Visuals

Like most other portraits, the Factory Receptionist's face is slightly different in the CD-ROM version of the game.

## Quotes

### Greetings

- 
Welcome to the Factory. We will overwork you, under pay you, and expect you to take it with a smile.

- 
Welcome to the Factory. Where else can you have this much fun and get paid for it too.

- 
Welcome to the Factory. Where the work is hard, the pay is low, and the conditions are miserable.

- 
Welcome to the Factory. Thursday is Double Workman's Compensation Day!

- 
Welcome to the Factory. We pay Top Dollar for Blue Collar!

- 
Welcome to the Factory. No sweat...no paycheck!

- 
Welcome to the Factory. Where money is our most important product.

- 
Welcome to the Factory. Please wear your safety helmet during scheduled inspections.


---

# Jones

Jones
 is an optional computer-controlled opponent that the human player may choose to compete against.

When starting a new game with only one human player participating, the game offers the option to compete again Jones. If this is accepted, the game asks how difficult the competition should be - determining Jones's 
Goals
 during the game. There are three difficulty settings.

Jones is displayed as a cartoon character, in contrast to other player characters who are digitized photographic sprites. His marble on the board is bluish-grey.

During each 
Week
, it is always the human player who goes first, and Jones who goes second.

Jones does not have a flawless A.I., and is likely to make mistakes or sub-optimal decisions. Nevertheless, he is relatively knowledgeable about various aspects of the game, such as which 
Jobs
 he qualifies for at any given time, or exactly when to stop 
Working
 and run over to buy 
Food
. Jones never allows himself to 
Starve
 if he can possibly help it.

Jones also appears in pure single-player and multiplayer games where he does not actually participate; He can be seen celebrating whenever a player (including himself!) wins the game.

## Jones Difficulty

When Jones is picked as an opponent, the game asks which difficulty setting he should have. This influences the total number of Goal Points Jones will have to distribute between the four 
Goals
, relative to how many Goal Points the player had selected for themselves.

| Difficulty | Goal Points |
| Take it Easy | +40 |
| Play Fair | 0 |
| Go for Broke | -40 |

For example, if the total sum of all the player's Goals is 200 (the default), and the difficulty setting "Take it Easy" is picked, Jones will have to distribute 200+40 = 240 points between his four Goals.

Jones's Goal Points are then distributed semi-randomly to each of the four Goals. The calculation is very complex, and involves figuring out what the "average" goal would be, and then playing around it until all goals have been set to legal amounts.

One important thing to note is that the algorithm heavily biases Jones's 
Wealth Goal
 to be close to the player's selected Wealth Goal. It will usually be no more than ten points above or below the player's Wealth Goal. This is due to the Wealth Goal being more or less the hardest goal to complete, meaning that any significant gap can easily make the game impossible to win for whomever has the higher Wealth Goal.


---

# Wild Willy

Wild Willy
 is a criminal who appears from time to time to rob players on the street for their 
Cash
, or their 
Apartments
 for their 
Durable Items
.

Street Robbery can only happen on or after Week #4, only as the player is leaving the 
Bank
 or 
Black's Market
, and only if the player is carrying any 
Cash
. There is a higher likelyhood of robbery outside the Bank.

Apartment Robbery can only happen at the 
Low-Cost Housing
, and only if the player owns any Durables. The chance to trigger an Apartment Robbery each turn is inversely proportional to the player's 
Relaxation
 Stat.

## Street Robbery

Each time a player leaves the 
Bank
 or 
Black's Market
, the game checks the following conditions:

- 
Is it Week #4 or later? (only enforced in the 
CD-ROM version
)

- 
Is the player carrying any 
Cash
?

If both conditions are true, the game rolls a random number to see whether the player will be robbed by 
Wild Willy
. The chance to be robbed depends on the player's location:

- 
Bank:
 1/31 chance (~3.2%)

- 
Black's Market:
 1/51 chance (~1.95%)

If the random roll succeeds, the game plays the animation of Wild Willy approaching the player's marble and pulling out a gun. He then flees off-screen. The game then displays the 
Newspaper
 with a headline announcing the robbery.

A Street Robbery leaves the player with exactly $0 in Cash. The player also loses 
-3 
Happiness
.

There does not seem to be anything in the code preventing multiple Street Robberies from occurring in a single 
Turn
 to the same player.

## Apartment Robbery

At the start of a player's 
Turn
, if that player lives at the 
Low-Cost Housing
 and owns any number of 
Durables
, there is a chance for their apartment to be robbed by 
Wild Willy
.

The chance of this event occurring at all depends on the player's 
Relaxation
 Stat:

C

h

a

n

c

e

o

f

A

p

a

r

t

m

e

n

t

R

o

b

b

e

r

y

=

1

R

e

l

a

x

a

t

i

o

n

S

t

a

t

+

1

{\displaystyle Chance \ of \ Apartment \ Robbery = {1 \over Relaxation \ Stat + 1 }}

Relaxation ranges from 10 to 50, so the maximum chance is 1/(10+1) (~9% per Turn), and the minimum chance is 1/(50+1) (~1.95% per Turn).

Once the Robbery has been triggered, the game checks each item type among the player's 
Durables
 to see whether it was stolen. Each type of Durable has a 25% chance (1/4) to be stolen. Multiple types of Durables may be stolen simultaneously.

Note that this process rolls only once for all items of the same type. For example, if the player owns 3 
Stereos
, the game only rolls once for all Stereos; There is a 25% chance that all three Stereos will be stolen, and 75% chance that none will be stolen.

If at least one type of item has been stolen, the game displays a 
Newspaper
 with a headline announcing the robbery, and the player loses 
-4 
Happiness
 (regardless of how many items have been stolen).

If all item types have avoided being stolen, the game simply continues as though no robbery happened.

### Exceptions

The following 
Durables
 can never be stolen by Wild Willy:

- 
Refrigerator

- 
Freezer

- 
Stove

- 
Computer

- 
Encyclopedia

- 
Dictionary

- 
Atlas


---

# Cook

Cook
 is the lowest-tier 
Job
 at 
Monolith Burgers
, and one of the lowest-paying Jobs in the game.

There are no actual requirements to getting this Job; Any applicant will be hired, even if their 
Dependibility
 is below the notional requirement of 10.

In order to 
Work
 at this Job, the player needs to own a 
Casual

Uniform
 or better (essentially, they need to not be naked).

The Base 
Wage
 for this job is 
$5
 ($40 per 6 
Hours
 of 
Work
).

As with any job at Monolith Burgers, this job makes it easy for the player to work throughout their entire 
Turn
 without having to go elsewhere to eat.


---

# Assembly Worker

Assembly Worker
 is a low-tier 
Job
 at the 
Factory
.

To become an Assembly Worker, the player needs 30 
Experience
 and 30 
Dependibility
. Additionally, they require a 
Trade School
 Degree.

In order to 
Work
 at this Job, the player needs to own a 
Casual

Uniform
 or better (essentially, they need to not be naked).

The Base 
Wage
 for this job is 
$8
 ($64 per 6 
Hours
 of 
Work
).

This job is 
sub-optimal
, and should only be taken if other jobs have "No Openings". The same requirements qualify the player for the 
Butcher
 job at 
Black's Market
, which earns a base $4 more. Alternatively, even without a Trade School degree the player can get a 
QT Clothing Salesperson
 job for the same wage as Assembly Worker.


---

# Apartment Manager

Apartment Manager
 is the top 
Job
 at the 
Rent Office
.

To become an Apartment Manager, the player needs 30 
Experience
 and 30 
Dependibility
. Additionally, they require a 
Junior College
 Degree.

In order to 
Work
 at this Job, the player needs to own a 
Casual

Uniform
 or better (essentially, they need to not be naked).

The Base 
Wage
 for this job is 
$9
 ($72 per 6 
Hours
 of 
Work
).

The Apartment Manager job has slightly low requirements for its Wage. Along with the cheap Uniform requirement, this is one of the best jobs for a new Junior College graduate - at least while building up the necessary Experience and Dependibility to qualify for 
Bank Teller
 or 
Black's Market Assistant Manager
.
