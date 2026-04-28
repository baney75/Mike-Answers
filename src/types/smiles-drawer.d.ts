declare module "smiles-drawer" {
  interface SmilesDrawerOptions {
    width?: number;
    height?: number;
  }

  class SmilesDrawer {
    constructor(options?: SmilesDrawerOptions);
    draw(smiles: string, canvas: HTMLCanvasElement, theme?: "light" | "dark"): Promise<void>;
  }

  export default SmilesDrawer;
}
