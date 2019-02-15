const commentJson = require('comment-json')

const path = require('path')
const rootDir = path.dirname(process.execPath)

const fs = require('fs')

const configFile = 'config.json'

const defaultConfig = {

	"// autoLaunch": [["// if this is set to true, the add-on will run on system start-up"]],
	"autoLaunch": false,

	"// responseTimeout": [["// for stremio add-on, in milliseconds, if timeout is reached it will respond with whatever results it already has, 0 = no timeout"]],
	"responseTimeout": 11000,

	"// addonPort": [["// port to use for stremio add-on, default is 7000"]],
	"addonPort": 7000,

	"// minimumSeeds": [["// remove torrents with less then X seeds"]],
	"minimumSeeds": 3,

	"// maximumResults": [["// maximum number of torrents to respond with, 0 = no limit"]],
	"maximumResults": 15,

	"// remote": [["// make add-on available remotely too, through LAN and the Internet"]],
	"remote": false,

	"// subdomain": [["// set the preferred subdomain (if available), only applicable if remote is set to true"]],
	"subdomain": false,

	"jackett": {

		"// host": [["// self explanatory, the default port is presumed"]],
		"host": "http://127.0.0.1:9117/",

		"// readTimeout": [["// read timeout in milliseconds for http requests to jackett server, 0 = no timeout"]],
		"readTimeout": 10000,

		"// openTimeout": [["// open timeout in milliseconds for http requests to jackett server, 0 = no timeout"]],
		"openTimeout": 10000

	}
}

const readConfig = () => {

	const configFilePath = path.join(rootDir, configFile)

	if (fs.existsSync(configFilePath)) {
		var config

		try {
			config = fs.readFileSync(configFilePath)
		} catch(e) {
			// ignore read file issues
			return defaultConfig
		}

		return commentJson.parse(config.toString())
	} else {
		const configString = commentJson.stringify(defaultConfig, null, 4)

		try {
			fs.writeFileSync(configFilePath, configString)
		} catch(e) {
			// ignore write file issues
			return defaultConfig
		}

		return readConfig()
	}

}

module.exports = readConfig()
