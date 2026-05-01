export type PhotoCarouselSlide = {
  src: string;
  alt: string;
  caption: string;
  location?: string;
};

export const DEFAULT_LAMBUNAO_SLIDES: PhotoCarouselSlide[] = [
  {
    src: '/carousel/i%20love%20lambunao.jpg',
    alt: 'The colorful LAMBUNAO sign monument with the heart sculpture in the plaza',
    caption: 'Colorful "I ❤ LAMBUNAO" sign in Iloilo, PH.',
    location: 'Plaza Rizal',
  },
  {
    src: '/carousel/plaza.jpg',
    alt: 'Plaza Rizal at the heart of Lambunao',
    caption: 'Plaza — where the bayan gathers.',
    location: 'Brgy. Poblacion',
  },
  {
    src: '/carousel/church.jpg',
    alt: 'The Catholic parish church of Lambunao',
    caption: 'The parish church — dignified, unchanged.',
    location: 'Brgy. Poblacion',
  },
  {
    src: '/carousel/tinagong%20dagat.jpg',
    alt: 'Tinagong Dagat — the hidden sea of Lambunao',
    caption: 'Tinagong Dagat',
    location: 'Highland Lambunao',
  },
  {
    src: '/carousel/mariit.JPG',
    alt: 'Mariit Park, Lambunao',
    caption: 'Mariit Park — green, quiet, ours.',
    location: 'Mariit',
  },
  {
    src: '/carousel/Mari-it%20park-a.JPG',
    alt: 'Visayan Tarictic Hornbill, native to Panay.',
    caption: 'Visayan Tarictic Hornbill, native to Panay.',
    location: 'Mariit',
  },
  {
    src: '/carousel/twon.jpg',
    alt: 'A view of Lambunao town',
    caption: 'Padayon ang banwa.',
    location: 'Lambunao',
  },
  {
    src: '/carousel/images.jpg',
    alt: 'A scene from Lambunao',
    caption: 'The parish church',
    location: 'Lambunao',
  },
];
