# Extenssr manual test plan

[toc]

## Test Maps

Unpublished maps that will not affect rank:

* [Random locations, all in the US](https://www.geoguessr.com/maps/6014d8bf9e1bec000185c2b4/play)
* [Goodboi meta](https://www.geoguessr.com/maps/600f47cd47f68200010ae0bf/play)

## Co-op

* The 'co-op game' toggle appears when choosing to invite friends to a challenge.
* Toggling the toggle yields two options for driving and mapping.
* Copying the link adds an extra 'anchor'.
* Opening a link with the hash shows the 'start driving' and 'start mapping' options.
* When on map in co-op mode, you can switch between either driving or mapping.
* Once in a co-op, removing the hash still start the game in co-op mode.

## Battle Royale 'show locations' feature

* The 'show locations' button does not show in the lobby
* When entering a game, the button appears
* When a round ends, its location is added to the 'show locations' list
* When a game finishes, clicking 'play again' makes the 'show locations' list either disappear (if there's enough time to return to lobby), or the list is now empty (if we enter directly a new game)
* Refreshing the page on an ongoing game still shows already visited locations

## Post-processing

* Test each individual post-processing effect there is on an ongoing game. Effects must apply in real time.
* Effects need to persist after a refresh.
* Known issue: effects still apply in the map maker.
* Known issue: hide compass is borked on new compass.

## Save locations

* Use the Goodboi Meta map ^_^
* With two tabs open (one in an ongoing game, one in the map maker UI with the 'saved locations' option selected), take a screenshot; the new location must not appear in the list. Then, make a guess. As soon as the guess is sent, the new location must appear in the map maker UI.
* As above, but with a Battle Royale game round.
* Selecting saved locations in map maker UI should add pins to the map
* Clicking pins on the map should show the streetview for that location
* Exporting csv's should work (can test by importing the exported csv in a regular map maker UI)
* Removing a location works, even after refreshing the page.

## Country streaks

* The 'country streaks' option should appear in the https://geoguessr.com/{mapid}/play endpoint.
* Starting a game should yield a regular game with an extra 'streak' counter
* Clicking on the map should outline the currently selected country.
* End round results should include the current streak size, and the country (or countries, if guess was incorrect).
* Streak should continue seamlessly after round 5 (i.e. generate a new seed).
* Refreshing the page during a seed should maintain the proper streak value.
* Game type is preserved after 5th round (i.e. if selecting no moving with 40s timeout for the first seed, it remains the same after the 5th round).
* Wrong guesses can be marked as valid (use the US only test map).
* Exporting streaks as a json works.

## Red line script

* Works in both regular games, country streaks and the results page.
* Known issue: checkpoints cause a discontinuity in the line.

## Avatars filtering

* Turning the replacing replaces all avatars with a smiley face.
* Toggling the replacing triggers an automatic page refresh.
* Toggling the replacing also toggles the filtering button.
* Clicking the filtering button opens a new window. The new window contains a warning about hiding it from stream first.
* When navigating through Geoguessr, new avatars appear in the filtering window.
* Clicking either the tick or the x dismisses the avatar from the list.
* Clicking the 'tick' means that on new image reloads, the avatar is shown.
* Clicking the 'x' means that the avatar is never shown.
* Known issue: avatars already on the page will not be shown immediately after allowing them; you need to refresh manually.

