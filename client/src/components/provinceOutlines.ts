// Province label positions from simplemaps SVG (viewBox 0 0 1000 1000)
// The actual SVG paths are loaded from /za-provinces.svg as a background

interface ProvincePosition {
  x: number; // 0-1 normalised
  y: number; // 0-1 normalised
  name: string;
}

const PROVINCE_POSITIONS: Record<string, ProvincePosition> = {
  NC: { x: 0.347, y: 0.282, name: "Northern Cape" },
  KZN: { x: 0.604, y: 0.253, name: "KwaZulu-Natal" },
  FS: { x: 0.483, y: 0.258, name: "Free State" },
  EC: { x: 0.477, y: 0.381, name: "Eastern Cape" },
  LP: { x: 0.563, y: 0.094, name: "Limpopo" },
  NW: { x: 0.448, y: 0.195, name: "North West" },
  MP: { x: 0.578, y: 0.184, name: "Mpumalanga" },
  WC: { x: 0.278, y: 0.431, name: "Western Cape" },
  GP: { x: 0.525, y: 0.179, name: "Gauteng" },
};

export default PROVINCE_POSITIONS;
