# Joemon Joy | AI Engineer

A monochrome portfolio with a downloadable resume, desktop section links, a React Bits Card Nav menu on mobile, and an interactive replay of Logly's forced-crash CI test.

## Preview

Run `npm ci` and `npm run dev`, then open `http://127.0.0.1:8765/`. To preview the static build, run `npm run build` and `npm run preview`. A prebuilt `dist/` directory can also be served with `python3 -m http.server 8765 --bind 127.0.0.1 --directory dist`.

## Publish

Push the source to the public `Joemon24/portfolio` repository on `main`. In **Settings → Pages**, set **Source** to **GitHub Actions**, then run **Deploy portfolio to GitHub Pages** from the **Actions** tab. The workflow builds and publishes only `dist/`. The expected URL is `https://joemon24.github.io/portfolio/`.

After connecting a custom domain, update the absolute `og:image` URL in `index.html` to point to it.

Geist is bundled under the SIL Open Font License. The name uses custom pixel lettering. See `components/REACT-BITS-LICENSE.txt` for the React Bits component license.
