const parseTorrent = require('parse-torrent')
const needle = require('needle')
const async = require('async')
const getPort = require('get-port')

const express = require('express')
const addon = express()

const jackettApi = require('./jackett')
const helper = require('./helpers')

const config = require('./config')

const respond = (res, data) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Content-Type', 'application/json')
    res.send(data)
}

const manifest = { 
    "id": "org.stremio.jackett",
    "version": "1.0.0",

    "name": "Stremio Jackett Addon",
    "description": "Stremio Add-on to get torrent results from Jackett",

    "icon": "https://static1.squarespace.com/static/55c17e7ae4b08ccd27be814e/t/599b81c32994ca8ff6c1cd37/1508813048508/Jackett-logo-2.jpg",

    // set what type of resources we will return
    "resources": [
        "stream"
    ],

    // works for both movies and series
    "types": ["movie", "series"],

    // prefix of item IDs (ie: "tt0032138")
    "idPrefixes": [ "tt" ]

};

addon.get('/:jackettKey/manifest.json', (req, res) => {
    respond(res, manifest)
})

// utility function to create stream object from magnet or remote torrent
const streamFromMagnet = (tor, uri, type, cb) => {
    const toStream = (parsed) => {

        const infoHash = parsed.infoHash.toLowerCase()

        let title = tor.extraTag || parsed.name

        const subtitle = 'Seeds: ' + tor.seeders + ' / Peers: ' + tor.peers

        title += (title.indexOf('\n') > -1 ? '\r\n' : '\r\n\r\n') + subtitle

        cb({
            name: tor.from,
            type: type,
            infoHash: infoHash,
            sources: (parsed.announce || []).map(x => { return "tracker:"+x }).concat(["dht:"+infoHash]),
            title: title
        })
    }
    if (uri.startsWith("magnet:?")) {
        toStream(parseTorrent(uri))
    } else {
        parseTorrent.remote(uri, (err, parsed) => {
          if (err) {
            cb(false)
            return
          }
          toStream(parsed)
        })
    }
}

// stream response
addon.get('/:jackettKey/stream/:type/:id.json', (req, res) => {

    if (!req.params.id || !req.params.jackettKey)
        return respond(res, { streams: [] })

    let results = []

    let sentResponse = false

    const respondStreams = () => {

        if (sentResponse) return
        sentResponse = true

        if (results && results.length) {

            tempResults = results

            // filter out torrents with less then 3 seeds

            if (config.minimumSeeds)
                tempResults = tempResults.filter(el => { return !!(el.seeders && el.seeders > config.minimumSeeds -1) })

            // order by seeds desc

            tempResults = tempResults.sort((a, b) => { return a.seeders < b.seeders ? 1 : -1 })

            // limit to 15 results

            if (config.maximumResults)
                tempResults = tempResults.slice(0, config.maximumResults)

            const streams = []

            const q = async.queue((task, callback) => {
                if (task && (task.magneturl || task.link)) {
                    const url = task.magneturl || task.link
                    // jackett links can sometimes redirect to magnet links or torrent files
                    // we follow the redirect if needed and bring back the direct link
                    helper.followRedirect(url, url => {
                        // convert torrents and magnet links to stream object
                        streamFromMagnet(task, url, req.params.type, stream => {
                            if (stream)
                                streams.push(stream)
                            callback()
                        })
                    })
                    return
                }
                callback()
            }, 1)

            q.drain = () => {
                respond(res, { streams: streams })
            }

            tempResults.forEach(elm => { q.push(elm) })
        } else {
            respond(res, { streams: [] })
        }
    }

    const idParts = req.params.id.split(':')

    const imdbId = idParts[0]

    needle.get('https://v3-cinemeta.strem.io/meta/' + req.params.type + '/' + imdbId + '.json', (err, resp, body) => {

        if (body && body.meta && body.meta.name && body.meta.year) {

            const searchQuery = {
                name: body.meta.name,
                year: body.meta.year,
                type: req.params.type
            }

            if (idParts.length == 3) {
                searchQuery.season = idParts[1]
                searchQuery.episode = idParts[2]
            }

            jackettApi.search(req.params.jackettKey, searchQuery,

                partialResponse = (tempResults) => {
                    results = results.concat(tempResults)
                },

                endResponse = (tempResults) => {
                    results = tempResults
                    respondStreams()
                })


            if (config.responseTimeout)
                setTimeout(respondStreams, config.responseTimeout)

        } else {
            respond(res, { streams: [] })
        }
    })

})

if (process && process.argv)
    process.argv.forEach((cmdLineArg) => {
        if (cmdLineArg == '--remote')
            config.remote = true
    })

const runAddon = async () => {

    config.addonPort = await getPort({ port: config.addonPort })

    addon.listen(config.addonPort, () => {

        console.log('Add-on URL: http://127.0.0.1:'+config.addonPort+'/[my-jackett-key]/manifest.json')

        if (config.remote) {

            const localtunnel = require('localtunnel')
             
            const tunnel = localtunnel(config.addonPort, function(err, tunnel) {

                if (err) {
                    console.error(err)
                    return
                }

                console.log('Remote Add-on URL: '+tunnel.url+'/[my-jackett-key]/manifest.json')         
                console.log('Replace "[my-jackett-key]" with your Jackett API Key')
            })

            tunnel.on('close', () => {
                process.exit()
            })

            const cleanUp = require('death')({ uncaughtException: true })

            cleanUp((sig, err) => { tunnel.close() })
             
        } else
            console.log('Replace "[my-jackett-key]" with your Jackett API Key')

    })
}

runAddon()
