export type LandingSlide = {
  id: string;
  src: string;
  label: string;
  sub: string;
};

export type LandingMediaBundle = {
  hero: {
    laptopSrc: string;
    laptopAlt: string;
    phoneSrc: string;
    phoneAlt: string;
  };
  features: {
    menu: { src: string; alt: string };
    pos: { src: string; alt: string };
    inventory: { src: string; alt: string };
  };
  phoneCarouselSlides: LandingSlide[];
};
