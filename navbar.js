export function insertBar(id,level) {
	const root= "../".repeat(level);
	const bar=`
	<!-- Navbar (sit on top) -->
	<div class="w3-bar" id="myNavbar">
		<a class="w3-bar-item w3-button w3-hover-black w3-hide-medium w3-hide-large w3-right" href="javascript:void(0);" onclick="toggleFunction()" title="Toggle Navigation Menu">
			<i class="fa fa-bars"></i>
		</a>
		<a href="${root}index.html#home" class="w3-bar-item w3-button">HOME</a>
		<a href="${root}index.html#portfolio" class="w3-bar-item w3-button w3-hide-small"><i class="fa fa-th"></i> RESEARCH</a>
		<a href="${root}index.html#projects" class="w3-bar-item w3-button w3-hide-small"><i class="fa fa-th"></i> PROJECTS</a>
		<a href="${root}topologyviewer/index.html" class="w3-bar-item w3-button w3-hide-small"><i class="fa fa-diagram-project"></i> TopMolViewer </a>
		<a href="${root}index.html#about" class="w3-bar-item w3-button w3-hide-small"><i class="fa fa-user"></i> ABOUT</a>
		<a href="${root}index.html#contact" class="w3-bar-item w3-button w3-hide-small"><i class="fa fa-envelope"></i> CONTACT</a>
	</div>

	<!-- Navbar on small screens -->
	<div id="navDemo" class="w3-bar-block w3-white w3-hide w3-hide-large w3-hide-medium">
		<a href="${root}index.html#portfolio" class="w3-bar-item w3-button" onclick="toggleFunction()">RESEARCH</a>
		<a href="${root}index.html#projects" class="w3-bar-item w3-button"><i class="fa fa-th"></i> PROJECTS</a>
		<a href="${root}topologyviewer/index.html" class="w3-bar-item w3-button w3-hide-small"><i class="fa fa-diagram-project"></i> TopMolViewer </a>
		<a href="${root}index.html#about" class="w3-bar-item w3-button" onclick="toggleFunction()">ABOUT</a>
		<a href="${root}index.html#contact" class="w3-bar-item w3-button" onclick="toggleFunction()">CONTACT</a>
	</div>
	`
	
	document.getElementById(id).innerHTM = bar;
}

