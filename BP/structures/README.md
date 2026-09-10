# Jigsaw structure overrides

This folder (`BP/structures/`) is the foundation for injecting **Vaults** and **Trial Spawners** into vanilla structures naturally

## How it works
Bedrock Edition allows you to override any vanilla `.mcstructure` file by simply placing a file with the exact same name and folder path inside this behavior pack's `structures` folder

This only works for **Jigsaw structures** because they are assembled piece by piece using `.mcstructure` files
Hardcoded structures (like Desert Temples) do not use these files and cannot be overridden this way

## Supported jigsaw structures
* Ancient Cities
* Bastion Remnants
* Pillager Outposts
* Ruined Portals
* Trial Chambers
* Villages

## Step-by-step guide
1. Load up a creative test world with your add-on installed
2. Find the exact `.mcstructure` name for the room/piece you want to modify (e.g. `pillager_outpost/feature_cage1`). You can find the original files in the vanilla behavior pack samples
3. Give yourself a Structure Block (`/give @s structure_block`)
4. Load the vanilla structure piece into the world using the Structure Block (set to Load mode, type the exact name)
5. Physically place your **Vaults** or **Trial Spawners** inside the structure where you want them
6. Use the Structure Block (set to Save mode) to save the structure to disk
7. Click the **Export** button in the Structure Block UI to save the `.mcstructure` file to your computer
8. Place the exported `.mcstructure` file into this folder (`BP/structures/`), mimicking the vanilla folder structure (e.g. `BP/structures/pillager_outpost/feature_cage1.mcstructure`)

When the game generates new chunks, it will use your modified file containing the Vaults instead of the vanilla piece