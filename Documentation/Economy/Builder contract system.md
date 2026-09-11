# Builder contract system

Status: Planning phase / todo

When builders are hired to build for other players, they shouldn't have to rely on honesty, and owners shouldn't have to worry about builders defrauding them or holding land hostage

We need an in-game trading/escrow system that acts as a neutral third party

## Core concepts

### 1. Escrow & payment
- The owner puts the agreed-upon payment into escrow when creating the contract
- The builder knows the funds are secured
- Payment is released when both parties agree the job is complete, OR through a dispute resolution mechanism

### 2. Temporary work zones (subclaims)
- The owner creates a designated 'work zone' within their claim
- The boundary of this zone can be visualized with special particles (similar to the subchunk cubed grid for claims, but a different particle) that only the owner and the hired builder can see
- The builder gets special build permissions only within this work zone

### 3. Preventing fraud & hostage situations
- Owner incentive to pay: While the builder is hired, the owner's own permissions within the work zone are suspended. This prevents the owner from just taking the build without paying, as they want their land back
- Builder hostage prevention: If the builder doesn't finish the job, there must be a mechanism to cancel the contract. Perhaps a time limit, or an arbitration system, so the builder cannot hold the land ransom indefinitely
- Useless builds: If the builder makes something useless and the owner doesn't need permissions there anyway, the owner might abandon the subclaim. To prevent this, the escrow system might automatically refund the owner if the builder fails to deliver within a timeframe, or automatically pay the builder if the owner ignores the completion request for too long

## Next steps
- [ ] Design the UI/UX for proposing a contract (owner -> builder)
- [ ] Implement temporary subclaims with exclusive builder permissions
- [ ] Implement particle rendering for work zones
- [ ] Design the escrow logic (deposit, release, cancel, dispute)
