export const BASE_PREFIX = "/Tekthib";
export const BASE_URL = `${window.location.origin}${BASE_PREFIX}`;


interface SizeProps {
  cardSize: string;
  overlapOffset: number;
  selectedOffset: number;
  YTranslation: number;
}


interface SizesProps {
  small: SizeProps;
  medium: SizeProps;
  large: SizeProps;
  xlarge: SizeProps;
}

export const CardsSizes: SizesProps = {
  small: {
    cardSize: "w-14 h-20",
    overlapOffset: 20,
    selectedOffset: 25,
    YTranslation: -15,
  },
  medium: {
    cardSize: "w-16 h-24",
    overlapOffset: 22,
    selectedOffset: 30,
    YTranslation: -20,
  },
  large: {
    cardSize: "w-18 h-26",
    overlapOffset: 23,
    selectedOffset: 35,
    YTranslation: -25,
  },
  xlarge: {
    cardSize: "w-24 h-34",
    overlapOffset: 35,
    selectedOffset: 40,
    YTranslation: -30,
  },
};