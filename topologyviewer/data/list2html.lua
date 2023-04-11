
local pipe = assert(io.popen('ls -1 *.data','r'))
local list = pipe:read('*all')
pipe:close()

for line in list:gmatch('(%S+)\n') do
	print(string.format('<option value="./data/%s" > %s </option>',line,line))
end
