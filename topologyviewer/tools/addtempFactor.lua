
local filename = arg[1]

for line in io.lines(filename) do
	local str = line
	if line:find('^ATOM  ') then
		str = line:sub(1,60)..string.format('%6.2f',math.random()*100)..line:sub(67,#line)
	end
	print(str)
end
