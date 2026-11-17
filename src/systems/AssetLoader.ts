import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
// Future licensed knight assets can replace the original procedural rig here.
// The first playable is completely self-contained and makes no asset requests.
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
