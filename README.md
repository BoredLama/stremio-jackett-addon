# Stremio Jackett Add-on

Search on all your favorite torrent sites directly in Stremio!

**This Add-on requires Stremio v4.4.10+**

Note: After running the Stremio Jackett Add-on for the first time, a `config.json` file will be created in the same folder as the add-on executable. You can edit this file to configure the add-on.

Note 2: The Stremio Jackett Add-on executable needs to be running (along with Jackett) in order for this add-on to work in Stremio.

Note 3: Run the add-on with `--remote` (or set `remote` to `true` in `config.json`) to also receive an add-on url that will work through LAN and the Internet (instead of just locally).


## Install and Usage


### Install Jackett

- [Install Jackett on Windows](https://github.com/Jackett/Jackett#installation-on-windows)
- [Install Jackett on OSX](https://github.com/Jackett/Jackett#installation-on-macos)
- [Install Jackett on Linux](https://github.com/Jackett/Jackett#installation-on-linux)


### Setup Jackett

Open your browser, go on [http://127.0.0.1:9117/](http://127.0.0.1:9117/). Press "+ Add Indexer", add as many indexers as you want.

Copy the text from the input where it writes "API Key" from top right of the menu in Jackett.


### Run Jackett Add-on

[Download Jackett Add-on](https://github.com/BoredLama/stremio-jackett-addon/releases) for your operating system, unpack it, run it.


### Add Jackett Add-on to Stremio

Add `http://127.0.0.1:7000/[my-jackett-key]/manifest.json` (replace `[my-jackett-key]` with your Jackett API Key) as an Add-on URL in Stremio.

![addlink](https://user-images.githubusercontent.com/1777923/43146711-65a33ccc-8f6a-11e8-978e-4c69640e63e3.png)
