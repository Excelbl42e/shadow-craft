-- Night-time neon look: dark sky, bloom so Neon parts glow.
local Lighting = game:GetService("Lighting")
local Theme = require(game:GetService("ReplicatedStorage").Shared.Theme)

Lighting.ClockTime = 0
Lighting.Brightness = 1
Lighting.Ambient = Color3.fromRGB(20, 25, 50)
Lighting.OutdoorAmbient = Color3.fromRGB(20, 25, 50)
Lighting.GlobalShadows = false
Lighting.FogColor = Theme.Base
Lighting.FogStart = 150
Lighting.FogEnd = 600

local bloom = Lighting:FindFirstChildOfClass("BloomEffect") or Instance.new("BloomEffect")
bloom.Intensity = 1
bloom.Size = 30
bloom.Threshold = 0.8
bloom.Parent = Lighting

local cc = Lighting:FindFirstChildOfClass("ColorCorrectionEffect") or Instance.new("ColorCorrectionEffect")
cc.Saturation = 0.2
cc.Contrast = 0.1
cc.Parent = Lighting
