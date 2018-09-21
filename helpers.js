const needle = require('needle')
const videoNameParser = require('video-name-parser')

const ticker = {}

const helper = {

    isObject: (s) => {
        return (s !== null && typeof s === 'object')
    },

    setTicker: (ticks, cb) => {

        // const tick = setTicket(3, callback); tick(); tick(); tick();

        const tag = Date.now()

        ticker[tag] = ticks

        return () => {
            ticker[tag]--
            if (!ticker[tag]) {
                delete ticker[tag]
                cb()
            }
        }

    },

    followRedirect: (url, cb) => {
        if (!url.startsWith('magnet:?') && url.startsWith('http://127.0.0.1')) {
            // follow redirect to see if the jackett url is a torrent link or a magnet link
            needle.get(url, (err, resp, body) => {
                if (resp && resp.headers && resp.headers.location)
                    cb(resp.headers.location)
                else
                    cb(url)
            })
            return
        }
        cb(url)
    },

    episodeTag: (season, episode) => {
        return 'S' + ('0' + season).slice(-2) + 'E' + ('0' + episode).slice(-2)
    },

    simpleName: (name) => {

        // Warning: black magic ahead

        name = name.replace(/\.|_|\-|\–|\(|\)|\[|\]|\:|\,/g, ' ') // remove all unwanted characters
        name = name.replace(/\s+/g, ' ') // remove duplicate spaces
        name = name.replace(/\\\\/g, '\\').replace(new RegExp('\\\\\'|\\\'|\\\\\"|\\\"', 'g'), '') // remove escaped quotes

        return name
    },

    extraTag: (name, searchQuery) => {

        // Warning: black magic ahead

        const parsedName = videoNameParser(name + '.mp4')

        let extraTag = helper.simpleName(name)

        searchQuery = helper.simpleName(searchQuery)

        // remove search query from torrent title
        extraTag = extraTag.replace(new RegExp(searchQuery, 'gi'), '')

        // remove parsed movie/show title from torrent title
        extraTag = extraTag.replace(new RegExp(parsedName.name, 'gi'), '')

        // remove year
        if (parsedName.year)
            extraTag = extraTag.replace(parsedName.year+'', '')

        // remove episode tag
        if (parsedName.season && parsedName.episode && parsedName.episode.length)
            extraTag = extraTag.replace(new RegExp(helper.episodeTag(parsedName.season, parsedName.episode[0]), 'gi'), '')

        // send to barber shop
        extraTag = extraTag.trim()

        let extraParts = extraTag.split(' ')

        // scenarios where extraTag starts with '06', and it refers to 'S03E01-06'
        // in this case we'll add the episode tag back in the title so it makes sense
        if (parsedName.season && parsedName.episode && parsedName.episode.length) {
            if (extraParts[0] && (extraParts[0] + '').length == 2 && !isNaN(extraParts[0])) {
                const possibleEpTag = helper.episodeTag(parsedName.season, parsedName.episode[0]) + '-' + extraParts[0]
                if (name.toLowerCase().includes(possibleEpTag.toLowerCase())) {
                    extraParts[0] = possibleEpTag
                }
            }
        }

        const foundPart = name.toLowerCase().indexOf(extraParts[0].toLowerCase())

        if (foundPart > -1) {

            // clean up extra tags, we'll allow more characters here
            extraTag = name.substr(foundPart).replace(/_|\(|\)|\[|\]|\,/g, ' ')

            // remove dots, only if there are more then 1. one still makes
            // sense for cases like '1.6gb', but in cases of more it is
            // probably used instead of space
            if ((extraTag.match(/\./g) || []).length > 1)
                extraTag = extraTag.replace(/\./g, ' ')

            // remove duplicate space
            extraTag = extraTag.replace(/\s+/g,' ')

        }

        return extraTag

    }
}

module.exports = helper
