Fonts served by this site
=========================

Newsreader   - display face.  SIL Open Font License 1.1
Public Sans  - text face.     SIL Open Font License 1.1

Both are self-hosted deliberately: no third-party request is made when a page
loads, which keeps the Content-Security-Policy tight and sends no visitor data
to a font CDN.

Only the subsets actually referenced by _src/css/01-fonts.css are kept here.
To re-fetch a subset, or to fetch a different family while comparing pairings,
request it from the Google Fonts CSS API with a browser user agent and save the
woff2 URLs it returns, for example:

  curl -sL -A "<a browser UA string>" \
    "https://fonts.googleapis.com/css2?family=Public+Sans:wght@100..900&display=swap"

Full license text: https://openfontlicense.org/
Newsreader:  https://github.com/googlefonts/newsreader
Public Sans: https://github.com/uswds/public-sans
