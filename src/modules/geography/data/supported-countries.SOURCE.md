# Supported land geometry

Extracted unchanged geometry for ISO_A2 IT, FI, CH from Natural Earth v5.1.2,
`geojson/ne_10m_admin_0_countries.geojson`:
https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_0_countries.geojson

Original full-file SHA256: 239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255.
Checked 2026-11-20. Authors: Natural Earth contributors (Tom Patterson, Nathaniel Vaughn Kelso and others).
Public domain: https://www.naturalearthdata.com/about/terms-of-use/

Used only for conservative local country eligibility, with polygon holes respected.
This is generalized land geometry, not cadastral/municipal boundaries or border navigation.
No new remote geolocation API. Coastlines, small islands, offshore and border positions may
be refused; selecting a country manually remains available. Base map remains global.
