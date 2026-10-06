-- Top-of-screen banner showing the current stage, with a pop when it changes.
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Theme = require(ReplicatedStorage.Shared.Theme)
local Stages = require(ReplicatedStorage.Shared.Stages)

local player = Players.LocalPlayer
local stageValue = player:WaitForChild("leaderstats"):WaitForChild("Stage")

local gui = Instance.new("ScreenGui")
gui.Name = "StageHud"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local banner = Instance.new("TextLabel")
banner.AnchorPoint = Vector2.new(0.5, 0)
banner.Position = UDim2.new(0.5, 0, 0, 12)
banner.Size = UDim2.new(0, 360, 0, 48)
banner.BackgroundColor3 = Theme.Base
banner.BackgroundTransparency = 0.15
banner.TextColor3 = Theme.Text
banner.Font = Enum.Font.GothamBlack
banner.TextScaled = true
banner.Parent = gui

Instance.new("UICorner", banner).CornerRadius = UDim.new(0, 12)
local stroke = Instance.new("UIStroke", banner)
stroke.Color = Theme.Structure
stroke.Thickness = 2
local padding = Instance.new("UIPadding", banner)
padding.PaddingLeft = UDim.new(0, 12)
padding.PaddingRight = UDim.new(0, 12)
padding.PaddingTop = UDim.new(0, 6)
padding.PaddingBottom = UDim.new(0, 6)

local scale = Instance.new("UIScale", banner)

local function refresh(animate)
	local stage = stageValue.Value
	if stage > #Stages then
		banner.Text = "SERVER RESTORED!"
		stroke.Color = Theme.Accent
	else
		banner.Text = string.format("STAGE %d · %s", stage, string.upper(Stages[stage].name))
		stroke.Color = Theme.Structure
	end
	if animate then
		scale.Scale = 1.25
		TweenService:Create(scale, TweenInfo.new(0.35, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	end
end

refresh(false)
stageValue.Changed:Connect(function()
	refresh(true)
end)
