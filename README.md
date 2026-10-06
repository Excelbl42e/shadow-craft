# shadow-craft

A Tron-style neon obby for Roblox: you play a data packet racing to bring a downed server back online.
The code lives here and gets synced into Roblox Studio with [Rojo](https://rojo.space).

## One-time setup

1. **Install Roblox Studio** from create.roblox.com.
2. **Install the Rojo Studio plugin**: in Studio, open the Creator Store (Toolbox → Plugins), search **Rojo**, and install the one by *rojo-rbx* / *Rojo*.
3. **Install the Rojo command-line tool** (pick one):
   - Easiest: install the **Rojo** extension in **VS Code** (free). It can install and run Rojo for you.
   - Or install [Rokit](https://github.com/rojo-rbx/rokit), then run `rokit install` in this folder (it reads `rokit.toml`).
4. **Get this code onto your PC**: install [GitHub Desktop](https://desktop.github.com), clone `shadow-craft`, and switch to the branch with the latest code.

## Every time you work on the game

1. Open the `shadow-craft` folder in a terminal (or VS Code) and run:
   ```
   rojo serve
   ```
2. In Studio, open a **Baseplate** place, click the **Rojo** plugin button, and press **Connect**.
3. Press **Play**. The course builds itself. Edits to files in `src/` show up in Studio instantly.
4. When there's new code from Claude, click **Fetch/Pull** in GitHub Desktop and it syncs right away.

> Saving progress (DataStores) only works once the game is published and
> **Game Settings → Security → Enable Studio Access to API Services** is on.

## Project layout

| File | What it does |
|---|---|
| `src/shared/Theme.luau` | 60-30-10 colors: dark navy, cyan neon, orange accent |
| `src/shared/Stages.luau` | **The level layouts.** Add a stage here to add a level. |
| `src/server/CourseBuilder.server.luau` | Builds the course from `Stages.luau` |
| `src/server/Hazards.server.luau` | Red "corrupted data" kills; flickering firewall platforms |
| `src/server/Progress.server.luau` | Stage counter, checkpoints, saving, respawn |
| `src/server/Lighting.server.luau` | Night sky and bloom glow |
| `src/client/StageHud.client.luau` | Stage banner at the top of the screen |
