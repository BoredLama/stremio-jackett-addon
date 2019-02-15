
const localtunnel = require('localtunnel')

let allowClose = false

let once

let firstTime

function runTunnel(addonPort, remoteOpts) {
    const tunnel = localtunnel(addonPort, remoteOpts, (err, tunnel) => {

        if (err) {
            console.error(err)
            return
        }

        if (!firstTime || !remoteOpts.subdomain) {
            firstTime = true
            console.log('Remote Add-on URL: '+tunnel.url+'/[my-jackett-key]/manifest.json')         
            console.log('Replace "[my-jackett-key]" with your Jackett API Key')
        } else {
            console.log('Reconnected Tunnel as: '+tunnel.url)
        }

        if (remoteOpts.subdomain && !tunnel.url.startsWith('https://' + remoteOpts.subdomain + '.')) {
            console.log('Subdomain set but tunnel urls do not match, closing tunnel and trying again in 30 secs')
            cleanClose(30)
        }
    })

    function cleanClose(secs) {
        tunnel.removeListener('close', onClose)
        tunnel.removeListener('error', onError)
        tunnel.close()
        setTimeout(() => {
            runTunnel(addonPort, remoteOpts)
        }, secs * 1000)
    }

    function onClose() { if (allowClose) process.exit() }

    function onError(err) {
        console.log('caught exception:')
        console.log(err)
        console.log('Tunnel error, closing tunnel and trying again in 30 secs')
        cleanClose(30)
    }

    tunnel.on('close', onClose)
    tunnel.on('error', onError)

    if (!once) {
        once = true

        const cleanUp = require('death')({ uncaughtException: true })

        cleanUp((sig, err) => {
            allowClose = true
            tunnel.close()
        })
    }
}

module.exports = runTunnel
