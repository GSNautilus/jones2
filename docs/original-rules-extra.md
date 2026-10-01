<!--
Fan-wiki pages missing from original-rules.md, fetched 2026-09-30 through the wiki API
(https://jonesinthefastlane.fandom.com). Converted from wiki markup; wording unchanged.
Where these pages and original-rules.md disagree, the sim follows the more specific page and
says so in a comment (content/classic/*.ts).
-->


---

# Economy

The game keeps track of an Economy that fluctuates each and every Turn, but generally follows a certain trend that shifts slowly over time.

The way the game calculates the Economy is quite complex. It is a formula that is executed at the start of every Turn, using parameters derived from the state of the Economy in the previous turn. The calculation results in two values: The "Index" (a market trend) and the "Reading" (a percentage applied to prices throughout the game).

The current state of the Economy directly determines all Item prices in the game (with two minor exceptions).

A player's current Rent is not affected by the Economy, but the Rent offered for other Apartments is.

A player's current Wage is not affected by the Economy except in cases of Market Crashes causing a pay cut. The Wages for other Jobs on offer at the Employment Office do fluctuate with the Economy.

The price of Stocks also fluctuates, but it is not directly clamped to the Economy. Instead, each Stock can fluctuate up or down independently, around a certain baseline dictated by the Economy.

At the start of each Turn (except on the first 3 Weeks of the game), the Economy can experience either a Market Crash or an Economic Boom, which is announced with a Newspaper headline. This has a sudden impact on the Economy, and can also cause players to be fired from their Jobs or to get a Wage cut.

## Economic Index and Reading

At the start of each Turn, the game runs a formula that calculates both the current state of the Economy and where it is generally heading.

This formula is quite complex, and involves processing the same parameters multiple times, and applying multiple random factors to them. 

The result of the formula are two important values:

* The Index: A number between -3 and +3 indicating the current general state of the Economy, as well as the direction in which it is heading. A higher Index pulls prices upwards, while also increasing the chance for another economic improvement at the start of the following turn.
* The Reading: A number between -30 and +90 (-90 and +90 in the Floppy Disk version) indicating the precise state of the Economy. This directly influences prices where applicable. The Economic Reading also determines whether a Market Crash or Economic Boom can occur at the start of the turn (though random chance also has a say).

Neither of these values is visible in-game, though the Reading can be determined by comparing an item's current purchase price to its Base Price.

In general a strong economy is likely to get stronger, while a weaker economy is likely to get weaker. However, a stronger economy is liable to Crash, while a weaker one is liable to Boom.

In the Floppy Disk version of the game, it was easy for the Economy to get out of hand and plunge into a never-ending slump (with extremely low prices and Wages). This was somewhat rectified in the CD-ROM version of the game, where the Economy is much more likely to recover.

For purposes of gameplay, only the Reading is important, as it is directly proportional to prices (except the Stock Market, which gets its own separate Reading for each Stock, influenced by the main Economic Index).

## Item Prices

The most pronounced effect of the Economy is on the purchase price of Items at stores. With very few exceptions, all Item prices are clamped to the current Market Reading.

Each item in the game has a Base Price, which is how much that item would cost if the Reading was exactly 0. However this is exceptionally rare; The Reading will most likely be somewhere above or below 0 at all times.

The actual price of an item is determined by the following formula:

`Item  Price = Base  Price + {Base  Price × Reading \over 60}`

Given the possible values of the Reading (-30 to 90), this means that an item can cost anywhere between 50% and 250% of its Base Price.

The Lottery Tickets and Newspaper avoid this formula, having a fixed price that never changes. Additionally, the prices of items at the Pawn Shop never fluctuate once the item is put up for sale.

## University Enrollment

Enrolling for a course at Hi-Tech U has a Base Price of $50, and is directly affected by the Economy the same way that Item Prices are affected (see above).

## Wages

A player's Wage does not normally react to the Economy; It stays static so long as the player doesn't change Jobs (and doesn't ask for and receive a Raise).

However, a Market Crash event of moderate severity can randomly cause the player to receive a pay cut, reducing their Wage to 80% of their current Wage.

Wages offered at the Employment Office do change, the same as Item Prices (and using the same formula); A Job can be offered for anywhere between 50% and 250% of its Base Wage. If the player's current Job is being offered at a higher Wage than the player currently makes at that Job, they may select it again to ask for a Raise.

## Rent

The Rent for a player's Apartment does not change as long as the player keeps the same Apartment.

However when switching to a new Apartment, the new Rent is based on the type of Apartment and is affected by the Reading (see above). This new price is listed at the Rent Office next to the option to switch to a new Apartment.

Once the new Apartment is acquired, its Rent remains completely static until the player switches Apartments again (if at all).


---

# Market Crash

A Market Crash or Economic Crash is a random event that can occur at the start of any Turn, if certain conditions are met. It causes damage to the Economy and can do direct damage to all players' finances as well.

A Market Crash can only occur if the economy is better than its worst possible state, and only on or after Week #8. The more players there are, the lower the chance of a Market Crash each turn.

There are three different severities of Market Crashes (Minor, Moderate, Major). Each causes a different level of impact. Each Market Crash has an equal chance to be of any severity.

All Market Crashes bias the current Economic trend downwards, and typically cause prices and Wages to drop immediately.

In a Moderate or Major Market Crash, each player has a chance to receive a Pay Cut to their current Wage.

In a Major Market Crash only, each player has a chance to be fired from their Job immediately. A Major Crash also erases all money in the Bank deposits of *all* players.

On triggering a Market Crash, the player whose turn it is suffers a loss of Happiness relative to the severity of the Crash. They lose even more Happiness if they have over $1,000 in Stock Market investments. Any players who get a pay cut or lose their jobs suffer additional loss of Happiness.

## Triggering a Crash

In order for the game to trigger any Market Crash, the following conditions must be true:

* It is Week #8 or greater.
* The current Economic Reading is at least 80.

If both conditions are met at the start of a player's Turn, the game rolls a random number to determine whether an Economic Crash should take place. 

In the Floppy Disk version, the chance to trigger a Crash is calculated by this formula:

`Chance  of  Market  Crash = {1 \over 1 + ({20 × Number  of  Players})}`

In the CD-ROM version, the chance to trigger a Crash is calculated by this formula:

`Chance  of  Market  Crash = {1 \over 1 + ({30 × Number  of  Players})}`

Once a Crash is triggered, the game immediately displays the Newspaper showing a headline indicating the severity of the Crash.

## Crash Severity

Once a Market Crash has been triggered, the game selects the severity of the Crash completely at random.

* A Minor Market Crash affects only the economy.
* A Moderate Crash affects the economy and possibly players' Jobs, resulting in firings and/or pay cuts.
* A Major Crash affects the economy but also gets all players fired. It also wipes out all Bank accounts.

Each severity of Market Crash triggers a different Newspaper headline, which appears immediately on the screen.

| Severity | Effects | Headline |
| Price Drop | Chance to be Fired | Pay Cuts | Bank Wipe |
| Minor | -5% | -- | No | No | *MORE S & L'S FAIL! ECONOMY SUFFERS* |
| Moderate | -10% | 50% | Yes | No | *SCANDAL ON WALL ST. ECONOMY DROPS! UNEMPLOYMENT RISES* |
| Major | -15% | 100% | No | Yes | *BANKS FALTER! SAVINGS LOST! JOBS LOST!* |

## Economic Effect

When a Market Crash of any severity strikes, it has two sudden effects on the Economy.

First, the Crash causes the Economic Index (a general market trend) to sharply decline. This means that the economy suddenly becomes more likely to keep going down on subsequent turns. A Crash will cause a very strong economy to neutralize (it could go either way from here), or a neutral economy to reach the worst possible decline (staying low potentially for a long time).

Furthermore, the Crash instantly reduces all prices by a certain percentage. The size of the penalty depends on the severity of the crash:

* Minor Crash: -5%
* Moderate Crash: -10%
* Major Crash: -15%

Note that this penalty is applied after the Economic Index plunges, which means that the final price drop could be far more serious than these numbers imply.

A price drop affects the prices of all Items at stores, the Wages on offer at the Employment Office, the Rent for available Apartments at the Rent Office, the cost of Enrolling in new courses at Hi-Tech U, and indirectly the value of all Stocks.

Each player's current Wage and Rent are not affected; However a severe Crash can separately reduce player Wages as described below.

## Firings and Pay Cuts

When a Moderate or Major Crash occurs, each player has a chance to lose their job immediately. This includes all players, not just the one whose Turn it currently is.

In a Moderate crash, the chance to be fired is 50% for each player. However any player who does not get fired will instead get a pay cut; Their hourly Wage is reduced to 80% of its current value.

In a Major crash, all players are fired from their jobs. There is no chance to avoid this.

The game immediately displays the "Pay Cut" / "You're Fired" notice (as applicable) for each player, rather than notifying players on their own turns.

## Bank Wipe

A Major Market Crash immediately erases all money in each player's Bank account.

Only money in the account is affected. Money invested in Stocks or held in Cash is not affected at all.

## Happiness Penalty

If a Market Crash occurs during a player's turn, that player (and only that player) loses Happiness according to the severity of the Crash, and an extra penalty if they also possess more than $1,000 in Stock Market investments.

| Crash Severity | Happiness lost |
| Base | Extra for >$1,000 in Stocks |
| Minor | -1 | -1 |
| Moderate | -2 | -2 |
| Major | -3 | -5 |


---

# Economic Boom

An Economic Boom or Market Boom is a random event that can occur at the start of any Turn, if certain conditions are met. It improves the Economy, raising prices across the board.

An Economic Boom can only occur if the economy is neutral or slightly better than neutral - and only on or after Week #8. The more players there are, the lower the chance of an Economic Boom each turn.

Unlike Market Crashes, there is only one intensity of Economic Boom.

An Economic Boom biases the current Economic trend upwards, and typically causes prices and Wages to increase immediately.

On triggering an Economic Boom, the player whose turn it is enjoys a large bonus to Happiness if they have over $1,000 in Stock Market investments.

## Triggering a Boom

In order for the game to trigger any Economic Boom, the following conditions must be true:

* It is Week #8 or greater. (This condition only applies in the CD-ROM version)
* The current Economic Reading is no more than 120.

If both conditions are met at the start of a player's Turn, the game rolls a random number to determine whether an Economic Boom should take place. 

In all versions of the game, the chance to trigger a Boom is calculated by this formula:

`Chance  of  Economic  Boom = {1 \over 1 + ({30 × Number  of  Players})}`

## Economic Effect

When an Economic Boom occurs, it has two sudden effects on the Economy.

First, the Boom causes the Economic Index (a general market trend) to sharply improve. This means that the economy suddenly becomes more likely to keep going up on subsequent turns. A Boom will cause a very weak economy to neutralize (it could go either way from here), or a neutral economy to reach the best possible upwards trend (staying high potentially for a long time).

Furthermore, the Boom instantly increases all prices by 10%.

Note that this bonus is applied after the Economic Index jumps up, which means that the final price increase could be far more substantial than this number implies.

A price increase affects the prices of all Items at stores, the Wages on offer at the Employment Office, the Rent for available Apartments at the Rent Office, the cost of Enrolling in new courses at Hi-Tech U, and indirectly the value of all Stocks.

Each player's current Wage and Rent are not affected.

## Happiness

When an Economic Boom occurs during a player's turn, if they have over $1,000 in Stock Market investments that player (and only that player) receives +5 Happiness.


---

# Experience

Experience is a hidden Stat that is tracked independently for each player. It determines the player's ability to get Jobs.

Players start the game with 10 Experience. This Stat never decreases for any reason.

Experience is checked each time the player applies for a new Job. Each job has a Required Experience rating, which the player must reach or surpass to qualify for that Job.

Whenever a player Works at their job, they get +1 Experience per Work session (6 Hours or fewer). However each player has a Maximum Experience limit which they cannot normally surpass. This limit is increased as the player gets better Jobs and more University Degrees.

## Experience Stat

Experience is a hidden Stat - you may not check your Experience anywhere during the game, though it is tracked constantly behind the scenes.

Each player starts the game with 10 Experience.

Unlike Dependibility, the Experience stat never decreases for any reason; It can only increase.

## Required Experience

Each Job in the game has a specific "Required Experience" rating. See the List of Jobs for the Required Experience of each job in the game.

In order to get any Job, the player must have enough Experience to match its Required Experience or surpass it. If the player does not have enough Experience, their application will be rejected on grounds of "Not Enough Experience".

## Increasing Experience

The primary way to increase Experience is to Work.

Each successful Work session (where any amount of money was earned) increases Experience by +1 point.

This increase only occurs if the player has not yet reached their Maximum Experience -- otherwise no points are received in this stat.

Additionally, each time a player switches to a new Job, they get +2 Experience.

## Maximum Experience

The player's Maximum Experience prevents them from accumulating more Experience than their current Job allows.

Each time the player gets a new Job, their Maximum Experience is reset according to the formula below:

`Maximum  Experience = 10 + Required  Experience  for  Job + (University  Degrees × 5)`

Normally this means that players can exceed their job's Required Experience by 10 points. This requires Working exactly 10 times at their job.

This limitation means that players are normally forced to climb from one Job to a slightly better one, collecting more and more Experience each time before proceeding to a better job.

Each University Degree acquired by the player increases their Maximum Experience by a permanent +5 points. Thus, a player who has all 11 Degrees and a Job that requires only 10 Experience has a maximum of 10 + 10 + 55 = 75 Experience, which is enough to jump straight to the highest-paying Jobs in the game without having to slowly climb the Jobs ladder.


---

# Wage

A Wage is the expected payout for Working at a specific Job.

Each Job listed at the Employment Office offers a specific Wage. The offered Wage for each Job is calculated based on its inherent "value" compared to other jobs, as well as the current state of the Economy. Wages for different jobs keep the same proportions to each other - so that one job will always pay more or less than another job, even as the Economy fluctuates.

As long as a player keeps their Job, their Wage will not change except by direct action (asking for a Raise, or applying for another job) or due to a very rare Market Crash event. A player's current Wage is listed in their Statistics Screen. 

Whenever the player Works at their Job, they earn 8 times their current Wage. This assumes at least 6 Hours are left on the clock, otherwise the amount is reduced proportionally to the time left that Turn. If the player owes a Rent Debt, Garnishment takes away just over half of the earnings to pay for it.

## Offered Wages

At the Employment Office, each Job is listed next to its current offered Wage.

The offered Wage for each job is based on an internal value - a "Base Wage" - that is set in the code and never changes. This is then adjusted according to the strength of the Economy, so that a better Economy results in higher offered Wages. 

The final Offered Wage can be anywhere between 50% and 250% of the job's "Base Wage". The same percentage is applied to each and every offered Wage, so that one specific job will always offer more or less than another specific job.

The economic component of Wages is identical to the economic adjustment applied to Item prices. Thus, as items cost less, the offered Wage for all jobs in the game is reduced by the same percentage.

The game will not prevent a player from applying for a job that makes *less* than their current Wage. However it will prevent them from asking for the same Job they currently hold at a lower or equal Wage to what they are already making.

## Earnings

Whenever a player successfully Works at their Job (i.e. not fired or out of time), they receive an amount of money corresponding to their current Wage.

Wages are listed in the player's Statistics screen as being "$X per Hour". However this is not accurately represented in the game; Players actually receive 33% more per Hour of work than this number indicates.

If at least 6 Hours are left on the clock, Working advances the clock by 6 exactly Hours, and the player receives 8 times their current Wage.

If fewer than 6 Hours are left on the clock, the clock is advanced to the end of the Turn, and the payment is reduced proportionally to the number of hours remaining:

`Earnings = {8 × Current  Wage × Hours  Remaining \over 6}`

All Earnings are paid in Cash. This poses a risk to players working at Black's Market, as they can get robbed by Wild Willy as soon as they leave this location. Similarly, players working at the Bank have an even higher risk of getting robbed on their way out of work, but can easily deposit most (or all) of their Cash at the Bank before leaving, to prevent this from having any serious effect.

### Garnishment
(See: Garnishment)
If the player owes any Rent Debt by failing to pay their Rent at the end of the Month, the game will begin to Garnish their earnings each time they Work.

As long as the player is in Rent Debt, half of the money earned for each Work session is deducted from their earnings, and is used to wipe out an equal amount of debt. An additional $2 are taken away to pay for Interest Fees. The remaining 50% minus $2 are handed to the player in Cash.

If the player's Rent Debt is smaller than half their earnings, that amount is deducted from the player's earnings and the Rent Debt is entirely cleared; The player receives the rest without having to pay a $2 Interest Fee.

Once the Rent Debt is cleared, further Work sessions pay out as normal.

## Raises
(See: Raise)
If the player's current Job is offered at the Employment Office at a higher Wage than the player's current Wage, they may select that Job to ask for a Raise.

Raises can be refused if the player's Dependibility is too low. Otherwise, the player's Wage is raised to the listed amount.

Each time the player is approved for a Raise, additional attempts to get a Raise while holding the same job require higher and higher Dependibility. Switching to a different Job resets this counter.

## Pay Cuts
(See: Market Crash)
If a Moderate Market Crash event occurs, all players have a 50% chance of losing their Job instantly. A player who manages to keep their job will instead have their Wage cut to 80% of its current value (rounded down).

This is the only way that a player's Wage can drop (other than actively switching to a lower-paying job).

If the economy improves, the player may be able to return to their previous wage (or a better one) by requesting a Raise.

## Bank Loans
(See: Loans)
Having a higher Wage increases the chance of getting a Bank Loan. It also increases the amount of money the Bank is willing to pay out if the loan is approved.

The Wage is just one of several factors affecting this mechanic.


---

# Turn

A Turn is the period between the point where a player gets control of their character and the point when they relinquish it to the next player.

Each player gets one Turn per Week of the game. Players get their turns in order (player 1, then 2, then 3, then 4). If a single player is competing against Jones, the human always goes first each Week. If a single human player plays with no opposition, then there is only one Turn per Week and thus the terms "Turn" and "Week" become largely interchangeable.

Each Turn begins with a recalculation of the Economy, followed by a report on the current player's Weekend. This is followed by any number of relevant notices about events (random or otherwise) that influence the player's condition.

Finally, the player receives control and can move across the board and perform actions. Each player has 60 Hours to spend (minus any hours wasted due to certain negative events like Starvation). The clock at the bottom of the screen tracks how many hours have been spent vs. how many remain.

Once 60 Hours have been spent, the next time a player leaves a Location (or if they are currently traveling around the board when this happens), the Turn ends immediately with a distinctive sound effect, and the next player's turn begins.

This article primarily discusses everything that happens right at the *start* of the player's turn, before they get actual control to move around the board and perform any actions. The chapters below are organized in order of occurrence.

## Economic Changes
(See: Economy)
Immediately at the start of the turn, the game runs a complicated function to adjust the Economy.

This causes Item prices to fluctuate up or down, as well as Wages for Jobs on offer at the Employment Office, and Rent on offer for new Apartments at the Rent Office.

## Cooking Bonus
The player receives +1 Happiness if they own either a Microwave or a Stove. Only +1 is given, even if the player owns both items.

This is done before the Winner Check (see next step) to ensure that the items can push a player to fulfilling their Happiness Goal first.

## Winner Check

At this point the game checks the player's Goals to see whether they have all been fulfilled. If so, that player wins the game.

If there are other players remaining in the game, they may choose to continue playing.

## Weekend

(See: Weekend)
At this point the game randomizes a Weekend for the player, and deducts the appropriate payment.

Owned Tickets and Durables can influence which Weekend is chosen; Otherwise a random Weekend is chosen. Payment can be as high as $55 during the first two Months of the game, and then the maximum is increased to $100.

## Lottery

(See: Lottery)
If the player purchased any Lottery Tickets during the previous turn, the game now runs a check to see whether they've won the Lottery.

More tickets equals a higher chance of winning a prize, and also a higher chance to win the big prize of $5,000.

## Computer Profits

(See: Computer)
If the player owns a Computer, they have a random chance to make a small amount of money from it.

## Degrade Relaxation
(See: Relaxation)
Each turn, the game reduces the player's Relaxation stat by -1. It can never decrease below 10.

## Apartment Robbery

(See: Wild Willy)
If the player lives at the Low-Cost Housing, and owns any Durables, they now have a chance for their Apartment to be robbed by Wild Willy.

If the event is triggered, each Durable in the player's inventory has a chance to be stolen.

Having a higher Relaxation score reduces the chance of triggering a robbery.

## Spoiled Food

(See: Spoiled Food)
If the player owns any Fresh Food but no Refrigerator, all Fresh Food will immediately Spoil.

If the player owns a Refrigerator, any Fresh Food in excess of 6 units will spoil. If the player also owns a Freezer, the limit is raise to 12 units.

## Starvation

(See: Starvation)
If the player owns a Refrigerator and any amount of Fresh Food, or they purchased any Fast Food item during the previous turn, they skip this step.

Otherwise, the player Starves, advancing the clock by 20 Hours (1/3 of a turn!).

## Doctor Visit

(See: Doctor)
The player has a random chance of being forced to visit the Doctor due to low Relaxation, Spoiled Food, or Starvation.

A visit to the Doctor advances the clock by 10 Hours, and costs a non-trivial amount of money.

## Rent Notice

(See: Rent)
If it is currently the fourth Week of the Month, and the player has not paid their Rent in advance, they now receive a notice reminding them to go pay the Rent at the Rent Office.

Failure to pay the Rent by the end of this Week, or to get a Rent Extension, will result in Rent Debt and paycheck Garnishment.

## Buy New Clothes

(See: Clothes)
If the player owns any Clothes, they lose one "Week's worth" of clothes from each of the three clothing types.

When there is no more than 1 Week's worth of any type of Clothes remaining, the player receives a reminder to go buy new clothes. Failure to do so will leave then naked when this step is processed next turn.

## Loan Payments

(See: Loans)
If it is currently the fourth Week of the Month, and the player has any outstanding Loans that they have not paid for in advance, they now receive a notice reminding them to go make a Loan Payment at the Bank.

Failure to make at least one $50 payment by the end of this Week will result in the player Defaulting on their loan, which makes it much more difficult to get additional Loans in the future.

## Appliance Repair

(See: Repairs)
If the player owns any Appliances, each appliance has a small chance to break and require Repairs. This costs a small amount of money proportional to the purchase price of that Appliance.

Appliances purchased at Z-Mart or at the Pawn Shop have a higher chance of breaking.

## Economic Events

Randomly each Turn, there is a chance for the game to execute a Market Crash or Economic Boom, with a major impact on the Economy. This is now announced to the players with a Newspaper headline.

In case of a Moderate or Major Market Crash, each Player will now receive a notice informing them whether they were fired from their Job, or whether their Wage was cut.

## Donations

(See: Donation)
If the player has had no Clothes for at least 2 Turns in a row, and their financial situation is dire, they may receive a Donation from a sympathetic relative.

The size of the donation is enough to purchase new Clothes, plus a small amount of extra Cash.

## Player Control
Finally, the player's marble is placed outside their current Apartment and they are given control. They may now move and perform actions until they've spent all 60 Hours of their current turn.

Once all 60 Hours have been spent, the turn can end - but doesn't necessarily do so immediately. If the clock runs out while the player is still inside a Location, they may continue performing actions that do not require any time, e.g. purchasing Items or depositing money at the Bank. They may not Work, Relax, or perform any other action that costs Hours.

If at any point the player leaves a Location while their time has run out, or is traveling across the board when their time runs out, their turn ends immediately.


---

# Hour

Progress from the start to the end of a player's Turn is measured in "Hours".

At the start of a Turn, the player receives 60 Hours (or fewer, in case of events like Starvation). They may spend those Hours on moving across the board, Working, Relaxing, Studying, or any other action whose cost is measured in Hours.

Each action costs a different number of Hours, while some actions (like purchasing Items) cost none.

Once the player has spent all 60 Hours allotted to them, the next time they leave a Location will trigger the end of their Turn, and start the next player's Turn.

There is no way to regain Hours that have already been spent.

The Town Clock at the bottom of the screen tracks the number of Hours remaining in a player's Turn. As Hours are spent, the yellow clock gradually fills with a red color. When no yellow is left on the clock, the Turn is over.

If a player has depleted their last Hour while inside a Location, they may still perform any action that does not cost Hours, such as purchasing Items. They may not perform any action that costs Hours.

If a player has depleted their last Hour while traveling across the board, their turn ends instantly (before even reaching their destination).

## Hour Costs

The lists below detail each action and event in the game that costs Hours.

### Events

Events that cost Hours only occur at the start of a player's Turn. They effectively make the turn shorter by reducing the number of Hours a player has left once they receive control of their character.

| Event | Hours |
| Starvation | 20 |
| Doctor Visit | 10 |

### Actions

No action may be performed if the player has spent all 60 hours of their turn.

If an action would spend more Hours than remaining on the clock, it simply advances the clock to the end of the turn. In most cases this has no effect on the outcome of the action (except when Working).

| Action | Hours | Notes |
| Moving | Varies | It takes approximately 4 Hours to cross from a location on one side of the board to a location on the opposite side.  Movement is measured in fractions of an Hour, so moving between two adjacent Locations that are less than a full Hour apart is not free. |
| Entering a Location | 2 | This applies both when arriving at a new Location, and when leaving a location and immediately re-entering it. |
| Working | up to 6 | Working normally costs 6 Hours and pays Wage * 8. If fewer than 6 Hours remain on the clock when the "Work" button is pressed, the player receives only (Wage * 8 * Hours Remaining / 6). |
| Applying for a Job | 4 | Includes applying for a Raise. Costs 4 hours regardless of whether the player receives the job or is denied. |
| Relaxing | 6 | Adds a set amount of Relaxation and/or Happiness even if fewer than 6 Hours remain on the clock. |
| Studying | 6 | Completes one lesson in a course, even if fewer than 6 Hours remain on the clock. |
| Apply for Loan | 2 | Regardless of whether the Loan is granted or rejected. |
| Visiting the Broker | 2 | Each time the Stock Market menu is opened at the Bank. |
| Purchasing a Newspaper | 1 | Each purchase at Black's Market. Newspapers appearing due to random events do not advance the clock. |


---

# Garnishment

Garnishment is the game's way of enforcing Rent payment. Whenever the player is in Rent Debt, the game removes part of the player's earnings each time they Work, using most of the removed money to cover their Rent Debt. This continues until all Rent Debt is paid off.

Garnishment can be seen as an alternative way to pay Rent without having to run to the Rent Office once a month. However, it costs extra money due to a small Interest Fee paid each time the player Works. These small payments can amount to a much larger sum of money than the player would earn by spending their time Working instead of going to the Rent Office.

## Forced Payments

If the player fails to pay their Rent on the fourth (last) Week of the Month, and does not receive a Rent Extension (or receives one but then fails to pay), their Rent Debt is increased by an amount equal to the current price of their Rent.

While the Rent Debt is greater than $0, the game Garnishes the player's earnings each time they Work at their Job.

Each time the player works, only 50% of their earnings are acquired in Cash. The remaining 50% is automatically deducted from their Rent Debt.

Additionally, the player loses another $2 which is not used to reduce their Rent Debt. This is an Interest Fee paid to the Rent Office for being late on payments.

:For example, if a Work session would earn the player $100, the player's Rent Debt is reduced by $50, and they earn only $50 - $2 = $48 in Cash.

Each time this happens, the player is informed of the total deduction by their employer. The reported amount includes the money that went to covering the debt plus the Interest Fee.

If the player attempts to Work when their Rent Debt is lower than 50% of their earnings for this Work Session, the game only deducts whatever amount is necessary to cover the entire Rent Debt from their paycheck. No Interest Fee is collected in this case.

:For example, if a Work session would earn the player $100, but they owe only $30 in Rent Debt, the Rent Debt is completely cleared and the player earns $100 - $30 = $70 in Cash.

Note: The calculation is run when attempting to work. If the player's Wage changes, the amount Garnished from their paycheck adjusts accordingly.


---

# Donation

A Donation is a random event that can occur at the start of a player's Turn under certain conditions, providing the player with some money from a relative who takes pity on their poor financial situation.

A Donation event will occur if the player has no Clothes, limited Cash, and very low Net Worth.

The amount of money received is enough to purchase a Uniform suitable for the player's current Job (if any), plus a small random amount of extra cash.

## Triggering the Event

The conditions required to trigger a Donation event are different depending on the version of the game.

Donations may occur repeatedly each time these conditions are met.

### CD-ROM version

In the CD-ROM version, a Donation will be triggered once all of the following conditions are *true*:

* The player has not owned any Clothes for two consecutive Turns.
* The player has less than $300 in Cash.
* The player's Net Worth is less than $300.

### Floppy Disk version

In the Floppy Disk version, a Donation will be triggered once all of the following conditions are *true*:

* The player has not owned any Clothes for two consecutive Turns.
* The player has exactly $0 in Cash.
* The total value of all Durables owned by the player, not including any Pawned items, is less than $200.

## Effects

Once a Donation is triggered, the game determines how much money was donated by their relative, and then adds this money to the player's Cash.

First, the game calculates how much money a player would need to purchase a new set of Clothes appropriate for their current Job. This takes the current Economy into account, so the final value is exactly equal to the amount needed to purchase the clothes at QT Clothing this Turn.

If the player does not currently have a Job, the money received for new Clothes is set to exactly $50 - typically (but not always!) enough to purchase a set of used Casual Clothes at Z-Mart.

To this, the game adds a random amount of money between $1 and $100.

The total price is displayed in a notice on the screen. It is then immediately added to the player's Cash total.

Once a donation is received, the game resets the number of Turns the player has been "naked". This means that it will take at least two turns before the player can receive another Donation.

## Net Worth

The CD-ROM version of the game requires a player to have less than $300 in Net Worth in order to qualify for a Donation. The player's current Net Worth is displayed in their Statistic Screen, though it is not used anywhere else in the game except for Donations.

Net Worth is calculated by adding together the player's Liquid Assets and the value of all Durables they currently own - including any Pawned Durables.

The value of each type of Durable is calculated by the price the player paid for the last instance of that Durable they had purchased. For example, if the player purchases a Color TV for $400, and then later purchased *another* Color TV for $500, the total value of these items is 2 * $500 = $1,000 (instead of the actual $900 paid for them).
