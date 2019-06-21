app.initNav = async function(currentConfigs, routerInstance){
	let template = await fetch("/js/nav/view.html").then(owo=>owo.text())
	
	let view = proxymity(template, {
		configs: currentConfigs,
		menuOpen: false,
		back: ()=>{
			routerInstance.path !== "/" && routerInstance.back()
		},
		backClickable: false,
		goHome: ()=>routerInstance.rout("/")
	})

	routerInstance.on.rout(path => document.querySelector("#nav-back").disabled = path === "/")

	return view
}
