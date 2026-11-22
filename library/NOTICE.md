# Levni Folio: where the props come from

Every prop is stored as SVG path data in a 0–100 box (`library/props/*.json`).

## Origin

- **Miniature motifs** (`tulip`, `carnation`, `blossom-sprig`, `cypress`, `rosette`, 6 variants, Nov 2026): new drawings for the miniature style pack, inspired by Tulip Era motifs, not traced from any painting or photograph.

- **The other 702 variants were authored for Ortak Alan as path code** inside its illustration engine, between July and November 2026: 342 written directly as prop files, 360 "harvested" from `draw` elements that composers (Ortak Alan editors working with an AI agent) wrote for article illustrations and later promoted into the library. Harvested variants keep a `note` such as `harvested from <scene>`.
- **No prop was found to be traced or copied from Tabler Icons or another icon set.** Checked: no prop file mentions Tabler or another source, and none uses the 24-unit Tabler grid. Tabler Icons (MIT) are only used at runtime by the optional `icon` and `ascii` elements and are not shipped here.
- **To check before publishing:** much of the path data was written by an AI agent under editorial direction. Whether CC BY 4.0 can be enforced on such drawings depends on the jurisdiction; the license still states the terms of use clearly. If enforceable attribution matters, consider CC0 for the library instead (see the research note in the Ortak Alan repo).

## Redrawn from open icon sets

Some props are line icons from open sets, converted with `tools/icon-to-prop.mjs` (rescaled to the 0–100 box, inked in the house line, given a riso fill) and reviewed by eye. Their variant `note` names the source.

- **Tabler Icons**, MIT License, Copyright (c) 2020-2026 Paweł Kuna. https://github.com/tabler/tabler-icons
  Props (Nov 2026, 303): adjustments, alarm, alert-circle, alert-triangle, anchor, antenna-bars-5, archive, armchair-2, arrow-big-right, arrow-big-up, arrow-curve-right, arrows-shuffle, article, atom, atom-2, award, backpack, badge, ball-baseball, ball-basketball, ball-football, ball-tennis, ball-volleyball, balloon, barcode, basket, bat, bath, bed, beer, bell-ringing, bike, blockquote, bluetooth, bolt, book-2, bookmark-plus, bookmarks, books, briefcase-2, broadcast, browser, brush, bucket-droplet, building-bank, building-castle, building-church, building-factory, building-hospital, building-lighthouse, building-mosque, building-skyscraper, building-store, building-tunnel, bulb, bus-stop, businessplan, butterfly, cactus, calculator, calendar-event, calendar-time, camera-rotate, campfire, candle, candy, car-suv, cards, carrot, cash, cast, certificate, chart-area, chart-bar, chart-candle, chart-donut, chart-line, cheese, circle-check, circle-x, clipboard, clipboard-check, clipboard-list, clock-hour-4, cloud-computing, cloud-download, cloud-fog, cloud-lock, cloud-snow, cloud-storm, clover, code, coffee, coin-euro, coin-pound, compass, confetti, contract, cookie, cpu, cpu-2, credit-card-pay, cup, currency-lira, database-export, deer, dental, device-desktop, device-floppy, device-gamepad-2, device-sd-card, device-tablet, device-tv-old, device-watch, dice-5, disc, door-enter, droplet, ear, egg, eraser, eye, eyeglass, feather, fence, file-certificate, file-invoice, file-text, files, filter, fingerprint, fingerprint-scan, first-aid-kit, fish-hook, flag-3, flask, flower, folder, folder-open, fridge, gas-station, gift, gift-card, git-branch, git-commit, git-merge, git-pull-request, glass-cocktail, glass-full, golf, grill, guitar-pick, hammer, hanger-2, headset, heart-handshake, heartbeat, help-circle, home-2, horse, hourglass-high, ice-cream, id-badge-2, inbox, info-circle, karate, keyboard-show, ladder, lamp, lamp-2, leaf, lemon, location, lock-open, luggage, mail-opened, map-2, map-pin, meat, medal-2, message-circle, messages, microphone-2, microscope, microwave, moneybag, moon-stars, motorbike, mouse-2, movie, mug, mushroom, music, news, notes, notification, package-export, paint, paperclip, paw, pencil-minus, pencil-plus, photo, piano, pig, pill, pills, ping-pong, pizza, plane-arrival, plane-departure, plant, plant-2, player-pause, player-play, plug-connected, podium, presentation-analytics, printer, puzzle-2, qrcode, quote, receipt-2, recycle, refresh, repeat, report-money, road, road-sign, rosette-discount-check, route, router, rss, ruler, ruler-2, ruler-measure, run, salad, scale, scan, school, scissors, scooter-electric, search, send, server-2, settings-2, share, shield-lock, shirt, shopping-cart, shopping-cart-plus, signature, sitemap, sofa, soup, sparkles, speakerphone, spider, spray, stretching, sun-high, sun-low, sunrise, sunset, swimming, tag, tag-starred, target-arrow, teapot, telescope, temperature, terminal-2, theater, thumb-down, thumb-up, timeline, tool, tools, tools-kitchen-2, tractor, traffic-cone, trash, trees, trending-down, trending-up, truck-delivery, umbrella-2, usb, vaccine, vacuum-cleaner, video, volume, walk, wash-machine, webhook, weight, wheelchair, wind-electricity, world-pin, writing, yoga, zoom-in.

The MIT notice for these drawings:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

Sets checked and fine to convert the same way: Lucide (ISC), Phosphor (MIT), Heroicons (MIT), Iconoir (MIT), Twemoji graphics (CC BY 4.0), Humaaans, Open Peeps and Open Doodles (CC0). Not usable: unDraw, Remix Icon, Blush, Streamline free sets, OpenMoji (share-alike).

## Flagged for review before a public release

These follow the house rules on paper but sit close to the contribution rules (no faces, no logos):

| prop | why |
| --- | --- |
| `apple` (variant 1) | green apple with a bite out of the side: reads close to a well-known logo. Suggest removing variant 1. |
| `book-bitten-apple` | bitten apple silhouette; lower risk, check. |
| `half-comedy-half-tragedy-mask`, `keyhole-mask`, `pulcinella-question`, `redacted-horse-mask` | masks with eyes and mouths (theatre motifs). Stylised, not portraits; decide whether masks count as faces. |
| `telefon-yuzu` | frowning face drawn on a phone screen. |
| `matryoshka-reel`, `reel-eyed-pumpkin`, `clapper-dolls` | doll or pumpkin faces. |

Other naming notes: some prop names are Turkish slugs (`anahtar-deligi`, `defter-sehir`, `mahkeme-yuzu` …) and many tags are Turkish. Lookup works in both languages; renaming to English slugs (keeping the Turkish ones as tags) would help an international library.

A few line-only props drawn in `blue` (for example `mahkeme-yuzu`, `profil-karti`) disappear on a blue panel because only `ink` lines switch to paper on dark grounds. Not a bug in the drawing; worth a recolour rule later.
