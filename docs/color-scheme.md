# Color scheme

Beema looks like one honey-and-ink brand. It is four palettes. A question screen, Bask's Global Settings panel, the marketing site, and the logo/email files each pick their own hex for the same job.

On a styled question screen the **page script wins**. Bask Global Settings still paints anything the script does not touch (progress bar, help button, header bar, and any screen that does not have the script). The marketing site never sees either of those. It reads `src/styles.css`.

Captured 29 Oct 2026. Script source: the universal question template **v6.2** in the Bask questionnaire page styler. Global Settings source: the Colors panel in the Visual Customizer (screenshots that day). Marketing source: `src/styles.css` `:root`, converted from oklch to sRGB. Type is in [Fonts](#fonts) below.

## Same role, different hex

| Role | Question script (v6.2) | Bask Global Settings | Marketing site | Logo and email |
|---|---|---|---|---|
| Gold | **#EEB318** | **#E2A93B** (buttons and progress bar) | **#EEB318** (`primary`) | **#E5B01A** |
| Pale gold | **#FDF2D0** | not set | **#FDF2D0** (`primary-soft`) | - |
| Cream / track | page gradient ends at **#FDFDFB** | progress track is also **#E2A93B** (same as the bar) | **#F9EBBE** (`accent`) | - |
| Deep gold label | **#6C4800** | not set | **#6D4700** (`accent-foreground`) | - |
| Near-black text | **#14161B** | **#1F2D3D** | **#14161B** (`foreground`) | **#1A1A1A** |
| Black bands | - | - | **#121419** (`ink`, hero and footer) | - |
| Slate button | - | - | **#32353D** (`secondary`) | - |
| Muted text | **#55585F** | **#5A6B7B** | **#55585F** (`muted-foreground`) | **#5C5C5C** (email only) |
| Page background | **#FCF7EA → #FDFAF2 → #FDFDFB** | **#FDFDFB** flat | **#FDFDFB** (`background`) | white |
| Card / answer | **#FFFFFF** at 90% | **#FFFFFF** | **#FFFFFF** (`card`) | white |

The script and the marketing site agree on honey **#EEB318**, pale gold **#FDF2D0**, ink **#14161B**, and muted **#55585F**. Bask Global Settings does not. Its gold is **#E2A93B** and its text is navy **#1F2D3D**. The logo and the mailer use a third gold, **#E5B01A**, with black **#1A1A1A**.

The styler notes still say the progress track is pale gold **#F9EBBE**. The Colors panel on 29 Oct 2026 has both "Progress bar color" and "Progress bar background color" set to **#E2A93B**, so the track and the fill are the same gold.

## Question screens (universal template, v6.2)

The script is page-level Custom JavaScript. It restyles the question. It does not change answers, validation, or prices. Checkout, auth, and interstitial scripts reuse this same set.

| Color | Hex | Where it's used |
|---|---|---|
| Ink (near-black) | **#14161B** | Question headings, answer text, number badges on answer cards, Next/Continue button, "Beema" in the logo, pop-up headings, pop-up primary button |
| Gold | **#EEB318** | "Health" in the logo, hover on Next and on answer cards, left border on info notes, focus outline on fields, selected dot inside radio circles, border on secondary buttons |
| Deep gold | **#6C4800** | Small uppercase pre-header labels, unit labels next to inputs (for example "lb") |
| Accent gold | **#B47F00** | Checklist and info icons, radio selection-circle border |
| Pale gold | **#FDF2D0** | Answer card hover background, secondary buttons (Add medication, Choose a file, Add more) |
| Card ring | **#EFE3C2** | Answer card outline, bordered boxes (medication list), pop-up input borders |
| Muted gray | **#55585F** | Subheadings and helper text under the question, info-note text, empty-state lines inside a bordered box |
| White | **#FFFFFF** (rgba 255,255,255,.9) | Answer cards, input fields, text on the Next button. Info notes use the same white at .8 |
| Disabled button | **#E9E4D6** background / **#8A8780** text | Next button before an answer is picked |
| Page background | gradient **#FCF7EA → #FDFAF2 → #FDFDFB** | Cream page behind everything |
| Header divider | **#EEB318** at 35% opacity | Thin line under the logo / progress bar |
| Pop-up background | **#FDFAF2** | Add/Edit medication pop-up |

The script does not set the progress bar, the help button, or the header bar fill. Those stay on Bask Global Settings.

## Bask Global Settings

Colors panel in the Visual Customizer, 29 Oct 2026. These are the values patients see wherever a page script does not override them.

| Color | Hex | Global Settings field |
|---|---|---|
| White | **#FFFFFF** | Header color, question background, answer background |
| Navy | **#1F2D3D** | Header text, help button, help text button, primary text, primary button text, secondary button text, pre-header text |
| Bask gold | **#E2A93B** | Progress bar, progress bar background, primary button, secondary button |
| Page cream | **#FDFDFB** | Questionnaire background |
| Blue gray | **#5A6B7B** | Secondary text |

Left blank in that panel (no hex entered): back button, secondary question background, answer text, answer highlight, answer hover, answer outline. On a v6.2 question screen the script fills answer text, hover, and outline itself.

## Marketing site

Defined as oklch in `src/styles.css`. Components use the token names (`bg-primary`, `text-foreground`), not raw hex. Dark mode is in the same file and is almost unused. Hex here is the light-mode sRGB equivalent.

| Color | Hex | Token | Where it's used |
|---|---|---|---|
| Honey gold | **#EEB318** | `primary` | Default buttons and badges, link text, footer labels, "Health" on black bands |
| Focus gold | **#D6A21E** | `ring` | Focus ring on buttons and inputs |
| Caution gold | **#F4C855** | `warning` | Disclaimers, pending states, status chips |
| Honey cream | **#F9EBBE** | `accent` | Menu hovers, selected rows |
| Pale gold | **#FDF2D0** | `primary-soft` | Soft buttons, start of the hero gradient |
| Deep gold | **#6D4700** | `accent-foreground` | "Health" in the wordmark on white pages |
| Brown-black | **#241C0C** | `primary-foreground` | Text on yellow buttons |
| Bronze | **#4E3504** | `warning-foreground` | Text on warning chips |
| Ink band | **#121419** | `ink` | Homepage hero, Mission, footer, about, recipes |
| Body ink | **#14161B** | `foreground` | Headings and body text |
| Off-white on ink | **#FAFAF9** | `ink-foreground` | Text and logo on black bands |
| Slate | **#32353D** | `secondary` | Secondary buttons and badges. Rare on marketing pages |
| Slate text | **#F9F8F6** | `secondary-foreground` | Text on those slate buttons |
| Page | **#FDFDFB** | `background` | Page background |
| Card | **#FFFFFF** | `card` | Cards, dialogs, outline buttons |
| Muted fill | **#F2F4F6** | `muted` | Ghost hover, quiet chips |
| Muted text | **#55585F** | `muted-foreground` | Secondary copy |
| Border | **#E1E3E6** | `border`, `input` | Hairlines and inputs |
| Red | **#CE5053** | `destructive` | Errors and destructive buttons |
| Green | **#47935F** | `success` | Success badges |
| Trust blue | **#2171CC** | `trust` | Compliance accent. A handful of medical-team spots |

Sidebar tokens copy `primary`, `accent`, `border`, and `ring`. They are not extra colors. Hero and footer glows (`bg-grad-hero`, `bg-grad-ink`, `bg-mesh-glow`) reuse honey and ink. They do not add a new hue.

## Logo and email

| Color | Hex | Where |
|---|---|---|
| Logo honey | **#E5B01A** | Hexagon stroke in `public/bimi/logo.svg`. Mailer buttons (`mailer/emailing.py`, campaign button backgrounds) |
| Logo black | **#1A1A1A** | Bee body in the BIMI mark. Mailer body text and button label |
| White | **#FFFFFF** | Logo ground, email page |
| Email gray | **#5C5C5C** | Mailer muted text |
| Email rule | **#E6E6E6** | Mailer dividers |
| Link blue | **#1A73E8** | Mailer links |

The on-site wordmark in `src/components/brand/Logo.tsx` does not use the SVG honey. "Beema" is `foreground` or `ink-foreground`. "Health" is `accent-foreground` on white and `primary` on black bands.

## Fonts

Body copy agrees. Headings do not. The questionnaire is a serif (Cormorant Garamond). The marketing site is a geometric sans (Outfit). Figtree is the shared text face.

| Role | Question script | Marketing site | Email |
|---|---|---|---|
| Headings | Cormorant Garamond 500 | Outfit (400-800) | Arial |
| Body, buttons, fields | Figtree (400-700) | Figtree (400-700) | Arial |
| Logo wordmark | velasansGX 700 | Outfit bold, or a flattened image | none (buttons are Arial) |
| Numbers in code / staff tools | - | system monospace (`font-mono`) | - |

### Questionnaire (custom JavaScript)

Cormorant and Figtree are loaded from Google Fonts inside the page script: `Cormorant Garamond` italic and roman at weight 500, `Figtree` at 400, 500, 600, and 700. `velasansGX` is not loaded by the script. It is already on the Bask page. If it fails, the logo falls back to Figtree.

Cormorant uses old-style numerals by default (1 looks like I, 0 looks like O). The script forces `font-variant-numeric: lining-nums` on headings and the BMI number.

| Font | Where it's used |
|---|---|
| Cormorant Garamond (weight 500) | Question headings, hero headlines on in-between screens, checkout titles ("Review treatment and pay", "Select your shipping plan"), "Shipping Address", pop-up titles, the BMI number |
| Cormorant Garamond italic 500 | Accent word inside an interstitial headline (`em`). Question headings stay roman. The logo's "Health" is an `i` forced back to `font-style: normal`, so it stays velasans, colored gold |
| Figtree (400-700) | Everything else: answer text, subheadings, helper text, small gold labels, inputs, buttons (Next, Pay, Continue), fine print, pop-up body |
| velasansGX (weight 700) | The "Beema Health" text logo only. "Beema" is ink, "Health" is gold |

Checkout, auth, and interstitial scripts use this same trio. Bask Global Settings → Typography still applies on any screen that does not have the script. This doc does not have that panel's current font names.

### Marketing site

Set in `src/styles.css`. Both families are self-hosted with `@fontsource` (bundled in the site CSS, not requested from Google Fonts). Fallback is `ui-sans-serif, system-ui, sans-serif`.

| Font | Weights loaded | Where it's used |
|---|---|---|
| Outfit | 400, 500, 600, 700, 800 | Every `h1`-`h5` (`--font-display`). Also the live-text "Beema Health" wordmark in `Logo.tsx` (`font-display`, bold) and the BMI gauge number |
| Figtree | 400, 500, 600, 700 | Body text (`--font-sans`), buttons, nav, forms, paragraphs, `h6` |
| System monospace | browser default | Staff screens, questionnaire builder, and code samples (`font-mono`) |

The desktop header does not set type at all. `HeaderLogo` is a flattened WebP lockup (`beema-lockup.webp`). The mobile header uses the bee image plus the Outfit wordmark.

Headings get `letter-spacing: -0.02em`. There is no italic accent word on the marketing site. "Health" changes color, not font style.

### Other surfaces

| Surface | Font | Where |
|---|---|---|
| CRO lab | Figtree 400-700, self-hosted | `tools/cro-lab`. Numbers use `ui-monospace, "SF Mono", Menlo` |
| Patient email | Arial, Helvetica, sans-serif | `mailer/emailing.py`. Email clients cannot use Outfit or Figtree reliably |
| Error page | `system-ui` | `src/lib/error-page.ts`, the offline fallback HTML |

## What to edit

| If you want to change... | Edit this | Leave this alone |
|---|---|---|
| How a question screen looks | The page's Custom JavaScript (v6.2 template) | Bask Global Settings, unless the screen has no script |
| Progress bar, help button, header bar, unstyled screens | Bask Global Settings → Colors | The page script. It does not set those |
| Marketing pages, buttons, heroes | `src/styles.css`, then usage in `src/lib/design-tokens.ts` | Questionnaire scripts and the logo SVG |
| Marketing type | `src/styles.css` (`--font-display` is Outfit, `--font-sans` is Figtree) | The questionnaire script. It does not read those variables |
| Question-screen type | The page's Custom JavaScript (Google Fonts link plus the Cormorant / Figtree / velasans rules) | `src/styles.css` |
| The bee mark and email buttons | `public/bimi/logo.svg` and `mailer/emailing.py` | The CSS tokens |
