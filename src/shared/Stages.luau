-- Course layout. Each stage is a list of pieces placed relative to that stage's checkpoint.
-- Course runs along +Z. Kinds: "platform", "hazard" (kills), "blink" (flickers on/off).
-- Default jump clears about 6-8 studs of gap; keep gaps in that range for young players.

local function p(x, y, z, sx, sz, kind)
	return { pos = Vector3.new(x, y, z), size = Vector3.new(sx or 8, 1, sz or 8), kind = kind or "platform" }
end

local Stages = {
	{
		name = "Boot Sequence",
		pieces = { p(0, 0, 14), p(0, 0, 28), p(0, 1, 42), p(0, 2, 56) },
	},
	{
		name = "Packet Hop",
		pieces = { p(-6, 0, 14, 6, 6), p(6, 1, 26, 6, 6), p(-6, 2, 38, 6, 6), p(6, 3, 50, 6, 6), p(0, 3, 62) },
	},
	{
		name = "Corrupted Sector",
		pieces = {
			p(0, 0, 18, 8, 16),
			p(0, 0.6, 18, 8, 2, "hazard"),
			p(0, 0, 36, 8, 12),
			p(-2, 0.6, 34, 4, 2, "hazard"),
			p(2, 0.6, 40, 4, 2, "hazard"),
			p(0, 1, 52),
		},
	},
	{
		name = "Firewall Flicker",
		pieces = { p(0, 0, 14, 8, 8, "blink"), p(0, 1, 28, 8, 8, "blink"), p(0, 2, 42, 8, 8, "blink"), p(0, 2, 56) },
	},
	{
		name = "Server Core",
		pieces = {
			p(0, 0, 14, 4, 4),
			p(0, 2, 26, 4, 4),
			p(0, 4, 38, 4, 4),
			p(0, 4, 52, 12, 14),
			p(-3, 4.6, 52, 2, 14, "hazard"),
			p(3, 4.6, 52, 2, 14, "hazard"),
			p(0, 5, 68),
		},
	},
}

return Stages
