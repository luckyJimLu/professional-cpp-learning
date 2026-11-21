import { XianTuModule } from "../../modules/xiantu/XianTuModule";

/**
 * 仙途 lives inside the platform Shell like every other view: it inherits the
 * shared content padding, frame width, header and light theme, and only adds
 * its narrative layer inside the module.
 */
export function XianTuView() {
  return <XianTuModule />;
}

export default XianTuView;
