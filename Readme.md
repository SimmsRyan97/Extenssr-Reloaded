# Extenssr Reloaded

[![Extenssr](./icons/extenssr_reloaded_128.png)](https://linktr.ee/extenssr)

A browser extension for extending the experience of [GeoGuessr](https://www.geoguessr.com).

Original extension created by **[Andrei Onea](https://gitlab.com/nonreviad)**. Extenssr Reloaded continues that project with maintenance and feature updates.

## Features

- Core visual effects
  - Pixelate (strength slider)
  - Toon (strength slider)
  - Grayscale
  - Invert colours
  - Sepia
  - Mirror
  - Fish-eye
  - CRT filter (chromatic aberration)
  - Edge filter
  - Drunk mode
  - Vignette
  - Water
  - Bloom
  - Min filter
  - Motion blur
  - Screen scrambler
  - Blink mode with multiple timing modes:
    - Fixed time
    - Decrease each round (step + minimum)
    - Random time per round (max up to 8s)
  - Hide compass
  - Show/hide default car
- Special effects
  - Snow on Street View
  - AI car masking (heavier performance cost)
- Battle Royale extras
  - Show visited locations at the end of round
- Country streaks in regular maps
  - This feature is **not** vetted for [Geotips world record attempts](https://geotips.net/world-records)
- Saving locations and routes found during regular rounds
- Co-op functionality

# Reporting bugs

The project is always developing new ideas, so bugs are expected. If you encounter a reproducible bug, please do the following:

- (optional - see last bullet point) obtain a bugreport json
  - enable debugging (from the debugging panel of the extension pop-up menu)
  - reproduce the issue
  - download full bug report (same debugging panel)
  - there is no process to anonymise the contents or strip unnecessary personal data; the data is only used for the purpose of fixing bugs, ands is not shared with other parties. If that still makes you uncomfortable, you can skip this step.
- send the bug report (if you're ok with the caveats) alongside a description of the issue to either [My Discord](https://discord.com/users/208345026340585473) or to my [Github](https://github.com/SimmsRyan97/Extenssr-Reloaded/issues).

## Building

Building requires additional secrets and assets that are not included in the repository.
There is a sample `.env` file in `.env.template`. That contains the `CLIENT_ID` for connecting to the Twitch bot, a manifest key for the Chrome extension (required for keeping a stable appid when developing locally) and a `GUID` required if developing a Firefox add-on.

To build, simply run

```
    npm install
    npm run chrome # Chrome build
    npm run firefox # Firefox build
```

During the development cycle, you can use a webpack watch command

```
    npm run watch-chrome # Chrome, with key
    npm run watch-chrome-nokey # Chrome, no key
    npm run watch-firefox # Firefox
```

Load the `extenssr_chrome` or `extenssr_firefox` directory as an unpacked extension.
The Chrome extension published to the Web Store is built with `npm run chrome-nokey` (the key is added automatically by the submission process).

# Acknowledgements

This is a project cloned from Andrei and now maintained by myself, I want to thank him and anyone else involved in the original project. I loved the extension but felt it was time to update it after inactivity. All the original contributors are within this file and I will **NEVER** take credit for their work.

Extenssr contributors:

- [ReAnna](https://gitlab.com/Annannanna)

Some of the folks below have donation links, just saying 😀.

- [@kyarosh\_](https://www.instagram.com/kyarosh_) who designed the Extenssr icon.
- [Chatguessr](https://chatguessr.com/) folks, who conceived the original mod. This extension started off as an attempt to reimplement Chatguessr as an extension (to help out non-Windows streamers).
- [GeoGuessr Pro Community](https://discord.com/invite/xQQdRy5) which inspired a lot of the functionality. None of the scripts were copied, either due to licence incompatibility or because the extension uses different approaches.
  - ZackC\_\_ who documented many of the Geoguessr API calls
  - [drparse](https://openuserjs.org/users/drparse) who created a bunch of map filter effects.
  - [SubSymmetry and theroei](https://www.reddit.com/r/geoguessr/comments/htgi42/country_streak_counter_script_automated_and/) who created the original country streak scripts.
  - Possibly others I forgot! Please send a pull request to add credit, or DM/email me.
- The Geoguessr community over on Twitch. Some folks who have helped either by suggesting features, or by alpha testing some of the functionality.
  - [El Porco](https://www.twitch.tv/el_porco_)
  - [Fran](https://twitch.tv/froonb)
  - [Jasmine](https://twitch.tv/jasminelune)
  - [Nhoa](https://twitch.tv/nhoska)
  - [ReAnna](https://twitch.tv/reanna__)
  - Probably many others I've forgotten, I'm sorry :(. Support your friendly local [Geoguessr streamers](https://www.twitch.tv/directory/game/GeoGuessr)!

# License

This extension is distributed under [Apache 2.0 license](./LICENSE), with the exception of:

- [Shrug by Kimi Lewis from the Noun Project](./icons/shrug.svg) which is licensed under Creative Commons. Taken from [The Noun Project](https://thenounproject.com/term/shrug/622363/)
- [Snow shader](https://www.shadertoy.com/view/ldsGDn) is licensed under [Creative Commons Attribution-NonCommercial-ShareAlike](http://creativecommons.org/licenses/by-nc-sa/3.0/deed.en_US). Original shader by Andrew Baldwin.
- [Flying Santa Animation](https://codepen.io/Coding-Artist/pen/ExaXZqZ) has no specified license, but giving it a hat tip here.
- Bundled countries GeoJson data is from [datahub.io](https://datahub.io/core/geo-countries), originally from [Natural Earth](http://www.naturalearthdata.com/) is licensed under the [Open Data Commons Public Domain Dedication and License](https://opendatacommons.org/licenses/pddl/1-0/). The original data is public domain.
