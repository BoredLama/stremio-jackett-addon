const AutoLaunch = require('auto-launch')

module.exports = (appName, shouldRun) => {
	const addonAutoLauncher = new AutoLaunch({
		name: appName,
		path: process.execPath
	})

	addonAutoLauncher.isEnabled()
	.then(isEnabled => {
		if (isEnabled && !shouldRun)
			addonAutoLauncher.disable()
		else if (!isEnabled && shouldRun)
			addonAutoLauncher.enable()
	})
	.catch(err => {
		console.log('Auto Launch Error:')
		console.log(err)
	})
}
