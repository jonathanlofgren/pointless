export interface PointScale {
  id: string;
  label: string;
  values: string[];
}

export const SCALES: PointScale[] = [
  {
    id: "fibonacci",
    label: "Fibonacci",
    values: ["0", "1", "2", "3", "5", "8", "13", "21", "?", "pass"],
  },
  {
    id: "tshirt",
    label: "T-Shirt",
    values: ["XS", "S", "M", "L", "XL", "?", "pass"],
  },
  {
    id: "linear",
    label: "Linear",
    values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?", "pass"],
  },
  {
    id: "powers",
    label: "Powers of 2",
    values: ["1", "2", "4", "8", "16", "32", "?", "pass"],
  },
];

export function getScaleById(id: string): PointScale {
  return SCALES.find((s) => s.id === id) ?? SCALES[0];
}
