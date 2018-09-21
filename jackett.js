const xmlJs = require('xml-js')
const needle = require('needle')
const helper = require('./helpers')

const config = require('./config')

const getIndexers = (apiKey, cb) => {
	needle.get(config.jackett.host + 'api/v2.0/indexers/all/results/torznab/api?apikey='+apiKey+'&t=indexers&configured=true', {
		open_timeout: config.jackett.openTimeout,
		read_timeout: config.jackett.readTimeout,
		parse_response: false
	}, (err, resp) => {
		if (!err && resp && resp.body) {
			let indexers = xmlJs.xml2js(resp.body)

			if (indexers && indexers.elements && indexers.elements[0] && indexers.elements[0].elements) {
				indexers = indexers.elements[0].elements
				cb(null, indexers)
			} else {
				cb(new Error('No Indexers'))
			}
		} else {
			cb(err || new Error('No Indexers'))
		}
	})
}

module.exports = {

	search: (apiKey, query, cb, end) => {
		getIndexers(apiKey, (err, apiIndexers) => {
			if (!err && apiIndexers && apiIndexers.length) {
				// we don't handle anime cats yet
				const cat = query.type && query.type == 'movie' ? 2000 : 5000
				let results = []
				if (apiIndexers && apiIndexers.length) {

					const tick = helper.setTicker(apiIndexers.length, () => {
						end(results)
					})

					let searchQuery = query.name

					if (query.season && query.episode) {
			            searchQuery += ' ' + helper.episodeTag(query.season, query.episode)
					}

					apiIndexers.forEach(indexer => {
						if (indexer && indexer.attributes && indexer.attributes.id) {
							needle.get(config.jackett.host + 'api/v2.0/indexers/'+indexer.attributes.id+'/results/torznab/api?apikey='+apiKey+'&t=search&cat='+cat+'&q='+encodeURI(searchQuery), {
								open_timeout: config.jackett.openTimeout,
								read_timeout: config.jackett.readTimeout,
								parse_response: false
							}, (err, resp) => {
								if (!err && resp && resp.body) {
									const tors = xmlJs.xml2js(resp.body)

									// this is crazy, i know
									if (tors.elements && tors.elements[0] && tors.elements[0].elements && tors.elements[0].elements[0] && tors.elements[0].elements[0].elements) {

										const elements = tors.elements[0].elements[0].elements

										const tempResults = []

										elements.forEach(elem => {

											if (elem.type == 'element' && elem.name == 'item' && elem.elements) {

												const newObj = {}
												const tempObj = {}

												elem.elements.forEach(subElm => {
													if (subElm.name == 'torznab:attr' && subElm.attributes && subElm.attributes.name && subElm.attributes.value)
														tempObj[subElm.attributes.name] = subElm.attributes.value
													else if (subElm.elements && subElm.elements.length)
														tempObj[subElm.name] = subElm.elements[0].text
												})

												const ofInterest = ['title', 'link', 'magneturl']

												ofInterest.forEach(ofInterestElm => {
													if (tempObj[ofInterestElm])
														newObj[ofInterestElm] = tempObj[ofInterestElm]
												})

												const toInt = ['seeders', 'peers', 'size', 'files']

												toInt.forEach(toIntElm => {
													if (tempObj[toIntElm])
														newObj[toIntElm] = parseInt(tempObj[toIntElm])
												})

												if (tempObj.pubDate)
													newObj.jackettDate = new Date(tempObj.pubDate).getTime()

												newObj.from = indexer.attributes.id

												newObj.extraTag = helper.extraTag(newObj.title, query.name)
												tempResults.push(newObj)
											}
										})
										cb(tempResults)
										results = results.concat(tempResults)
									}
								}
								tick()
							})
						}
					})
				} else {
					cb([])
					end([])
				}
			} else {
				cb([])
				end([])
			}
		})
	}
}
