# ORacle setup

ORacle is a fan-made Olivia Rodrigo site with an animated photo diary, album pages, live dates, favorites, and personal playlists. It is not affiliated with Olivia Rodrigo or her team.

## Site files

This is a static site. `index.html` loads `config.js`, the local images in `images/`, and the Supabase client library. The Pages workflow is in `.github/workflows/pages.yml`.

## Supabase email accounts

The fan-site Supabase project has been created in the Mumbai region. Its URL and browser-safe publishable key are configured in `config.js`; no service-role key is stored in the site. Hosted Supabase projects require email confirmation by default, and the sign-up flow does not request a phone number.

Once the site is published, set the Supabase Auth **Site URL** and **Redirect URLs** to:

- `https://xilvym-code.github.io/oracle-rodrigo-fan-zine/`

The address must match the final Pages URL. The site passes the current page URL as the email confirmation return address.

The favorites and playlists schema is already applied. The three tables use row-level security so each signed-in user can access only their own songs and playlists.

For dependable email delivery to the public, configure a production SMTP sender in Supabase. The built-in sender has tight delivery limits. Supabase dashboard: `https://supabase.com/dashboard/project/mnufsicajrimkqiyxtlc`.

## Publish with GitHub Pages

1. Create a new **public** repository named `oracle-rodrigo-fan-zine` under `xilvym-code`. Turn on **Add README** so the repository has a `main` branch.
2. Upload the contents of this folder to the repository root, including `.github/workflows/pages.yml` and the `images/` and `supabase/` folders.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. The workflow publishes each push to `main`. Expected site URL: `https://xilvym-code.github.io/oracle-rodrigo-fan-zine/`.

The site footer links to `https://github.com/xilvym-code/oracle-rodrigo-fan-zine`.

## Photo credits

Five distinct photos are stored locally in `images/`. Four photos by Raph_PH are used under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/); the Glastonbury photo by Raph_PH is used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Each gallery caption includes its source and license.
