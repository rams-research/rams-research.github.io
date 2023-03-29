import  "./js/three.min.js";
import { TrackballControls } from './js/TrackballControls.js';
import { GUI } from './js/lil-gui.module.min.js'

// GLOBAL OBJECTS

let canvas, container, renderer, scene, camera, group, gui, ratio;

let particle = {
	data: {
		particles: {
			count: 0,
			coordinates: [],
			name: [],
			resid: []
		},
		residues: {
			count: 0,
			name: [],
			sequence: [],
			curvature: [],
		}
	},
	count: function() {return this.data.particles.count; },
	name: function(i) { return this.data.particles.name[i] },
	resseq: function(i) { return this.data.residues.sequence[this.data.particles.resid[i]] },
	resname: function(i) { return this.data.residues.name[this.data.particles.resid[i]] },
	curvature: function(i,cutoff) {
		const curvature = this.data.residues.curvature;
		const resid = this.data.particles.resid[i];
		const r1 = curvature[resid];
		const r2 = r1[cutoff];
		return curvature[resid][cutoff];
	},
	charge: function(i) {
		let m = new Proxy( {
			'H':1.0,
			'O':8.0,
			'N':7.0, 
			'C':6.0,
			'S':16.0
		}, function() { 
			get: (obj,prop) => { 
				console.log('Unmapped atom ',obj);
				return prop in obj ? obj[prop] : 1.0 
			}}
		);
		return m[this.name(i).slice(0,1)]
	},
	dispose: function () {
		particle.data.particles.count = 0;
		particle.data.particles.coordinates.length = 0;
		particle.data.particles.name.length = 0;
		particle.data.particles.resid.length = 0;
		
		particle.data.residues.count = 0;
		particle.data.residues.name.length = 0;
		particle.data.residues.sequence.length = 0;
		particle.data.residues.curvature.length = 0;
	}
}

function colorFont(color,str) { return `<h8 style="color:${color};"> ${str} </h8>`}

function pickColor(c) {
	let str = "";
        if      (c < -5.5) { str = "#D3D3D3" }
        //if (c < -5.5) { str = '#40E0D0' } // turquise
	else if (c < -4.5) { str = '#BF5B17' } // orange
	else if (c < -3.5) { str = '#F0027F' } // pink
        else if (c < -2.5) { str = '#003bd1' } // Bilbao blue
        else if (c < -1.5) { str = '#32CD32' } // lime
        else if (c < -0.5) { str = '#ffdf38' } // light gold
        else if (c <  0.5) { str = '#FFD707' } // gold
        else if (c <  1.5) { str = '#e5c106' } // dark gold
        else if (c <  2.5) { str = '#000000' }
        //else if (c <  3.5) { str = '#000000' } 
        //else if (c <  4.5) { str = '#000000' }
        //else if (c <  5.5) { str = '#000000' }
        else              { str = '#D3D3D3'; }
	const r = parseInt(str.slice(1,3),16)/255;
	const g = parseInt(str.slice(3,5),16)/255;
	const b = parseInt(str.slice(5,7),16)/255;
	return [r,g,b,str]
}

const animation = { 
	speedx: 0.0,
	speedy: 0.0,
	speedz: 0.0,
	filtration: 0.0,
}

async function parsedata(filename) {
	try {
		let response = await fetch(filename);
		let text = await response.text();
		let rescount = 0;
		let state = false;
		const lines = text.split( '\n' );
		const particles = particle.data.particles;
		const residue = particle.data.residues;
		for ( let i = 0, l = lines.length; i < l; i ++ ) {
			let line = lines[i]
			if      (line == 'ATOMS')    { state = 'ATOMS';   }
			else if (line == 'RESIDUES') { state = 'RESIDUES'; rescount = 0;}
			else if (state == 'ATOMS')   {
				if (line == '') { rescount++; }
				else {
					const split = line.split(' ');
				
					const name = split[0];
					const x = parseFloat(split[1]);
					const y = parseFloat(split[2]);
					const z = parseFloat(split[3]);
			
					particles.count++;
					particles.coordinates.push(x,y,z);
					particles.name.push(name);
					particles.resid.push(rescount);
				}
			}
			else if (state == 'RESIDUES') {
				if (line == '') { rescount++; }
				else if (line.substring(0,1) == ' ') { /* data */
					const split = line.split(' ');
					const cutoff = parseFloat(split[1]).toFixed(2);
					//console.log('cutoff',cutoff);
					const curv = parseFloat(split[2]);
					residue.curvature[rescount][cutoff] = curv;
				} else {
					const split = line.split(' ');
					const resname = split[0];
					const resseq = split[1];
					
					residue.count += 1;
					residue.name.push(resname);
					residue.sequence.push(parseInt(resseq));
					residue.curvature.push({});
				}
			}
		}
		//for (let k=0; k<residue.count; k++) {
		//	console.log(residue.name[k],residue.sequence[k],residue.curvature[k]);
		//}
		return 'ok'
	} catch (e) {
		document.getElementById("info").innerHTML =  "<p><b>Sorry, an error occurred reading files :<br>" + e + "</b></p>";
		console.log(e);
	}
}

const pickColorButtons = {
	isInserted: false,
	insert: function() {
		if (this.isInserted) {return}
		this.isInserted = true;
		function f(color,val) {
			const str = `<button
					onclick="setColorButton(this,'${color}')"
					class="w3-button w3-small w3-round" 
					type="button"
					style="padding: 0px 15px 0px 15px; border: 1px solid ${color}; margin: 0px 2px; background-color: white"
				      >
				      <!--font color='${color}'> ${val} </font-->
				      ${val}
				      </button>`;
			return str
		}
		function g(aa) {
			const str = `<button
					onclick="setAAColorButton(this,'${aa}')" 
					class="w3-button w3-small w3-round" 
					type="button" 
					style="padding: 0px 15px 0px 15px; border: 1px solid black; margin: 0px 2px; background-color: white"
				      >
				      ${colorFont('black',aa)}
				      </button>`;
			return str
		}
		// cutoffs
		let row1 = f('#D3D3D3','< -5.5');
		let count = 1;
		for (let k=-5.0; k<=2.0; k+=1.0) {
			count += 1;
			row1 += f(pickColor(k)[3],k.toFixed(1));
			if (count == 5) { row1+="<br>"; count = 0}
		}
		row1 += f('#D3D3D3','> 2.5');
		document.getElementById("pickcolorbutton").innerHTML = row1;
		
		let row = ''
		// residues
		row += g('ARG'); row += g('HIS'); row += g('LYS');
		row += g('ASP'); row += g('GLU');
		row += '<br>'
		row += g('SER'); row += g('THR'); row += g('ASN'); row += g('GLN');
		row += '<br>'
		row += g('CYS'); row += g('SEC'); row += g('GLY'); row += g('PRO');
		row += '<br>'
		row += g('ALA'); row += g('ILE'); row += g('LEU'); row += g('MET'); row += g('PHE'); row += g('TRP'); row += g('TYR'); row += g('VAL');
		document.getElementById("pickaabutton").innerHTML = row;
		
	},
	ColorElements: {count: 0},
	setColor: function(element,color) {
		if (this.ColorElements[color]) {
			element.style["background-color"] = 'white';
			element.style["color"] = 'black';
			this.ColorElements[color] = false;
			this.ColorElements.count -= 1;
		} else {
			element.style["background-color"] = color;
			element.style["color"] = 'white';
			this.ColorElements[color] = true;
			this.ColorElements.count += 1;
		}
		filtration.update();
	},
	AAElements: {count: 0},
	setAA: function(element,aa) {
		if (this.AAElements[aa]) {
			element.style["background-color"] = 'white';
			this.AAElements[aa] = false;
			this.AAElements.count -= 1;
		} else {
			element.style["background-color"] = 'gray';
			this.AAElements[aa] = true;
			this.AAElements.count += 1;
		}
		filtration.update();
	},
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
			const name = particle.name(k);
			//if (name == 'CA' || name == 'C' || name == 'N') {
			if (name == 'CA') {
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
		const j = this.findBuffer[i];
		if (j) {		
			//console.log('buffered',i,j);
			return j
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
			}
			document.getElementById("infomouse").innerHTML = str;
		});
		
		renderer.domElement.addEventListener('click', function (event) {
			event.preventDefault();
			camera.updateMatrixWorld();
			if (ray.intersections.length > 0) {
				const p = ray.intersections[0].point;
				const b = tube.findAtPath(p);
					
				const resseq = particle.resseq(b);
				const cutoff = filtration.cutoff;
				
				const curv = particle.curvature(b,cutoff);
				const resname = particle.resname(b);
				const name = particle.name(b);
				const rgbstr = pickColor(curv);
				
				document.getElementById("inforesidue").innerHTML = `
					Filtration cutoff: ${filtration.cutoff.toFixed(2)}
					Id: ${resname} ${resseq} ${name}
					Curvature: ${curv.toFixed(2)}`;
				}
			}
		);
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
		
		const particles = particle.data.particles;		
		const position = Float32Array.from(particles.coordinates);

		function center() {
			const geometry = new THREE.BufferGeometry();
		
			geometry.setAttribute('position', new THREE.BufferAttribute( position, 3 ) );
			geometry.computeBoundingBox();
			console.log('Bounding box',geometry.boundingBox);
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
		for (let k=0; k<particles.count; k++) { number[k] = particle.charge(k);}
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
	avgColorsCurv: false,
	colors: function() {
		console.log('Points colors...');
		
		const attr = this.geometry.getAttribute("particlesColors");
		const size = attr.itemSize;
		const count = attr.count;
		const array = attr.array;
		
		const white = new THREE.Color(0xFFFFFF);
		
		let oldResseq = false;
		let countResseq = 0;
		let sumResseq = 0.0;
		
		for (let i=0; i<count; i++){
			const curv = particle.curvature(i,filtration.cutoff.toFixed(2));
			let rgb = pickColor(curv);
			const resseq = particle.resseq(i);
			//console.log(i,count,resseq,rgb,curv);
			if (
			     (pickColorButtons.ColorElements.count > 0 && !pickColorButtons.ColorElements[rgb[3]]) 
			     ||
			     (pickColorButtons.AAElements.count > 0 && !pickColorButtons.AAElements[particle.resname(i)])
			   ) {
				const rgb1 = new THREE.Color(rgb[0],rgb[1],rgb[2]);
				const rgb2 = rgb1.lerp(white,0.95);
				rgb = [rgb2.r,rgb2.g,rgb2.b,rgb[3]];
			} else {
				if (resseq != oldResseq) {
					oldResseq = resseq;
					countResseq += 1;
					sumResseq += curv;
				}
			}
			array[i*size+0] = rgb[0];
			array[i*size+1] = rgb[1];
			array[i*size+2] = rgb[2];
		}
		this.avgColorsCurv = countResseq > 0 ? sumResseq/countResseq : false
		this.geometry.attributes.particlesColors.needsUpdate = true;
	},
	updateinfoeuler: function() {
		const count = particle.count();
		const cutoff = filtration.cutoff.toFixed(2);
		let sum = 0.0;
		let sumResseq = 0.0;
		let countResseq = 0;
		let oldResseq = false;
		for (let i=0; i<count; i++) {
			const resseq = particle.resseq(i);
			const curv = particle.curvature(i,cutoff);
			//console.log('curv',i, curv, sum);
			sum += curv;
			if (resseq != oldResseq) {
				oldResseq = resseq;
				countResseq += 1;
				sumResseq += curv;
			}
		}
		function boxedStr(color,str) {
			return `<div class="w3-round" style="padding: 0px 15px 0px 15px; border: 1px solid ${color}; margin: 1px 2px;"> ${str} </div>`
		}
		function getColorCurv() {
			const curv = points.avgColorsCurv;
			const color = pickColor(curv)[3];
			if (curv != false) {
				return boxedStr(color,`Average selected residues/curvature: ${curv.toFixed(2)}`);
			 }
			 return ''
		}
		const avg = sumResseq/countResseq;
		const rgbstr = pickColor(avg);
		const color = rgbstr[3];
		document.getElementById("infoeuler").innerHTML = `
			Filtration cutoff: ${cutoff} <br>
			Euler Characteristics: ${sum.toFixed(2)} <br>` 
			+ boxedStr(color,`Average curvature per residue: ${avg.toFixed(2)} <br>`)
			+ getColorCurv()
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

const filtration = {
	updateEdgesColors: true,
	updateTubeColors: true,
	cutoff: 1.64,
	minDistance: 0.1,
	maxDistance: 5.2,
	list: [],
	update: function() {
		points.colors();
		
		edges.colors(this.updateEdgesColors);
		edges.update();
		
		tube.colors(this.updateTubeColors);
		
		points.updateinfoeuler();
	},
	init: function() {
		console.log('Filtration init...');
		const list = this.list;
		const coordinates = particle.data.particles.coordinates;
		
		for ( let i = 0; i < particle.count(); i ++ ) {
			let a = new THREE.Vector3(coordinates[ i*3 + 0],coordinates[ i*3 + 1],coordinates[ i*3 + 2 ]);
			for ( let j = i + 1; j < particle.count(); j ++ ) {
				let b = new THREE.Vector3(coordinates[ j*3 + 0], coordinates[ j*3 + 1], coordinates[ j*3 + 2]) ;
				let dist = a.distanceTo(b);		
				if ( dist < this.maxDistance ) { 
					this.list.push([i,j,dist]);
				}
			}
		}
		
		list.sort(function(a,b){ return a[2] - b[2]});
		
		this.minDistance = parseFloat(list[0][2].toFixed(2));
		this.maxDistance = parseFloat(list[list.length-1][2].toFixed(2));
		
		console.log( 'This molecule has a maximum of ' + list.length + ' edges ');
	},
	gui: function() {
		console.log('Filtration GUI...');
		const folder = gui.addFolder( 'Filtration' );
		function onUpdate() { filtration.update() };
		folder.add( filtration, 'cutoff', this.minDistance, this.maxDistance, 0.01 ).listen().onChange( onUpdate );
		folder.add( filtration, 'updateEdgesColors', true ).onChange( onUpdate );
		folder.add( filtration, 'updateTubeColors', true ).onChange( onUpdate );
	},
	dispose: function() {
		filtration.list.length = 0;
	}
}

// EXPORTED FUNCTIONS

let animationFrame = true;

export function setColorButton(element,color) { pickColorButtons.setColor(element,color); }
export function setAAColorButton(element,aa) { pickColorButtons.setAA(element,aa); }

export function stopAndClear() { animationFrame = false; }

function disposeAll() {
	tube.dispose();
	edges.dispose();
	points.dispose();
	filtration.dispose();
	particle.dispose();
			
	group = false;
	camera = false;
	scene = false;
	container = false;
	renderer = false;
	
	//let c = document.getElementById("maincanvas");
	//let ctx = c.getContext("2d");
	//ctx.fillStyle = "white";
	//ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function topmolviewer(filename) {
	try {
	disposeAll();
	
	pickColorButtons.insert();
	
	canvas = document.getElementById('maincanvas');
	
	renderer = new THREE.WebGLRenderer( {
		canvas: canvas,
		antialias: true,
		preserveDrawingBuffer: true
	});
	renderer.setClearColor(0x333333);
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.outputEncoding = THREE.sRGBEncoding;
	
	container = document.getElementById('canvascontainer');
	container.appendChild( renderer.domElement );
	
	//camera = new THREE.PerspectiveCamera( 70, window.innerWidth/window.innerHeight , 1, 5000 );
	
	function getContainerSize() {
		const width = (0.7*window.innerWidth).toFixed(0);
		const height = (0.7*window.innerHeight).toFixed(0);
		return { 
			width: width,
			height: height
		}
	}
	
	const containerSize = getContainerSize(); 
	const width = containerSize.width;
	const height = containerSize.height;
	const ratio = width/height;
	const divid = 30;
	camera = new THREE.OrthographicCamera( -width/divid, width/divid, height/divid, -height/divid, -divid, 1000 );
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
	
	group = new THREE.Group();
	scene.add( group );
	/*
	const axesHelper = new THREE.AxesHelper( 5 );
	axesHelper.translateX(40);
	axesHelper.translateY(20);
	scene.add( axesHelper );
	*/
	
	if (!gui) {
		gui = new GUI({autoPlace: false} );
		console.log('Animation GUI...');
		const folder = gui.addFolder( 'Animation' );
		folder.add( animation, 'speedx', 0.0, 0.01, 0.001);
		folder.add( animation, 'speedy', 0.0, 0.01, 0.001);
		folder.add( animation, 'speedz', 0.0, 0.01, 0.001);
		folder.add( animation, 'filtration', 0.0, 0.05, 0.001);
		document.getElementById('guicontainer').appendChild(gui.domElement);
		filtration.gui();
		edges.gui();
		points.gui();
		tube.gui();
		gui.open();
	}
	
	
	
	function onWindowResize() {
		const containerSize = getContainerSize(); 
		const width = containerSize.width;
		const height = containerSize.height;
		
		//console.log('windows container now is ',width,height);
	
		//const width = window.innerWidth; //containerSize.width;
		//const height = window.innerHeight; //containerSize.height;
	
		//container.setAttribute("style",`width:${width}px; height:${height}px`);
		//container.width = width;
		//container.height = height;
	
		camera.aspect = ratio;
		camera.updateProjectionMatrix();
	
		renderer.setSize(width,width/ratio);
		renderer.render(scene, camera );
	}

	window.addEventListener( 'resize', onWindowResize );
	onWindowResize();

	let time = Date.now();
	function animate() {
		if (animationFrame == false) {
			console.log('Stopping animation frame!');
			disposeAll();
			
		} else {	
			controls.update();
	
			group.rotation.x += animation.speedx;
			group.rotation.y += animation.speedy;
			group.rotation.z += animation.speedz;
	
			if ((Date.now() - time) > 100 && animation.filtration !== 0.0 ) {
				filtration.cutoff += animation.filtration;
				filtration.cutoff = parseFloat(filtration.cutoff.toFixed(2));
				filtration.cutoff = filtration.cutoff > filtration.maxDistance ? filtration.minDistance : filtration.cutoff;
				filtration.update();
				time = Date.now();
				//console.log('Animate cutoff and time',filtration.cutoff,time);
			}
	
			controls.update();
			renderer.render( scene, camera );
		
			animationFrame = requestAnimationFrame( animate );
		}
	}

	parsedata(filename).then((r) => {
		console.log('All files parserd');
		filtration.init();
		points.init();
		edges.init();
		tube.init();
		filtration.update();
		animationFrame = true;
		animate();
	});
	
	} catch (e) {
		document.getElementById("info").innerHTML =  "<p><b>Sorry, an error occurred in init(): <br>" + e + "</b></p>";
		console.error(e);
		return;
	}
}



