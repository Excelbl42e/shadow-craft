-- Tracks each player's stage, saves it, and respawns them at their checkpoint.
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")

local store = DataStoreService:GetDataStore("ObbyProgress_v1")

if not workspace:GetAttribute("CourseReady") then
	workspace:GetAttributeChangedSignal("CourseReady"):Wait()
end
local checkpoints = workspace.Course.Checkpoints

local function keyFor(player)
	return "stage_" .. player.UserId
end

local function getPad(stage)
	return checkpoints:FindFirstChild("Checkpoint" .. stage) or checkpoints:FindFirstChild("Checkpoint1")
end

local function onCharacterAdded(player, character)
	local root = character:WaitForChild("HumanoidRootPart")
	task.wait() -- let the default spawn finish before moving
	local pad = getPad(player.leaderstats.Stage.Value)
	root.CFrame = pad.CFrame + Vector3.new(0, 4, 0)
end

local function onPlayerAdded(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local stage = Instance.new("IntValue")
	stage.Name = "Stage"
	stage.Value = 1
	stage.Parent = leaderstats

	-- DataStores only work in a published game with Studio API access enabled; fail quietly otherwise.
	local ok, saved = pcall(store.GetAsync, store, keyFor(player))
	if ok and typeof(saved) == "number" then
		stage.Value = math.clamp(saved, 1, #checkpoints:GetChildren())
	end

	player.CharacterAdded:Connect(function(character)
		onCharacterAdded(player, character)
	end)
	if player.Character then
		onCharacterAdded(player, player.Character)
	end
end

local function save(player)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		return
	end
	pcall(store.SetAsync, store, keyFor(player), leaderstats.Stage.Value)
end

for _, pad in checkpoints:GetChildren() do
	pad.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if not player or not player:FindFirstChild("leaderstats") then
			return
		end
		local stage = player.leaderstats.Stage
		-- Only the next checkpoint counts, so stages can't be skipped.
		if pad:GetAttribute("Stage") == stage.Value + 1 then
			stage.Value += 1
		end
	end)
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in Players:GetPlayers() do
	task.spawn(onPlayerAdded, player)
end

Players.PlayerRemoving:Connect(save)
game:BindToClose(function()
	for _, player in Players:GetPlayers() do
		save(player)
	end
end)
