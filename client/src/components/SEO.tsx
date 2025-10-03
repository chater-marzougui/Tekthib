import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const Seo = ({
  title = "Tekthib - Tunisian Online Card Game",
  description = "Play Tekthib, the ultimate Tunisian bluffing card game online! Create rooms, invite friends, and master the art of deception.",
  keywords = "Tekthib, Tunisian card game, online card game, bluffing game, multiplayer",
  image = "/og-image.png",
  url = "https://tekthib.com",
  type = "website",
}: SEOProps) => {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update meta tags
    const metaTags = {
      description,
      keywords,
      "og:title": title,
      "og:description": description,
      "og:image": image,
      "og:url": url,
      "og:type": type,
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": image,
    };

    Object.entries(metaTags).forEach(([name, content]) => {
      let element =
        document.querySelector(`meta[name="${name}"]`) ||
        document.querySelector(`meta[property="${name}"]`);

      if (element) {
        element.setAttribute("content", content);
      } else {
        element = document.createElement("meta");
        const attr = name.startsWith("og:") ? "property" : "name";
        element.setAttribute(attr, name);
        element.setAttribute("content", content);
        document.head.appendChild(element);
      }
    });

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", url);
    } else {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      canonical.setAttribute("href", url);
      document.head.appendChild(canonical);
    }
  }, [title, description, keywords, image, url, type]);

  return null;
};

export default Seo;
