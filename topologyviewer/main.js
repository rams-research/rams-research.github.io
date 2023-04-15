import  "./js/three.min.js";
import { TrackballControls } from './js/TrackballControls.js';
import { GUI } from './js/lil-gui.module.min.js'

// GLOBAL OBJECTS

let canvas, container, renderer, scene, camera, group, gui;

function colorFont(color,str) { return `<h8 style="color:${color};"> ${str} </h8>`}

function fFixed(float,n) { return parseFloat(parseFloat(float).toFixed(n)) }
function distanceFixed(float) { return fFixed(float,1) }
function curvatureFixed(float) { return fFixed(float,2) }

let particles = new Proxy({
	residues: {
		name: [],
		sequence: [],
		curvature: [],
	},
	coordinates: [],
	name: [],
	resid: [],
	resseq: new Proxy({},{
		get: function (obj,prop) { return particles.residues.sequence[particles.resid[prop]] },
		set: function (obj,prop,value) { particles.residues.sequence[particles.resid[prop]] = value; return true },
	}),
	resname: new Proxy({},{
		get: function(obj,prop) { return particles.residues.name[particles.resid[prop]] },
		set: function(obj,prop,value) { particles.residues.name[particles.resid[prop]] = value; return true },
	}),
	curvature: function(i,cutoff) {
		const curvature = particles.residues.curvature;
		const resid = particles.resid[i];
		return curvature[resid][cutoff];
	},
	charge: new Proxy({
			'H':1.0,
			'O':8.0,
			'N':7.0, 
			'C':6.0,
			'S':16.0
		},{
			get: function(obj,prop) { const n = particles.name[prop].slice(0,1); return n in obj ? obj[n] : 1.0 }
		}
	),
	dispose: function () {
		particles.coordinates.length = 0;
		particles.coordinates = [];
		
		particles.name.length = 0;
		particles.name = [];
		
		particles.resid.length = 0;
		particles.resid = [];
		
		particles.residues.name.length = 0;
		particles.residues.name = [];
		
		particles.residues.sequence.length = 0;
		particles.residues.sequence = [];
		
		particles.residues.curvature.length = 0;	
		particles.residues.curvature = [];
	}
	},{
	get: function(obj,prop) {
		if (prop in obj) { return obj[prop] }
		if (prop == "count") { return particles.name.length }
	}
});

const palette = {
	default: 'bilbao',
	numColor: function(){ return this[this.default].length },
	jet:    ['#000000','#000080','#0000ff','#0080ff','#00ffff','#80ff80','#ffff00','#ff8000','#ff0000','#000000'], // jet.pal + black
	pour:   ['#B35806','#E08214','#FDB863','#FEE0B6','#D8DAEB','#B2ABD2','#8073AC','#542788'], // pour.pal
	dark2:  ['#1B9E77','#D95F02','#7570B3','#E7298A','#66A61E','#E6AB02','#A6761D','#666666','#800000','#000000'], // black + dark2.al
	paired: ['#000000','#003bd1','#1F78B4','#B2DF8A','#33A02C','#FB9A99','#E31A1C','#FDBF6F','#FF7F00','#000000'], //paired.pal
	bilbao: [
		'#BF5B17', // orange
		'#F0027F', // pink
		'#003bd1', // Bilbao blue
		'#32CD32', // lime
		//'#ffdf38', // light gold
		//'#000000', // black
		'#ffa500', // orange
		'#800080', // purple
		],
	pickColor: function (c) {
		
		const def = this[this.default];
		const numColor = this.numColor();
		
		const num = numColor - 1;
		
		const min = document.getElementById("mincurvature").value;
		const max = document.getElementById("maxcurvature").value;
		
		console.assert(min && max,`palette.pickColor(${c}) was not able to read mincurvature=${min} and/or maxcuravature=${max}.`);
		
		const bin = (max - min)/num;
		let d = Math.floor((c-min)/bin + 0.5);
		
		d = d < 0 ? 0 : d;
		d = d > num ? num : d;
		
		const str = def[d];
		if (! str) {console.log('PALETTE STR PROBLEM AT d=',d,'C=',c,'numColor=',numColor,'max=',max,'min=',min)}
		
		const r = parseInt(str.slice(1,3),16)/255;
		const g = parseInt(str.slice(3,5),16)/255;
		const b = parseInt(str.slice(5,7),16)/255;
		
		return [r,g,b,str]
	}
}

async function parsedata(filename) {
	try {
		console.log('######################################################################################');
		let response = await fetch(filename);
		let text = await response.text();
		let rescount = 0;
		let atmcount = 0;
		let atmrescount = 0;
		let state = false;
		
		const lines = text.split( '\n' );
		const residue = particles.residues;
		
		let minCurvature = false;
		let maxCurvature = false;
		let minDistance = false;
		let maxDistance = false;
		
		let resname = '';
		let resseq = '';
		
		for ( let i = 0, l = lines.length; i < l; i ++ ) {
			let line = lines[i]
			if      (line == 'ATOMS')    { state = 'ATOMS';  atmcount = 0; atmrescount = 0;}
			else if (line == 'RESIDUES') { state = 'RESIDUES'; rescount = 0;}
			else if (line == 'EDGES') { state = 'EDGES';}
			else if (state == 'ATOMS')   {
				if (line == '') { atmrescount++; }
				else {
					const split = line.split(' ');
				
					const name = split[0];
					const x = parseFloat(split[1]);
					const y = parseFloat(split[2]);
					const z = parseFloat(split[3]);
					
					particles.coordinates.push(x,y,z);
					particles.name.push(name);
					particles.resid.push(atmrescount);
				}
			} else if (state == 'EDGES') {
				const split = line.split(' ');
				if (split.length == 3){
					const i = parseInt(split[0])-1;
					const j = parseInt(split[1])-1;
					const d = parseFloat(split[2]);
					console.assert(i>=0 && i<particles.count,"Wrong particle number in EDGES list with i="+i );
					console.assert(j>=0 && j<particles.count,"Wrong particle number in EDGES list with j="+j );
					console.assert(d>0,"Wrong distance in EDGES list with d="+d);
					
					filtration.list.push([i,j,d]);
				}
			} else if (state == 'RESIDUES') {
				if (line == '') { rescount++; }
				else if (line.substring(0,1) == ' ') { /* data */
					const split = line.split(' ');
					
					const cutoff = parseFloat(split[1]);
					const curv = parseFloat(split[2]);
					
					residue.curvature[rescount][cutoff] = curv;
					
					minDistance = Math.min(cutoff,minDistance || cutoff);
					maxDistance = Math.max(cutoff,maxDistance || cutoff);
					
					maxCurvature = Math.max(curv,maxCurvature || curv);
					minCurvature = Math.min(curv,minCurvature || curv);
				} else {
					const split = line.split(' ');
					resname = split[0];
					resseq = parseInt(split[1]);

					residue.name.push(resname);
					residue.sequence.push(resseq);
					residue.curvature.push(new Proxy({},{
						get: function (obj, cutoff) { return obj[distanceFixed(cutoff)] },
						set: function (obj, cutoff, curvature) { obj[distanceFixed(cutoff)] = curvature; return true }
					}));
				}
			}
		}
		
		console.log('minCurvature',minCurvature);
		console.log('maxCurvature',maxCurvature);
		console.log('minDistance',minDistance);
		console.log('maxDistance',maxDistance);
		console.log('particles.count',particles.count, '-->', particles.count * 3, 'positions');
		console.log('filtration.list.length',filtration.list.length);
		console.assert(particles.count*3 == particles.coordinates.length, 'Wrong length of particles.coordinates');
		console.assert(atmrescount+1 == rescount,'Wrong number of residues, rescount='+rescount+' atmrescount='+atmrescount);
		
		filtration.maxCurvature = maxCurvature;
		filtration.minCurvature = minCurvature;
		filtration.minDistance = minDistance;
		filtration.maxDistance = maxDistance;
		
		console.log('######################################################################################');
		return 'ok'
	} catch (e) {
		document.getElementById("info").innerHTML =  "<p><b>Sorry, an error occurred reading files :<br>" + e + "</b></p>";
		console.log(e);
	}
}

const curvatureButtons = {
	elements: {count: 0},
	setColor: function(element,color) {
		if (this.elements[color]) {
			element.style["background-color"] = 'white';
			element.style["color"] = 'black';
			this.elements[color] = false;
			this.elements.count -= 1;
		} else {
			element.style["background-color"] = color;
			element.style["color"] = 'white';
			this.elements[color] = true;
			this.elements.count += 1;
		}
	},
	insert: function() {
		
		function f(color) {
			const str = `<button
					onclick="setColorButton(this,'${color}')"
					id="buttonColor${color}"
					class="w3-button w3-small w3-round" 
					type="button"
					style="padding: 0px 15px 0px 15px; border: 1px solid ${color}; margin: 0px 2px; background-color: white; font-family: monospace"
				      >
				      ...
				      </button>`;
			return str
		}
		
		let str = '';
		let count = 0;
		const pal = palette[palette.default];
		for(let k=0;k<pal.length;k++){
			count += 1;
			str += f(pal[k]);
			if (count == 3) {count=0; str+="<br>"}
		}
		str += `<button id="ButtonColorUpdataStatistics" class="w3-button w3-border" type="button" style="width:auto;"> Update based on statitistics</button>`
		
		document.getElementById("pickcolorbutton").innerHTML = str;
		
		document.getElementById("ButtonColorUpdataStatistics").addEventListener('click',
			function() { 
				document.getElementById("mincurvature").value = filtration.avgCurv - 2*filtration.stdCurv;
				document.getElementById("maxcurvature").value = filtration.avgCurv + 2*filtration.stdCurv;
				filtration.stat(); 
				curvatureButtons.update(); 
				filtration.update();
		});
		
		for (const prop in this.elements) { if (prop != 'count') { this.elements[prop] = false; } }
		this.elements.count = 0;
	},
	update: function() {
		//console.log("DEBUG curvatureButtons.update();")
		function pad(pad, num, padLeft) {
			let str = num.toFixed(2);
			if (num >= 0.0) str = '+'+str;
			if (typeof str === 'undefined') return pad;
			if (padLeft) {return (pad + str).slice(-pad.length);
			} else {return (str + pad).substring(0, pad.length);}
		}
		
		const min = parseFloat(document.getElementById("mincurvature").value);
		const max = parseFloat(document.getElementById("maxcurvature").value);
		//console.log("DEBUG",min,max);
		
		const bin = Math.abs(max-min)/palette.numColor();
		for (let c = (min+bin/2); c < max; c += bin) {
			const curv = curvatureFixed(c);
			const rgb = palette.pickColor(curv);
			document.getElementById(`buttonColor${rgb[3]}`).innerHTML = pad("00000",curv);
		}
	}
}

const aminoacidButtons = {
	elements: {count: 0},
	setColor: function(element,aa) {
		if (this.elements[aa]) {
			element.style["background-color"] = 'white';
			this.elements[aa] = false;
			this.elements.count -= 1;
		} else {
			element.style["background-color"] = 'gray';
			this.elements[aa] = true;
			this.elements.count += 1;
		}
	},
	insert: function() {
		function g(aa) {
			const str = `<button
					onclick="setAAColorButton(this,'${aa}')" 
					class="w3-button w3-small w3-round" 
					type="button" 
					style="padding: 0px 15px 0px 15px; border: 1px solid black; margin: 0px 2px; background-color: white; font-family: monospace"
				      >
				      ${colorFont('black',aa)}
				      </button>`;
			return str
		}
		let row = '';
		row += g('ARG'); row += g('HIS'); row += g('LYS');
		row += g('ASP'); row += g('GLU');
		row += '<br>'
		row += g('SER'); row += g('THR'); row += g('ASN'); row += g('GLN');
		row += '<br>'
		row += g('CYS'); row += g('SEC'); row += g('GLY'); row += g('PRO');
		row += '<br>'
		row += g('ALA'); row += g('ILE'); row += g('LEU'); row += g('MET'); row += g('PHE'); row += g('TRP'); row += g('TYR'); row += g('VAL');
		document.getElementById("pickaabutton").innerHTML = row;
		
		for (const prop in this.elements) { if (prop != 'count') { this.elements[prop] = false; } }
		this.elements.count = 0;
	}
}

const filtration = {
	updateEdgesColors: true,
	updateTubeColors: true,
	cutoff: false,
	minCurvature: 0.0,
	maxCurvature:  0.0,
	minDistance: 0.0,
	maxDistance: 0.0,
	list: [],
	avgCurv: false,
	stdCurv: false,
	avgSelectedCurv: false,
	stdSelectedCurv: false,
	residueIsSelected: function(res) {
		const name = particles.residues.name[res];
		const curv = particles.residues.curvature[res][filtration.cutoff];
		//console.log('DEBUG',name,curv);
		const rgb = palette.pickColor(curv);
		return !((curvatureButtons.elements.count > 0 && ! curvatureButtons.elements[rgb[3]])
		     || (aminoacidButtons.elements.count > 0 && ! aminoacidButtons.elements[name])
		       )
	},
	stat: function() {
		//console.log("filtration.stat()");
		function stat() {
			let count = 0;
			let mean = 0.0;
			let M2 = 0.0;
			return function(c) {
				if (!c) {return count > 0 ? [count,mean,Math.sqrt(M2/count)] : [false,false,false]}
				count += 1;
				const delta = c - mean;
				mean += delta / count;
				const delta2 = c - mean;
				M2 += delta * delta2;
			}
		}
		
		let statAll = stat();
		let statSelected = stat();
		
		let sumAll = 0.0;
		let sumSelected = 0.0;
		console.assert(particles.residues.name.length == particles.residues.curvature.length,"WRONG CURVATURES ARRAY LENGTH");
		
		const max = document.getElementById("maxcurvature").value;
		const min = document.getElementById("mincurvature").value;
		
		for (let i=0; i<particles.residues.name.length; i++) {
			let curv = particles.residues.curvature[i][filtration.cutoff];
			statAll(curv);
			if (max && min && this.residueIsSelected(i)) { statSelected(curv) }
		}
		
		statAll = statAll();
		statSelected = statSelected();
		
		this.avgCurv = statAll[1];
		this.stdCurv = statAll[2];
		this.avgSelectedCurv = statSelected[1] || this.avgCurv;
		this.stdSelectedCurv = statSelected[2] || this.stdCurv;
	},
	update: function() {
		//console.log("filtration.update();");
		function boxedStr(color,str) {
			return `<div class="w3-round" style="padding: 0px 15px 0px 15px; border: 1px solid ${color}; margin: 1px 2px;"> ${str} </div>`
		}
		
		const color1 = palette.pickColor(this.avgCurv)[3];
		const color2 = palette.pickColor(this.avgSelectedCurv)[3];
		
		document.getElementById("infoeuler").innerHTML = ""
			+ boxedStr(color1,`<b>Curvature per residue</b><br> Mean: ${curvatureFixed(this.avgCurv)}    | StdDev: ${curvatureFixed(this.stdCurv)} <br>`)
			+ boxedStr(color2,`<b>Curvatures highlighted</b><br>Mean: ${curvatureFixed(this.avgSelectedCurv)}   | StdDev: ${curvatureFixed(this.stdSelectedCurv)} <br>`);
			
		points.colors();
		edges.colors(this.updateEdgesColors);
		edges.update();
		tube.colors(this.updateTubeColors);
	},
	init: function() {
		console.log('Filtration init...');
		const list = this.list;
		this.list.sort(function(a,b){ return a[2] > b[2]});
		
		console.log( '\tThis molecule has a maximum of ' + list.length + ' edges ');
		
		function onCutoffUpdate() {
			filtration.cutoff = parseFloat(this.value);
			document.getElementById("cutoffvalue").value = this.value;
			document.getElementById("cutoffinput").value = this.value;
			filtration.stat();
			filtration.update();
		}
		
		this.cutoff = this.cutoff ? this.cutoff : (this.maxDistance - this.minDistance)/2;
		
		document.getElementById("infomincutoff").innerHTML=`minCutoff: ${distanceFixed(this.minDistance)}`
		document.getElementById("infomaxcutoff").innerHTML=`maxCutoff: ${distanceFixed(this.maxDistance)}`
		document.getElementById("infomincurvature").innerHTML=`minCurvature: ${curvatureFixed(this.minCurvature)}`
		document.getElementById("infomaxcurvature").innerHTML=`maxCurvature: ${curvatureFixed(this.maxCurvature)}`
		
		const range = document.getElementById("cutoffvalue");
		range.max = this.maxDistance;
		range.min = this.minDistance;
		range.step = 0.1;
		range.value = filtration.cutoff;
		range.addEventListener('input',onCutoffUpdate);
		
		const input = document.getElementById("cutoffinput");
		input.value = filtration.cutoff;
		input.addEventListener('change',onCutoffUpdate);
		
		document.getElementById("mincurvature").value = this.minCurvature; 
		document.getElementById("maxcurvature").value = this.maxCurvature;
	},
	dispose: function() {
		filtration.list.length = 0;
		filtration.list = [];
	}
}

const tube = {
	pathdata: [],
	path: false,
	geometry: false,
	mesh: false,
	material: false,
	visible: true,
	segmentsMultiply: 3,
	radius: 0.10,
	radialSegments: 5,
	//color: 0x000000,
	transparent: false,
	opacity: 1.0,
	nnodes: 1,
	showMarker: false,
	markerMesh: new THREE.Mesh(new THREE.SphereBufferGeometry(0.25), new THREE.MeshBasicMaterial({color: 0xff0000, visible:true})),
	init: function() {
		console.log('Tube init...');
		const coords = [];
		const translate = points.geometry.getAttribute('translate');
		for(let k=0; k<translate.count; k++) {
			const name = particles.name[k];
			if (name == 'CA' || name == 'C' || name == 'N') {
			//if (name == 'N') {
				const x = translate.array[3*k + 0];
				const y = translate.array[3*k + 1];
				const z = translate.array[3*k + 2];
				coords.push(new THREE.Vector3(x,y,z));
				this.pathdata.push(k,x,y,z);
			}
		}
		this.nnodes = coords.length;
		this.path = new THREE.CatmullRomCurve3(coords, false, 'catmullrom', 0.8);
		
		this.material = new THREE.MeshPhysicalMaterial( {
			//color: this.color,
			//fog: false,
			//blending: THREE.AdditiveBlending,
			transparent: this.transparent,
			opacity: this.opacity,
			vertexColors: true,
			side:THREE.DoubleSide,
			wireframe: false,
			// Physical below
			clearcoat: 0.5,
			clearcoatRoughness: 0.5,
			reflectivity: 0.5,
			metalness: 0.5,
			roughness: 0.5,
		} );
		
		this.updategeometry();
		
		this.mesh =  new THREE.Mesh( this.geometry, this.material );
		group.add( this.mesh );
	},
	findBuffer: [],
	findAtPath: function(v1,i) {
		if (i) {
			const j = this.findBuffer[i];
			if (j) {		
				//console.log('buffered',i,j);
				return j
			}
		}
		let v2 = new THREE.Vector3();
		let data = this.pathdata
		let dist = 1.0e10;
		let b = false;
		for(let k=0; k<data.length; k+=4) {
			const x = data[k+1];
			const y = data[k+2];
			const z = data[k+3];
			v2.set(x,y,z);
			const d = v2.distanceTo(v1);
			if (d<dist) {
				dist = d;
				b = data[k+0];
			}
		}
		this.findBuffer[i] = b;
		return b
	},
	colors: function(isColor) {
		console.log('Tube colors...');
		const geometry = this.geometry;
		const position = geometry.getAttribute('position');
		const particlesColors = points.geometry.getAttribute('particlesColors');
		const v1 = new THREE.Vector3(0.0,0.0,0.0);
		for (let i=0; i<position.count; i++) {
			let r = 0.0;
			let g = 0.0;
			let b = 0.0;
			if (isColor) {
				const x = position.array[i*3+0];
				const y = position.array[i*3+1];
				const z = position.array[i*3+2];
				const p = this.findAtPath(v1.set(x,y,z),i);
				r = particlesColors.array[p*3+0];
				g = particlesColors.array[p*3+1];
				b = particlesColors.array[p*3+2];
			}
			geometry.attributes.color.setXYZ(i,r,g,b);
		}
		geometry.attributes.color.needsUpdate = true;
	},
	updategeometry: function() {
		this.geometry = new THREE.TubeGeometry( this.path , this.segmentsMultiply*this.nnodes, this.radius, this.radialSegments, false ).toNonIndexed();
		
		let colors = [];
		for (let i = 0; i < this.geometry.attributes.position.count; i++){ colors.push(0,0,0); }
		this.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
		
		this.mesh =  new THREE.Mesh( this.geometry, this.material );
		
		this.findBuffer.length = 0;	
		this.colors(filtration.updateTubeColors);
	},
	update: function() {
		if (!this.visible) {
			group.remove(this.mesh);
			scene.remove(this.mesh);
		} else {
			this.material.transparent = this.transparent;
			this.material.opacity = this.opacity;
			group.add(this.mesh);
			this.material.needsUpdate = true;
		}
	},
	gui: function () {
		console.log('Tube GUI...');
		const folder = gui.addFolder( 'Tube' );
		
		function onUpdate() {tube.update(); }
		
		function onUpdateGeometry() {
			tube.mesh.geometry.dispose();
			tube.mesh.material.dispose();
			
			group.remove(tube.mesh);
			scene.remove(tube.mesh);
			
			tube.mesh = false;
			tube.updategeometry()
			group.add(tube.mesh);
		};
		
		function onUpdateMarker() {
			if (!tube.showMarker) {
				scene.remove(tube.markerMesh);
			
				renderer.domElement.addEventListener('mousemove', function(event){});
				renderer.domElement.addEventListener('click',function(event){});
				document.getElementById("inforesidue").innerHTML = ``;
				document.getElementById("infomouse").innerHTML = ``;
			} else {
				tube.updateMarker();
				scene.add(tube.markerMesh);
			}
		}
		
		folder.add( tube, 'visible', true ).onChange( onUpdate );
		folder.add( tube, 'transparent', false ).onChange( onUpdate );
		folder.add( tube, 'opacity', 0.1, 1.0, 0.01).onChange( onUpdate );
		folder.add( tube, 'segmentsMultiply', 1, 10, 1).onChange( onUpdateGeometry );
		folder.add( tube, 'radius', 0.1, 1.0, 0.01 ).onChange( onUpdateGeometry );
		folder.add( tube, 'radialSegments', 2, 20, 1 ).onChange( onUpdateGeometry );
		folder.add( tube, 'showMarker', true ).onChange( onUpdateMarker );
		//folder.addColor( tube, 'color').onChange(onUpdate);
		
	},
	updateMarker: function() {
		
		const ray = {
			caster: new THREE.Raycaster(),
			mouse: new THREE.Vector2(),
			intersections: []
		}

		renderer.domElement.addEventListener('mousemove', function (event) {
			if (!tube.showMarker) {return };
			
			event.preventDefault();
			// get position in canvas
			const rect = canvas.getBoundingClientRect();
			const left = rect.left + window.scrollX;
			const top  = rect.top  + window.scrollY;
			const width = rect.width;
			const height = rect.height;
			//console.log(rect);
			ray.mouse.x =  (event.clientX-rect.x)/width  * 2 - 1;
			ray.mouse.y = -(event.clientY-rect.y)/height * 2 + 1;
			
			let str = `mouse: x= ${ray.mouse.x.toFixed(2)} y=${ray.mouse.y.toFixed(2)}`;
			
			// get tube intersection and set marker
			ray.caster.setFromCamera(ray.mouse, camera);
			ray.intersections = ray.caster.intersectObject(tube.mesh);
			
			tube.markerMesh.visible = true;
			
			if ( ray.intersections.length > 0 ) {
				//console.log('intersection',ray.intersections[0].point);
				const p = ray.intersections[0].point;
				tube.markerMesh.position.copy( p );
				tube.markerMesh.visible = true;
				tube.markerMesh.material.needsUpdate = true;
				str += ` | canvas coordinates: x= ${p.x.toFixed(2)} y= ${p.y.toFixed(2)} z= ${p.z.toFixed(2)}`
				//console.log(p);
				//console.log(ray.intersections[0]);
				const b = tube.findAtPath(p);
				const resseq = particles.resseq[b];
				const cutoff = filtration.cutoff;
				const curv = particles.curvature(b,cutoff);
				const resname = particles.resname[b];
				const name = particles.name[b];
				const rgbstr = palette.pickColor(curv);
				
				str += `| Filtration cutoff: ${distanceFixed(filtration.cutoff)}
					Id: ${resname} ${resseq} ${name}
					Curvature: ${curv.toFixed(2)} | ${b}`;
				
			}
			document.getElementById("infomouse").innerHTML = str;
		});
	},
	dispose: function() {
		if(!tube.mesh) {return}
		group.remove(tube.mesh);
		scene.remove(tube.mesh);
		tube.material.dispose(); tube.material = false;
		tube.geometry.dispose(); tube.geometry = false;
		tube.path = false;
		tube.mesh = false;
		tube.pathdata.length = 0;
		tube.findBuffer.length = 0;
	}
}

const edges = {
	visible: true,
	transparent: true,
	opacity: 0.2,
	mesh: false,
	geometry: false,
	material: false,
	update: function() {
		if (this.mesh !== false) {
			this.mesh.geometry.dispose();
			this.mesh.material.dispose();
			group.remove(this.mesh);
			this.mesh = false;
		}
		
		if (this.visible === false) { return }
		
		this.material = new THREE.LineBasicMaterial( {
			vertexColors: true,
			//blending: THREE.AdditiveBlending,
			transparent: this.transparent,
			opacity: this.opacity,
			//linewidth: 1,
			linecap: 'round',
			linejoin: 'round',
			depthTest: true,
			depthWrite: true
		} );
	
		this.mesh = new THREE.LineSegments( this.geometry, this.material );
		
		const list = filtration.list;
		let numConnected = 0;
		for ( let k = 0; k < list.length; k++) {
			if (list[k][2] < filtration.cutoff) { numConnected++; }
			else { break; }
		}
		console.log( 'This visualization has ' + numConnected + ' edges ');
		
		numConnected *= 2*3; //update size
		this.mesh.geometry.setDrawRange( 0, numConnected );
		
		group.add( this.mesh );
	},
	init: function() {
		console.log('Edges init...');
		
		const list = filtration.list;
		const numedges = list.length;
		const numConnected = numedges * 3 * 2;
		
		const positions = new Float32Array( numConnected );
		const colors = new Float32Array( numConnected );
		
		const translate = points.geometry.getAttribute('translate').array;
		//console.log('translate',translate);
		
		let vertexpos = 0;
		let colorpos = 0;
		for ( let k = 0; k < numedges; k++) {
	
			const i    = list[k][0];
			const j    = list[k][1];
			const dist = list[k][2];
	
			//console.log('edges',k,i,j,dist,translate[ i*3 + 0 ]);
	
			positions[ vertexpos++ ] = translate[ i*3 + 0 ];
			positions[ vertexpos++ ] = translate[ i*3 + 1 ];
			positions[ vertexpos++ ] = translate[ i*3 + 2 ];
			
			positions[ vertexpos++ ] = translate[ j*3 + 0 ];
			positions[ vertexpos++ ] = translate[ j*3 + 1 ];
			positions[ vertexpos++ ] = translate[ j*3 + 2 ];
			
			colors[ colorpos++ ] = 0; 
			colors[ colorpos++ ] = 0; 
			colors[ colorpos++ ] = 0;
			
			colors[ colorpos++ ] = 0;
			colors[ colorpos++ ] = 0;
			colors[ colorpos++ ] = 0;
		}
		
		this.geometry = new THREE.BufferGeometry();

		this.geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ).setUsage( THREE.DynamicDrawUsage ) );
		this.geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ).setUsage( THREE.DynamicDrawUsage ) );
		//geometry.computeBoundingSphere();
		//geometry.setDrawRange( 0, 0 );
		
		this.update();
	},
	colors: function(isColor) {
		console.log('Edges colors...');
		const pointsColor = points.geometry.getAttribute("particlesColors").array;
		const array = this.geometry.getAttribute("color").array;
		const list = filtration.list;

		const c = new THREE.Color(); // original color
		const w = new THREE.Color(0x000000); // black color to interpolate
		const mind = filtration.minDistance;
		const maxd = filtration.maxDistance;
		const lend = maxd-mind;
		for ( let k = 0; k < list.length; k++) {
			const i = list[k][0];
			const j = list[k][1];
			const dist = list[k][2];
			
			const alpha = 1.0-(dist-mind)/lend;
			
			//console.log(pointsColor[ i*3 + 0 ],pointsColor[ i*3 + 1 ],pointsColor[ i*3 + 2 ]);
			
			if (isColor) {
				c.setRGB( pointsColor[ i*3 + 0 ],
			        	  pointsColor[ i*3 + 1 ],
			        	  pointsColor[ i*3 + 2 ]
			        	);
			} else {
				c.setRGB(1.0,1.0,1.0);
			}
			c.lerp(w,alpha);
			//console.log(dist,mind,maxd,(dist-mind)/lend);
			
			array[ k*6 + 0 ] = c.r;
			array[ k*6 + 1 ] = c.g;
			array[ k*6 + 2 ] = c.g;
			
			if (isColor) {
				c.setRGB( pointsColor[ j*3 + 0 ],
				          pointsColor[ j*3 + 1 ],
				          pointsColor[ j*3 + 2 ]
				        );
			} else {
				c.setRGB(1.0,1.0,1.0);
			}
			c.lerp(w,alpha);
			
			array[ k*6 + 3 ] = c.r;
			array[ k*6 + 4 ] = c.g;
			array[ k*6 + 5 ] = c.b;
		}
		
		this.geometry.attributes.color.needsUpdate = true;
	},
	gui: function() {
		console.log('Edges GUI...');
		const folder = gui.addFolder( 'Edges' );
		function onUpdate(){edges.update()};
		folder.add( edges, 'visible', true ).onChange( onUpdate );
		//folder.add( edges, 'setDistance', this.minDistance, this.maxDistance, 0.01 ).onChange( onUpdate );
		folder.add( edges, 'transparent', true ).onChange( onUpdate );
		folder.add( edges, 'opacity', 0.1, 1.0, 0.01).onChange(onUpdate);
	},
	dispose: function() {
		if (!edges.mesh) { return }
		group.remove(edges.mesh);
		scene.remove(edges.mesh);
		edges.material.dispose(); edges.material = false;
		edges.geometry.dispose(); edges.geometry = false;
		edges.mesh = false;
	}
}

const points = {
	visible: true,
	transparent: false,
	alphaChannel: 1.0,
	geometry: false,
	material: false,
	mesh: false,
	scale: 0.6,
	vshader: `
		precision highp float;
		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;
		
		uniform float uScale;
		//uniform float ualphaChannel;
		
		attribute vec3 position;
		attribute vec3 translate;
		attribute vec3 particlesColors;
		attribute float particlesNumber;

		varying vec3 vColor;

		void main() {
			vec4 mvPosition = modelViewMatrix * vec4( translate, 1.0 );
			vColor = particlesColors;
			
			mvPosition.xyz += position * (particlesNumber * uScale * 0.1);
			gl_Position = projectionMatrix * mvPosition;
		}`,
	fshader: `
		precision highp float;
		uniform float ualphaChannel;
		varying vec3 vColor;
		void main() {
			gl_FragColor = vec4( vColor, ualphaChannel);
		}`,
	update: function() {
		if (this.visible === false) {
			group.remove(this.mesh)
		}
		else {
			group.add(this.mesh)
			this.material.transparent = this.transparent;
			this.material.uniforms.uScale.value = this.scale;
			this.material.uniforms.ualphaChannel.value = this.alphaChannel;
			this.material.needsUpdate = true;
		}
	},
	init: function() {
		console.log('Points init...');
		if (this.geometry !== false) { return }
			
		const position = Float32Array.from(particles.coordinates);

		function center() {
			const geometry = new THREE.BufferGeometry();
		
			geometry.setAttribute('position', new THREE.BufferAttribute( position, 3 ) );
			geometry.computeBoundingBox();
			//console.log('Bounding box',geometry.boundingBox);
			geometry.center();

			console.log( 'This molecule has ' + position.length + ' positions' );
		}
		
		center();
		
		const circleGeometry = new THREE.CircleGeometry( 0.5, 32 );
		
		this.geometry = new THREE.InstancedBufferGeometry();
		const geometry = this.geometry;
		
		geometry.index = circleGeometry.index;
		geometry.attributes = circleGeometry.attributes;
	
		geometry.setAttribute('translate', new THREE.InstancedBufferAttribute( position, 3 ) );
		//geometry.center();
		
		//console.log(geometry.attributes);
		
		const number = new Float32Array(particles.count);
		for (let k=0; k<particles.count; k++) { number[k] = particles.charge[k];}
		geometry.setAttribute( 'particlesNumber', new THREE.InstancedBufferAttribute( number, 1 ) );
		
		const colors = new Float32Array(particles.count*3);
		geometry.setAttribute( 'particlesColors', new THREE.InstancedBufferAttribute( colors, 3 ) );
		
		this.material = new THREE.RawShaderMaterial( {
			uniforms: {
				uScale: { type: 'f', value: this.scale },
				ualphaChannel: { type: 'f', value: this.alphaChannel },
			},
			vertexShader: this.vshader,
			fragmentShader: this.fshader,
			depthTest: true,
			depthWrite: true,
			//blending: THREE.MultiplyBlending,
			//depthFunc: THREE.AlwaysDepth,
			transparent: this.transparent,
		} );
	
		this.mesh = new THREE.Mesh( this.geometry, this.material );
		group.add( this.mesh );
		
		this.update();
	},
	colors: function() {
		console.log('Points colors...');
		
		const attr = this.geometry.getAttribute("particlesColors");
		const size = attr.itemSize;
		const count = attr.count;
		const array = attr.array;
		
		const white = new THREE.Color(0xFFFFFF);
		
		for (let i=0; i<count; i++) {
			const curv = particles.curvature(i,filtration.cutoff);
			let rgb = palette.pickColor(curv);
			if ((curvatureButtons.elements.count > 0 && !curvatureButtons.elements[rgb[3]]) 
			 || (aminoacidButtons.elements.count > 0 && !aminoacidButtons.elements[particles.resname[i]])) {
				const rgb1 = new THREE.Color(rgb[0],rgb[1],rgb[2]);
				const rgb2 = rgb1.lerp(white,0.95);
				rgb = [rgb2.r,rgb2.g,rgb2.b,rgb[3]];
			}
			array[i*size+0] = rgb[0];
			array[i*size+1] = rgb[1];
			array[i*size+2] = rgb[2];
		}
		
		this.geometry.attributes.particlesColors.needsUpdate = true;
	},
	gui: function() {
		console.log('Points GUI...');
		const folder = gui.addFolder( 'Points' );
	
		function onUpdate() { points.update() };
			
		folder.add( points, 'visible', true ).onChange( onUpdate );
		folder.add( points, 'transparent', true ).onChange( onUpdate );
		folder.add( points, 'alphaChannel', 0.1, 1.0, 0.01).onChange(onUpdate);
		//folder.addColor( points, 'color').onChange( onUpdate );
		folder.add( points, 'scale', 0.1, 2.0, 0.1 ).onChange( onUpdate );
		//folder.add( points, 'sizeAttenuation', true ).onChange( onUpdate );
	},
	dispose: function() {
		if (! points.mesh) { return }
		group.remove(points.mesh);
		scene.remove(points.mesh);
		points.material.dispose(); points.material = false;
		points.geometry.dispose(); points.geometry = false;
		points.mesh = false;
	}
}

const animation = {
	speedx: 0.0,
	speedy: 0.0,
	speedz: 0.0,
	filtration: 0.0,
	gui: function() {
		console.log('Animation GUI...');
		const folder = gui.addFolder( 'Animation' );
		folder.add( animation, 'speedx', 0.0, 0.01, 0.001);
		folder.add( animation, 'speedy', 0.0, 0.01, 0.001);
		folder.add( animation, 'speedz', 0.0, 0.01, 0.001);
		folder.add( animation, 'filtration', 0.0, 0.1, 0.01);
	}
}

// INIT

let animationFrame = true;

container = document.getElementById('canvascontainer');
canvas = document.getElementById('maincanvas');
	
renderer = new THREE.WebGLRenderer( {
	canvas: canvas,
	antialias: true,
	preserveDrawingBuffer: true,
	alpha: true,
});
	
renderer.setClearColor(0x333333);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild( renderer.domElement );

//camera = new THREE.PerspectiveCamera( 70, window.innerWidth/window.innerHeight , 1, 5000 );
const rect = container.getBoundingClientRect();
const width = rect.width; //window.innerWidth;
const height = rect.height; //window.innerHeight;
camera = new THREE.OrthographicCamera( -width, width, height, -height, 0.1, 2000);
camera.position.z = 10;
	
let controls = new TrackballControls( camera, renderer.domElement );
controls.minDistance = 10;
controls.maxDistance = 100;
controls.panSpeed = 10.0;

scene = new THREE.Scene();
scene.background = new THREE.Color( 0xFFFFFF ); //#d3d3d3
scene.add( camera );

const light = new THREE.AmbientLight( 0xFFFFFF ); // 0x404040 soft white light
scene.add( light );

gui = new GUI({autoPlace: false} );

document.getElementById('guicontainer').appendChild(gui.domElement);

animation.gui();
edges.gui();
points.gui();
tube.gui();
gui.open();

//const axesHelper = new THREE.AxesHelper( 10 );
//axesHelper.translateX(40);
//axesHelper.translateY(20);
//scene.add( axesHelper );

function onWindowResize() {	
	//const Width = window.innerWidth*0.7;
	//const Height = window.innerHeight*0.7;
	//renderer.setSize(Width,Height);
	//camera.aspect = Width/Height;
	//const size = aspectSize(Width,Height);
		
	const rect = container.getBoundingClientRect();
	const width = rect.width;
	const height = rect.width*0.5;
	const divid = width*0.02;
	camera.left   = -width/divid;
	camera.right  =  width/divid;
	camera.top    =  height/divid;
	camera.bottom = -height/divid;
	camera.near = -divid;
	camera.aspect = width/height;
	camera.updateProjectionMatrix();
		
	renderer.setSize(width,height);
	renderer.render(scene,camera);
}

window.addEventListener( 'resize', onWindowResize );
onWindowResize();

document.getElementById("mincurvature").addEventListener('change',function() { curvatureButtons.update(); filtration.update();} );
document.getElementById("maxcurvature").addEventListener('change',function() { curvatureButtons.update(); filtration.update();} );

//if (gui) {
//	document.getElementById('guicontainer').removeChild(gui.domElement);
//	gui = false;
//}

// EXPORTED FUNCTIONS

export function setColorButton(element,color) { curvatureButtons.setColor(element,color); filtration.stat(); filtration.update();}
export function setAAColorButton(element,aa) { aminoacidButtons.setColor(element,aa); filtration.stat(); filtration.update(); }

export function stopAndClear() { animationFrame = false; }

export function topmolviewer(filename) {
	function disposeAll() {
		tube.dispose();
		edges.dispose();
		points.dispose();
		filtration.dispose();
		particles.dispose();
			
		group = false;
		//camera = false;
		//scene = false;
		//container = false;
		//renderer = false;
	}
	
	try {
	
	disposeAll();
	
	group = new THREE.Group();
	scene.add( group );
	
	parsedata(filename).then((r) => {
	
		console.log('All files parsed');
		
		curvatureButtons.insert();
		aminoacidButtons.insert();
		
		filtration.init();
		filtration.stat();

		curvatureButtons.update();

		points.init();
		edges.init();
		tube.init();
		
		filtration.update();
		
		let time = Date.now();
		function animate() {
			if (animationFrame == false) {
				console.log('Stopping animation frame!');
				disposeAll();
				
			} else {	
				controls.update();
				
				if (animation.speedx != 0.0 || animation.speedy != 0.0 || animation.speedz != 0) {
					group.rotation.x += animation.speedx;
					group.rotation.y += animation.speedy;
					group.rotation.z += animation.speedz;
				}
				
				if ((Date.now() - time) > 100 && animation.filtration !== 0.0 ) {
					filtration.cutoff += animation.filtration;
					filtration.cutoff = filtration.cutoff > filtration.maxDistance ? filtration.minDistance : filtration.cutoff;
					document.getElementById("cutoffvalue").value = filtration.cutoff;
					document.getElementById("cutoffinput").value = filtration.cutoff;
					filtration.stat();
					filtration.update();
					time = Date.now();
				}
		
				controls.update();
				renderer.render( scene, camera );
			
				animationFrame = requestAnimationFrame( animate );
			}
		}

		animationFrame = true;
		animate();
	});
	
	
	} catch (e) {
		document.getElementById("info").innerHTML =  "<p><b>Sorry, an error occurred in init(): <br>" + e + "</b></p>";
		console.error(e);
		return;
	}
}



