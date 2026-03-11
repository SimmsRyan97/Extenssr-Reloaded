# Version 3.11.10

- Fix header menu injection to avoid profile/menu layout shifts after in-site navigation.

# Version 3.11.9

- Remove the round timing overlay feature and related settings/messages.

# Version 3.11.4

- Rename extension branding to Extenssr Reloaded.
- Add explicit credit to Andrei Onea as the original creator.
- Refresh README features and build documentation.

# Version 3.11.3

- Fix WebGL hook stability by skipping uniform lookups on unlinked programs.
- Restrict no-car shader rewrites to when hide-car mode is enabled.

# Version 3.11.2

- Fix popup tab clipping and improve tab fit.
- Add advanced Blink modes (fixed/decrease/random) and better controls.
- Add safer broker handling for missing receiving end messaging errors.

# Version 3.11.1

- Address issue with websocket injected script in Duels. This would've likely caused issues elsewhere.

# Version 3.11.0

- Remove moderation plugin o7.

# Version 3.10.3

- Fix avatars not showing.

# Version 3.10.2

- Fix the message broker when using the avatar allowlisting.

# Version 3.10.1

- Fix buttons for avatar allowlisting?

# Version 3.10.0

- Add motion blur.

# Version 3.9.1

- Fix issue with country streaks & avatar filtering.

# Version 3.9.0

- Add ability to filter out trolls.

# Version 3.8.0

- Add scramble mode.

# Version 3.7.0

- Add randomizer mode.

# Version 3.6.0

- Add min filter.

# Version 3.5.2

- Screenshots work again PauseChamp.

# Version 3.5.1

- Co-op hash in link returns after a bit; still not ideal, but ¯\_(ツ)\_/¯.

# Version 3.5.0

- Add dice roll 'filter'.

# Version 3.4.0

- Add bloom filter.

# Version 3.3.1

- Fix off by one error.

# Version 3.3.0

- Add more effects, as a treat.

# Version 3.2.1

- Censor log events and send them to debugger on debug builds.

# Version 3.2.0

- Add new post processing effects: drunk mode and vignette!

# Version 3.1.3

- Smøl fix for no car script, still hacky, but more stable.

# Version 3.1.2

- Update mui, remove nodemon (too many vulnerabilities in its dependencies), switch from jasmine to jest.

# Version 3.1.1

- Refactor post processing.

# Version 3.1.0

- Another major refactor, as a treat. Creates a broker for messages between injected scripts and content scripts (ai worker script still doesn't have its own broker, but it's way too niche for that right now).

# Version 3.0.2

- Use Firefox friendly version of reflect-metadata. h/t to ReAnna\_\_ for telling me about this almost a year ago.

# Version 3.0.1

- Fix for challenges.

# Version 3.0.0

- Major refactor
- Removed stale / non functioning features

# Version 2.10.5

- Fix IndexedDB uses and saving screenshots.

# Version 2.10.3

- Fix hide cars script.

# Version 2.10.2

- Update React.

# Version 2.10.1

- Fix issue with pins on map-maker.

# Version 2.10.0

- Add country boundaries to country streaks mode.

# Version 2.9.6

- Fix issues with Unity script interaction.

# Version 2.9.5

- Fix issues with country streaks and co-op mode.

# Version 2.9.3

- Improve postprocessing perf, part 2. It should be back to normal on Chrome, perhaps not yet on Firefox.

# Version 2.9.2

- Improve postprocessing perf. Still not back to where it was before just yet, especially on Firefox.

# Version 2.9.1

- Revert round timing overlay changes that had unintended side effects. It may not work in Firefox again.

# Version 2.9.0

- Add no-cars mode.

# Version 2.8.1

- Rewrite post processing.

# Version 2.8.0

- Open the correct heading and pano ID when clicking map pins in the results screen.

# Version 2.7.9

- Attempt to catch more round timing overlay issues.

# Version 2.7.8

- Various smøl fixes.

# Version 2.7.7

- Fix the round timing overlay on Firefox.

# Version 2.7.6

- Remove a component that does not work on Firefox.

# Version 2.7.5

- Do not minify on Firefox.

# Version 2.7.4

- Address concerns about using .innerHTML directly

# Version 2.7.3

- Fix co-operation between [Unity Script](https://greasyfork.org/en/scripts/436813-geoguessr-unity-script) when using the Baidu map and Extenssr.

# Version 2.7.2

- Fix the round timing overlay resetting when refreshing the page.
- There are still times when extenssr breaks, especially during coop. But now you can refresh the page until it works without losing any data.

# Version 2.7.1

- Fix extenssr not always initializing.

# Version 2.7.0

- Add winter season features.

# Version 2.6.5

- Fix menu shortcut dropdowns after a second change by GeoGuessr.

# Version 2.6.4

- Fix menu shortcut dropdowns.
- Fix round timing overlay not always showing up (hopefully). It's an attempt :)

# Version 2.6.3

- Fix black overlay when clicking a marker on the map in City Streaks or the Map Maker.

# Version 2.6.2

- Add toggle for hiding new compass.

# Version 2.6.1

- Remove custom BR options, they're now dead code.

# Version 2.6.0

- Co-op mode now applies to individual games and can be toggled in the challenge screen.

# Version 2.5.0

- Custom maps in private BR

# Version 2.4.0

- Add menu shortcuts for created maps and liked maps.

# Version 2.3.0

- Add a save location feature.

# Version 2.2.4

- Fix BR shadow banning of users with proper avatars

# Version 2.2.3

- Fix coop mode

# Version 2.2.2

- Fix for streak not starting properly and round timing overlay not being hidden

# Version 2.2.0

- Add round timing overlay feature! h/t ReAnna\_\_

# Version 2.1.0

- Switch to IndexedDB for storing **some** data. This should be transparent for users.

# Version 2.0.1

- Remove identity permission

# Version 2.0.0

- Second major refactor! Use FSM instead of listening for frame loads
- Adapt to new Geoguessr UI

# Version 1.3.5

- Random set of bugfixes

# Version 1.3.0

- Add co-op mode! h/t ReAnna\_\_

# Version 1.2.3

- Fix for storage listeners

# Version 1.2.2

- Fix Firefox manifest
  - Added 'https://game-server.geoguessr.com/*' to permissions, which should fix the 'show locations' plugin

# Version 1.2.1

- Fix defaults

# Version 1.2.0

- Add path logging (inspired by [this GreaseMonkey/TamperMonkey script](https://openuserjs.org/scripts/xsanda/GeoGuessr_Path_Logger)) by default

# Version 1.1.1

- One guess per round also hides the map

# Version 1.1.0

- Add LRU cache support, and use it for streak data

# Version 1.0.1

- Add warning to streaks when key is missing

# Version 1.0.0

- Major changes!!!
- Refactored message and storage systems, everything should be back in working condition
- Removed all traces of Chatguessr, keeping Twitch bot functionality in codebase for now

# Version 0.22.0

- Added streak settings

# Version 0.21.1

- Fix issue with streaks option not appearing

# Version 0.21.0

- Allow downloading streak data

# Version 0.20.7

- Another easter egg ^\_^

# Version 0.20.6

- Easter egg ^\_^

# Version 0.20.5

- Make country streaks UI less flaky

# Version 0.20.4

- Cosmetic changes to the BR locations button

# Version 0.20.3

- NPMZ in BR

# Version 0.20.2

- Fix BR blocked user avatar replacement

# Version 0.20.1

- Add Safari build target

# Version 0.20.0

- Add a11y improvement toggle
  - Currently only affects the size and location of the country selection overlay in BR / streaks

# Version 0.19.0

- Add support for BigDataCloud API fallback.

# Version 0.18.1

- Add Extenssr 'badge' to streaks mode.

# Version 0.18.0

- Add country streaks to regular maps.

# Version 0.17.3

- Fix challenge results disappearing.

# Version 0.17.2

- Change checkboxes to switches.

# Version 0.17.1

- Fix errors when returning to lobby.

# Version 0.17.0

- Add option to only allow one guess per round.

# Version 0.16.3

- Don't propagate the message for switching to default/NM/NMZ map if not in BR mode.

# Version 0.16.2

- Fix CRT filter, maybe; it used to overflow on large displays, so try a more thought out formula of sin(PI/4.0 \* fragCoord), which means the pattern should repeat every 8 pixels.

# Version 0.16.1

- Make Sobel filter enhance edges instead

# Version 0.16.0

- Add Sobel (edge) filter

# Version 0.15.0

- Add toon filter

# Version 0.14.7

- Fix sticky 'show locations' button.

# Version 0.14.6

- Hide chatguessr panel until it's improved

# Version 0.14.5

- Use default avatar instead of blur for banned users in BR

# Version 0.14.4

- Rename chromatic aberration to CRT TV filter.
- Add gamma 'correction' to CRT TV filter.

# Version 0.14.3

- Chromatic aberration is more TV-like now

# Version 0.14.2

- Make pixelate and chromatic aberration mutually exclusive

# Version 0.14.1

- Fix pixelate script

# Version 0.14.0

- Add progress to watch scripts
- Add chromatic aberration filter

# Version 0.13.0

- Add option to hide car
- Add watch scripts

# Version 0.12.0

- Add option to hide compass

# Version 0.11.0

- Add extra BR map options:
  - No move
  - No move, no zoom
  - No clear way to make NMPZ work :'(
  - Caveat: map can still be controlled through keyboard
- Fix Chatguessr map injection flakiness for now

# Version 0.10.3

- Fix BR block feature flakiness

# Version 0.10.1

- Blocked users are excluded from challenge result screen (both end round and final results)

# Version 0.9.0

- Add feature to 'block' troll users in Battle Royale
  - It's a best effort approach, since there's currently no API for kicking users from a lobby
  - Trolling users can be blocked either from their [profile page](https://www.youtube.com/watch?v=k366G7THW3g) or from the [lobby](https://www.youtube.com/watch?v=lek89wT6-eo)

# Version 0.8.1

- Add icons

# Version 0.8.0

- Allow displaying visited locations in BR after rounds end

# Version 0.7.3

- Disable chatguessr button after being clicked

# Version 0.7.2

- Fix instability with changing materials on the fly

# Version 0.7.1

- Move connect to chatguessr button into popup

# Version 0.7.0

- Add support for custom filters:
  - Grayscale
  - Pixelated

# Version 0.6.9

- First 'official' version (every other commit has been for the same version)
- Chatguessr support:
  - !cg command
  - Guessing via whisper
  - Specific icon for choosing Chatguessr mode (alongside Single Player / Challenge)
  - Showing results on the map
  - Showing stats on a leaderboard
  - Proper scores (+/- 1 point)
  - Streaks via codegridjs
- Missing Chatguessr features:
  - Flags selection
  - Persistance of user scores/streaks
  - Ability to use external APIs for streaks
- BR features:
  - Hiding usernames
  - Blurring avatars
  - Blurring former guesses
