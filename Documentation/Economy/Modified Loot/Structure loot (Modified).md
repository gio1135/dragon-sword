# Structure loot (modified)

In vanilla multiplayer servers, structure loot suffers from severe market failure: early players hoard all unique items, leaving barren ruins behind. Furthermore, vanilla chests contain items that technical players produce by the thousands, causing mutual economic devaluation. The dragon sword structure loot system completely redesigns this dynamic using injected vaults and universal keys

## Core design principles

### 1. Persistent reward via vaults
- Standard chests provide immediate one-off exploration supplies and a chance for a key
- Injected structure vaults ([[Vaults mapping]]) provide per-player rewards, allowing every player to explore a structure and receive full rewards regardless of server age

### 2. Universal key progression
- Standard vaults are unlocked using [[trial_key]], which can be found in trial chambers, structure chests, and patrol captains
- Ominous vaults are unlocked using [[ominous_trial_key]], earned by drinking an [[ominous_bottle]] and conquering high-threat encounters

### 3. Protection of farmable economies
- Masses of farmable commodities ([[iron_nugget]], [[gold_nugget]], [[string]], [[rotten_flesh]], [[bone]]) are removed from structure chests
- This preserves the commercial value of automated farms run by [[Technical player]]

### 4. Monopoly on master enchantments
- Following the removal of [[mending]] from villager trades ([[Gameplay loot (Modified)]]), structure vaults are the exclusive source of master enchantments
- [[Adventurer]] players become the sole suppliers of [[mending]], [[swift_sneak]], [[wind_burst]], and armor trim templates

## Structure documentation links
- [[Overworld structures]]: Breakdowns for outposts, pyramids, temples, ancient cities, mansions, mineshafts, strongholds, monuments, and shipwrecks
- [[Nether and end structures]]: Breakdowns for nether fortresses, bastions, ruined portals, and end cities
- [[Vaults mapping]]: Comprehensive vault reward tables, key requirements, and probabilities across all structures

## Macroeconomic circular flow

### Real-world economic analogy
- Specialization and comparative advantage: Each archetype focuses on what it produces most efficiently
  - Technical players have high capital investment and low marginal cost, producing mass commodities
  - Adventurers have high variable risk and labor cost, extracting scarce non-renewables
  - Builders convert labor and aesthetic skill into land value and claim currency
- Market equilibrium: No archetype can monopolize the entire economy
  - Adventurers must buy potions, food, and rockets from technical players to survive high-tier structures
  - Technical players must buy [[mending]] and templates from adventurers to maintain and upgrade their automated systems
  - Builders buy aesthetic accents from both groups and pay for them with claim blocks (produced at 128/hr while active in claim), which adventurers and technical players require to secure their bases and farms