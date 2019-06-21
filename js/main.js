async function app(initConfigs){
	// respoond to the incoming global configs
	app.saveSettings = function(){
		app.updateSettings(initConfigs.persist)
	}

	initConfigs.persist.theme = Object.prototype.hasOwnProperty.call(initConfigs.persist, "theme") ? initConfigs.persist.theme : "dark"
	proxymity.watch(initConfigs.persist, "theme", updateTheme)
	updateTheme(initConfigs.persist.theme)

	function updateTheme(newTheme){
		if (newTheme && !document.documentElement.classList.contains(newTheme)){
			document.documentElement.classList.remove("oled", "dark")
			document.documentElement.classList.add(newTheme)
		}
		else if (!newTheme){
			document.documentElement.classList.remove("oled", "dark")
		}

		app.saveSettings()
	}

	// setup the different views
	let router = app.router = app.routerFactory(document.getElementById("app"))

	let navEl = document.getElementById("nav")
	let nav = app.nav = await app.initNav(initConfigs.persist, router)
	nav.appendTo(navEl)

	let indexView = app.indexView = await app.initIndexView(initConfigs.volumeList, router)

	let globalTermchoices = initConfigs.persist.chosenTerms = initConfigs.persist.chosenTerms || {}

	let namePicker = app.namePicker = await app.initNamePicker(router, document.getElementById("app"), globalTermchoices)

	console.log(globalTermchoices)

	Object.keys(initConfigs.terms).forEach(term=>globalTermchoices[term] = globalTermchoices[term] || term)

	let reader = app.reader = await app.initReader(initConfigs.volumeList, router, namePicker, initConfigs.terms, globalTermchoices, initConfigs.persist)

	let footer = app.footer = await app.initFooter(initConfigs.persist)
	footer.appendTo(document.getElementById("footer"))

	// set up the router and stuff
	window.addEventListener("popstate", ev=>{
		app.router.rout()
	})

	function updateNavHeight(){
		document.body.style.setProperty("--menu-height", navEl.offsetHeight + "px")
	}
	window.addEventListener("resize", updateNavHeight)
	proxymity.watch(nav.app, "menuOpen", updateNavHeight)
	updateNavHeight()

	app.router.rout()

	console.log(initConfigs)
	
	for (const button of document.querySelectorAll('.ripple')) {
		button.addEventListener("click", ({ target, x, y }) => {
			const oldRipple = target.querySelector(".ripple-anim")
			if (oldRipple)
				oldRipple.parentNode.removeChild(oldRipple)

			const ripple = document.createElement("span")
			ripple.classList.add("ripple-anim")

			const radius = Math.max(target.offsetWidth, target.offsetHeight)
			ripple.style.top = y - radius / 2 - target.offsetTop + "px"
			ripple.style.left = (x - radius / 2 - target.offsetLeft) + "px"
			ripple.style.height = ripple.style.width = radius+ "px"
			
			target.appendChild(ripple)
		})
	}
}

// Init ========================================================

// app.init() is called in the index.html file
app.init = async function(){
	let [volumeList, terms] = await Promise.all([
		fetch("/ln/volumes.json").then(owo=>owo.json()),
		fetch("/ln/terms.json").then(owo=>owo.json())
	])

	let persist = app.getSettings()

	return app({volumeList, terms, persist})
}
