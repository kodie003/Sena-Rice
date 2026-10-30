"""Assemble the site's pages from shared partials.

Edit the files in _build/partials and _build/pages, then run:
    python _build/build.py
The finished .html files are written to the site root.
"""
import hashlib
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent

NAV = [("index", "Home"), ("about", "About"), ("shop", "Shop"), ("media", "Media"),
       ("gallery", "Gallery"), ("rentals", "Rentals"), ("contact", "Contact")]

DESC = "Sena Rice is premium long-grain rice grown on the delta of the Volta River, Ghana."
PAGES = {
    "index": ("Sena Rice | Superior Taste, Superior Rice | Proudly Ghanaian",
              DESC + " Shop 1kg and 4.5kg packs, bulk orders and farm machinery rentals in Sogakope."),
    "about": ("About Us | Sena Rice", DESC + " Our story, our farm and why Ghana can feed Ghana."),
    "shop": ("Shop | Sena Rice", "Order Sena Rice 1kg and 4.5kg packs or bulk sacks on WhatsApp. Retailers and distributors wanted."),
    "media": ("Media | Sena Rice", "Sena Rice on Metro TV, on billboards and in our campaigns across Ghana."),
    "gallery": ("Gallery | Sena Rice", "Photos from the Sena Rice farm: field days, harvest season and our people."),
    "rentals": ("Farm Equipment Rental, Sogakope | Sena Rice",
                "Tractors, ploughs, harrows, transplanters, fertiliser spreaders and water pumps for rent in Sogakope, Volta Region."),
    "contact": ("Contact | Sena Rice", "Call 0302 420 330 or 0552 907 535, WhatsApp or email senaricegh@gmail.com."),
}

INDEX_HEAD = """  <link rel="preload" as="image" href="assets/img/bag.webp">
  <script>try{if(sessionStorage.getItem("sena-loaded"))document.documentElement.classList.add("skip-loader")}catch(e){}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Organization","name":"Sena Rice","slogan":"Superior Taste, Superior Rice",
   "parentOrganization":{"@type":"Organization","name":"Direct Meridian Company Limited"},
   "email":"senaricegh@gmail.com","telephone":["+233302420330","+233552907535"],
   "address":{"@type":"PostalAddress","addressLocality":"Sogakope","addressRegion":"Volta Region","addressCountry":"GH"},
   "sameAs":["https://www.facebook.com/SenaRice2026/","https://www.instagram.com/senaricegh/","https://www.tiktok.com/@senaricegh"]}
  </script>"""


def nav_links(active, mobile=False):
    out = []
    for i, (slug, label) in enumerate(NAV, 1):
        cur = ' class="is-active" aria-current="page"' if slug == active else ""
        inner = f"<small>{i:02d}</small>{label}" if mobile else label
        out.append(f'      <a href="{slug}.html"{cur}>{inner}</a>')
    return "\n".join(out)


def bust(html):
    """Append a content hash to CSS/JS URLs so browsers never pair new HTML with stale assets."""
    for rel in ("css/styles.css", "js/main.js", "js/hero-logo.js"):
        h = hashlib.sha1((ROOT / rel).read_bytes()).hexdigest()[:10]
        html = html.replace(f'"{rel}"', f'"{rel}?v={h}"')
    return html


def main():
    head = (HERE / "partials/head.html").read_text(encoding="utf8")
    header = (HERE / "partials/header.html").read_text(encoding="utf8")
    footer = (HERE / "partials/footer.html").read_text(encoding="utf8")
    for slug, (title, desc) in PAGES.items():
        body = (HERE / f"pages/{slug}.html").read_text(encoding="utf8")
        is_home = slug == "index"
        html = (
            head.replace("{{title}}", title).replace("{{description}}", desc).replace("{{page}}", slug)
                .replace("{{body_class}}", " is-loading" if is_home else " is-ready")
                .replace("{{head_extra}}", INDEX_HEAD if is_home else "")
            + "\n" + header.replace("{{links}}", nav_links(slug)).replace("{{mlinks}}", nav_links(slug, True))
            + "\n" + body
            + "\n" + footer.replace("{{scripts}}", '<script src="js/hero-logo.js"></script>' if is_home else "")
        )
        (ROOT / f"{slug}.html").write_text(bust(html), encoding="utf8")
        print("built", f"{slug}.html")


if __name__ == "__main__":
    main()
