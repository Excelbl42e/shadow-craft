-- Builds the whole obby from Shared.Stages, so no parts need to be placed by hand.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Theme = require(ReplicatedStorage.Shared.Theme)
local Stages = require(ReplicatedStorage.Shared.Stages)

local START = Vector3.new(0, 20, 0)
local GAP_TO_NEXT = Vector3.new(0, 0, 14)

-- Clear the default template pieces so the gray baseplate doesn't break the look.
for _, child in workspace:GetChildren() do
	if child.Name == "Baseplate" or child:IsA("SpawnLocation") then
		child:Destroy()
	end
end

local course = Instance.new("Folder")
course.Name = "Course"
course.Parent = workspace

local checkpoints = Instance.new("Folder")
checkpoints.Name = "Checkpoints"
checkpoints.Parent = course

local function makePart(props, parent)
	local part = Instance.new("Part")
	part.Anchored = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	for key, value in props do
		part[key] = value
	end
	part.Parent = parent
	return part
end

-- Dark platform with a glowing cyan rim underneath (the Tron look).
local function makePlatform(position, size, parent)
	local body = makePart({
		Name = "Platform",
		Size = size,
		Position = position,
		Color = Theme.Base,
		Material = Enum.Material.SmoothPlastic,
	}, parent)
	makePart({
		Name = "Rim",
		Size = size + Vector3.new(0.6, -0.8, 0.6),
		Position = position - Vector3.new(0, 0.45, 0),
		Color = Theme.Structure,
		Material = Enum.Material.Neon,
		CanCollide = false,
	}, body)
	return body
end

local function makeCheckpoint(index, position)
	local pad = makePart({
		Name = "Checkpoint" .. index,
		Size = Vector3.new(12, 1, 12),
		Position = position,
		Color = Theme.Accent,
		Material = Enum.Material.Neon,
	}, checkpoints)
	pad:SetAttribute("Stage", index)
	return pad
end

local function makeHazard(position, size, parent)
	local part = makePart({
		Name = "Hazard",
		Size = size,
		Position = position,
		Color = Theme.Hazard,
		Material = Enum.Material.Neon,
	}, parent)
	part:AddTag("Hazard")
	return part
end

local function makeBlink(position, size, parent, offset)
	local part = makePlatform(position, size, parent)
	part:AddTag("Blink")
	part:SetAttribute("BlinkOffset", offset)
	return part
end

local origin = START
for index, stage in Stages do
	local folder = Instance.new("Folder")
	folder.Name = string.format("Stage%02d", index)
	folder.Parent = course

	makeCheckpoint(index, origin)

	local last = Vector3.zero
	for pieceIndex, piece in stage.pieces do
		local position = origin + piece.pos
		if piece.kind == "hazard" then
			makeHazard(position, piece.size, folder)
		elseif piece.kind == "blink" then
			makeBlink(position, piece.size, folder, pieceIndex * 0.7)
		else
			makePlatform(position, piece.size, folder)
		end
		if piece.pos.Z >= last.Z then
			last = piece.pos
		end
	end

	origin = origin + last + GAP_TO_NEXT
end

-- Finish pad counts as the checkpoint after the last stage.
makeCheckpoint(#Stages + 1, origin)

local spawn = Instance.new("SpawnLocation")
spawn.Name = "CourseSpawn"
spawn.Anchored = true
spawn.Size = Vector3.new(6, 1, 6)
spawn.Position = START + Vector3.new(0, 0.5, 0)
spawn.Transparency = 1
spawn.CanCollide = false
spawn.Duration = 0
spawn.Parent = course

-- Kill floor far below, styled as a grid void.
local void = makePart({
	Name = "Void",
	Size = Vector3.new(600, 1, 2000),
	Position = Vector3.new(0, -30, 800),
	Color = Theme.Base,
	Material = Enum.Material.SmoothPlastic,
}, course)
void:AddTag("Hazard")

workspace:SetAttribute("CourseReady", true)
