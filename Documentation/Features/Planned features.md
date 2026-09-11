# Planned features

This document tracks upcoming features and systems that are in the planning stage

## 1. Builder contract & escrow system
Goal: Allow players to hire builders trustlessly, without risking fraud or hostage situations over land
Key components:
- Escrow: Payment is locked up front and released upon completion or arbitration
- Work zones (subclaims): Temporary, particle-bordered zones within a claim where the hired builder has exclusive permissions, and the owner's permissions are temporarily suspended
- Dispute resolution: Mechanisms to cancel or force-complete jobs if a party goes inactive or attempts to scam
- Read more: [[Builder contract system]]

## 2. Jigsaw structure overrides
Goal: Naturally generate vaults and ominous vaults in the world without requiring a custom structure generation script that causes lag
Method: Override vanilla `.mcstructure` files (like pillager outpost cages) to include vaults instead of chests

## 3. Economy shop
Goal: Provide a stable supply of building materials and a sink for currency
Method: A UI shop where builders can spend their earned currency to buy base logs, stone variants, dyes, and specialty blocks
