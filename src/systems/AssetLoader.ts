import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
// General GLTF cache for props and the supplied knight. The retained canonical rig
// uses the original sculpt GLB via prepareArmor, preserving neutral axes for contact correction.
export class AssetLoader {
  private loader = new GLTFLoader();
  private cache = new Map<string, Promise<GLTF>>();
  loadGLTF(url: string) {
    let asset = this.cache.get(url);
    if (!asset) {
      asset = this.loader.loadAsync(url);
      this.cache.set(url, asset);
      asset.catch(() => this.cache.delete(url));
    }
    return asset;
  }
}
