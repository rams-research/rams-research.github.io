
local atoms = {}
local residues = {
	getid = function(resname,resseq) return string.format('%s %d',resname,resseq) end
}

local trim = function(str) return str:match('(%S+)') end
local tbuff = {}
local split = function(str)
	for k=1,#tbuff do tbuff[k] = nil end
	for w in str:gmatch('%S+') do tbuff[#tbuff+1] = w end
	return tbuff
end

print('ATOMS')
do
local oldresid = false
for line in io.lines(arg[1]) do if line:sub(1,6) == 'ATOM  ' then
	local name = trim(line:sub(13,16))
	local resname = trim(line:sub(18,20))
	local resseq = trim(line:sub(23,26))

	local resid = residues.getid(resname,resseq)
	if oldresid ~= resid then
		local t = {resname,resseq,{}}
		residues[#residues+1] = t
		residues[resid] = t
		oldresid = resid
	end

	local x = trim(line:sub(31,37))
	local y = trim(line:sub(39,46))
	local z = trim(line:sub(47,54))
	local element = trim(line:sub(77,78))

	atoms[#atoms+1] = {name,x,y,z,#residues,{}}
end end

local oldresnum = 1
for k=1,#atoms do
	local name,x,y,z,resnum,data = table.unpack(atoms[k])
	if resnum ~= oldresnum then
		print''
		oldresnum = resnum
	end
	print(string.format('%s %.6f %.6f %.6f',name,x,y,z))
end
end

print''

do
print('RESIDUES')
for line in io.lines(arg[2]) do
	--print(line)
	local w = split(line)
	local resname,resseq,cutoff,curvature = w[1],w[2],w[3],w[5]
	local resid = residues.getid(resname,resseq)
	local res = residues[resid]
	local data = res[3]
	data[#data+1] = {cutoff,curvature}
	--print(resid,data,cutoff,curvature)
end
local sort = function(a,b) return tonumber(a[1]) < tonumber(b[1]) end
for k=1,#residues do table.sort(residues[k][3],sort) end

--print('RESNAME RESSEQ')
local oldres = false
for k=1,#residues do
	local resname,resseq,data = table.unpack(residues[k])
	print(string.format('%s %d',resname,resseq))
	for i=1,#data do
		local cutoff,curvature = table.unpack(data[i])
		print(string.format(' %.2f %.2f',cutoff,curvature))
	end
	print''
end
end

