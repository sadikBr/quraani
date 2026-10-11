# Photos of the athan's screen

The backgrounds of the athan's screen (`AthanActivity`) and of its designer in the app
(«شاشة الأذان»), in `android/src/main/res/drawable-nodpi/`:

- `athan_screen_<id>.webp`: 1080 × 2160 (1:2), WebP quality 80, shown full screen (centre crop).
- `athan_screen_<id>_thumb.webp`: 270 × 540, for the picker.

Each was taken from Wikimedia Commons as the 1920 px wide rendering (the original for
`madinah_night`), cropped to 1:2 at full height (centred; the Koutoubia at 62% of the free width
to centre the minaret), resized with Lanczos and re-encoded. Nothing else was changed: the
darkening, the drift and the rings are drawn by the screen. Where the licence is ShareAlike, these
files are released under it too. The app's credits page lists them with links
(`src/features/credits/credits.ts`).

| Id | Work | Author | Licence | Source |
|---|---|---|---|---|
| `makkah_night` | Al Haram, Mecca 24231, Saudi Arabia (23 March 2011) | TaLha Hussain (BAIG), via Panoramio | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Al_Haram,_Mecca_24231,_Saudi_Arabia_-_panoramio_(6).jpg |
| `makkah_day` | The historic and most phenomenonal view of The Holy kabah and the clock tower | FAREHA HASAN | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:The_historic_and_most_phenomenonal_view_of_The_Holy_kabah_and_the_clock_tower.jpg |
| `madinah` | Close-up shot of the Green Dome at The Prophet's Mosque (Al Masjid-e-Nabawi) | TheHadiRahim | CC0 | https://commons.wikimedia.org/wiki/File:Close-up_shot_of_the_Green_Dome_at_The_Prophet%27s_Mosque_(Al_Masjid-e-Nabawi).jpg |
| `madinah_night` | Al-Masjid al-Nabawi in Medina (2008) | Mardetanha | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Outsideofmasjedonnabi11.JPG |
| `aqsa` | Dome of the Rock (Dome), Temple Mount, Old City of Jerusalem (2013) | Andrew Shiva / Wikipedia (Godot13) | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Jerusalem-2013-Temple_Mount-_Dome_of_the_Rock_(Dome).jpg |
| `hassan2` | Corridor at the Hassan II Mosque, Casablanca, Morocco | Tinuzzo | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Corridor_at_the_Hassan_II_Mosque,_Casablanca,_Morocco.jpg |
| `koutoubia` | The Koutoubia Mosque after the earthquake (2 January 2024) | Holger Uwe Schmitt | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:1158_wurde_die_Koutoubia-Moschee_in_Marrakesch_er%C3%B6fnet._04.jpg |

The plain backgrounds (`green`, `night`) are gradients drawn in code.
