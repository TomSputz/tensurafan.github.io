app.initReader = async function(volumes, routerInstance, namePickerInstance, terms, globalTermchoices, persistantConfigs){
	let template = await fetch("/js/reader/view.html").then(owo=>owo.text())

	let view = proxymity(template, {
		errored: false,
		errorMessage: "",
	})

	let readerContainer = view.find(el=>el.id === "reading-content")

	routerInstance.add("/read/*", view)

	let subableEvents = ["scroll", "touchend", "touchcancle", "mouseup", "blur"]

	routerInstance.on.set(view, async function(){
		let pathMatch = /^\/read\/([^\/]+)(\/quote\/([^\/]+))?$/.exec(routerInstance.path)

		let volumeId = view.app.volumeId = pathMatch[1]
		let quotedLine = parseInt(pathMatch[3])

		let volume = volumes.find(volume=>volume.id === volumeId)
		if (!volume){
			view.app.errored = true
			view.app.errorMessage = "The volume you have requested doesn't exist UwU"
			return
		}

		try{
			view.app.errored = false
			view.app.errorMessage = ""
			let content = await fetch(volume.path).then(owo=>owo.json())

			let quotedParagraph = null
			let fragment = document.createDocumentFragment()
			let imagesPromise = []
			content.map(generateParagraph)
				.forEach(function(paragraph, index){
					if (!paragraph){
						return
					}

					if (paragraph.imagesPromise){
						imagesPromise.push(paragraph.imagesPromise)
					}

					fragment.appendChild(paragraph)
					if (index === quotedLine){
						paragraph.classList.add("color-primary", "underline", "color-in")
						quotedParagraph = paragraph
					}
					paragraph.id = ("line_" + index)
					paragraph.classList.add("line")
				})

			readerContainer.appendChild(fragment)

			await Promise.all(imagesPromise).then(RAFP)

			if (quotedParagraph){
				quotedParagraph.scrollIntoView({
					// behavior: "smooth",
					block: "center"
				})
			}
			else if (persistantConfigs.topLine && persistantConfigs.topLine[volumeId]){
				let line = document.getElementById("line_" + persistantConfigs.topLine[volumeId])
				line.scrollIntoView({block: "start"})
			}

			subableEvents.forEach(eventName=>{
				window.addEventListener(eventName, onUserInteractWithPage)
			})
		}
		catch(uwu){
			view.app.errored = true
			view.app.errorMessage = "Oops something went wrong UwU"
			console.warn(uwu)
		}
	})

	routerInstance.on.unset(view, async function(){
		while(readerContainer.lastChild){
			readerContainer.removeChild(readerContainer.lastChild)
		}
		subableEvents.forEach(eventName=>{
			window.removeEventListener(eventName, onUserInteractWithPage)
		})
	})

	// --- alright here's the foot note stuff

	let footnoteTemplate = await fetch("/js/reader/footnote.html").then(owo=>owo.text())

	let footnoteView = proxymity(footnoteTemplate, {
		text: "",
		parent: null,
		bottom: 0
	})

	proxymity.watch(footnoteView.app, "parent", function(newParent){
		if (!newParent){
			return footnoteView.detach()
		}

		footnoteView.appendTo(readerContainer)

		footnoteView.app.bottom = newParent.offsetTop + newParent.offsetHeight
	})

	// document.addEventListener("click", onUserInteractWithPage)

	// ok we need to set up some stuff to do with the term selector
	let termsToCheck = Object.keys(terms)

	return template

	function generateParagraph(paragraphData){
		if (paragraphData.img){
			let div = document.createElement("div")
			let img = document.createElement("img")
			img.src = paragraphData.img
			div.appendChild(img)
			div.classList.add("text-center")
			div.loadPromise = new Promise(function(accept){
				img.addEventListener("load", accept)
			}).then(RAFP)
			return div
		}
		else{
			let p = document.createElement("p")
			paragraphData.classes.forEach(c=>p.classList.add(c))

			// filter the text for anything that we know is a term that we want to change

			paragraphData.sections = paragraphData.sections.reduce((expanded, part)=>{
				if (part.url || part.info){
					expanded.push(part)
					return expanded
				}
				else{
					let termToReplaceIndex = {}
					termsToCheck.forEach(term=>{
						let termIndex
						if ((termIndex = part.text.indexOf(term)) > -1){
							termToReplaceIndex[termIndex] = term
						}
					})

					let resultingIndexes = Object.keys(termToReplaceIndex)

					if (!resultingIndexes.length){
						expanded.push(part)
						return expanded
					}

					let remainingSentenceToParse = part.text

					resultingIndexes
						.map(parseInt)
						.sort()
						.forEach(index=>{
							let termToReplace = termToReplaceIndex[index]
							let newPart = Object.assign({}, part)
							let splitupSentences = remainingSentenceToParse.split(termToReplace)

							newPart.text = splitupSentences[0]
							expanded.push(newPart)

							let termPart = {
								text: termToReplace,
								bold: false,
								userChooseable: true
							}
							expanded.push(termPart)

							remainingSentenceToParse = splitupSentences[1]
						})

					let finalPart = Object.assign({}, part)
					finalPart.text = remainingSentenceToParse
					expanded.push(finalPart)

					return expanded
				}
			}, [])

			// ok now we actually build the data based on our paragraph data
			paragraphData.sections.forEach(part=>{
				if (part.text){
					let textElement = document.createTextNode(part.text)

					if (part.url){
						textElement = document.createElement("a")
						textElement.href = part.url
						textElement.target = "_blank"
						textElement.textContent = part.text
					}

					if (part.bold){
						textElement = document.createElement("strong")
						textElement.textContent = part.text
					}

					if (part.userChooseable){
						textElement = document.createElement("span")
						textElement.textContent = "{:this.app.allTermsChosen[this.app.displayedTerm]:}|{allTermsChosen[this.app.displayedTerm]}|"
						textElement.classList.add("underline", "clickable")
						proxymity(textElement, {
							allTermsChosen: globalTermchoices,
							displayedTerm: part.text
						})

						textElement.addEventListener("click", selectNameEventHandler)
					}

					p.appendChild(textElement)
				}
				else if (part.info){
					let iconDiv = document.createElement("div")
					iconDiv.classList.add("icon", "color-primary", "color-in")

					iconDiv
						.appendChild(document.createElement("div"))
						.classList.add("footnote", "clickable")

					iconDiv.addEventListener(
						"click",
						showFootnote.bind(iconDiv, iconDiv, part.info)
					)

					p.appendChild(iconDiv)
				}
			})
			return p
		}
	}

	function showFootnote(element, footnote, event){
		event.stopPropagation()
		let changed = false

		if (footnoteView.app.text !== footnote){
			footnoteView.app.text = footnote
			changed = true
		}

		if (footnoteView.app.parent !== element){
			footnoteView.app.parent = element
			changed = true
		}

		if (!changed){
			hideFootnote()
		}
	}

	function hideFootnote(){
		footnoteView.app.parent = null
		footnoteView.app.bottom = 0
	}

	function selectNameEventHandler(ev){
		let elementModel = ev.target.app
		if (!elementModel){
			return
		}

		namePickerInstance.app.baseName = elementModel.displayedTerm
		namePickerInstance.app.chosenName = globalTermchoices[elementModel.displayedTerm]
		namePickerInstance.app.setNameOptions(terms[elementModel.displayedTerm])
		namePickerInstance.app.display = true
	}

	var navBarEl
	function onUserInteractWithPage(){
		!navBarEl && (navBarEl = document.getElementById("nav"))
		let navBarBox = navBarEl.getBoundingClientRect()

		let overlappings = document.elementFromPoint(navBarBox.width/2, navBarBox.bottom + 1)

		persistantConfigs.topLine = persistantConfigs.topLine || {}

		persistantConfigs.topLine[view.app.volumeId] = parseInt(overlappings.id.replace("line_", ""))

		app.saveSettings()
	}

	function RAFP(){
		return new Promise(function(accept){
			requestAnimationFrame(accept)
		})
	}
}
