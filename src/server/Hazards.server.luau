-- Hazard parts kill on touch; Blink platforms flicker on a timer.
local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")

local BLINK_ON = 2.0
local BLINK_OFF = 1.2

local function hookHazard(part)
	part.Touched:Connect(function(hit)
		local character = hit.Parent
		if not character or not Players:GetPlayerFromCharacter(character) then
			return
		end
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid and humanoid.Health > 0 then
			humanoid.Health = 0
		end
	end)
end

local function setVisible(part, visible)
	part.CanCollide = visible
	part.Transparency = visible and 0 or 0.85
	local rim = part:FindFirstChild("Rim")
	if rim then
		rim.Transparency = visible and 0 or 0.7
	end
end

local function hookBlink(part)
	task.spawn(function()
		task.wait(part:GetAttribute("BlinkOffset") or 0)
		while part.Parent do
			setVisible(part, true)
			task.wait(BLINK_ON)
			setVisible(part, false)
			task.wait(BLINK_OFF)
		end
	end)
end

for _, part in CollectionService:GetTagged("Hazard") do
	hookHazard(part)
end
CollectionService:GetInstanceAddedSignal("Hazard"):Connect(hookHazard)

for _, part in CollectionService:GetTagged("Blink") do
	hookBlink(part)
end
CollectionService:GetInstanceAddedSignal("Blink"):Connect(hookBlink)
