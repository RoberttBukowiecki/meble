/**
 * Mock for Three.js in test environment
 */

export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vector3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  add(v: Vector3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v: Vector3) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(s: number) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  toArray() {
    return [this.x, this.y, this.z];
  }
}

export class Quaternion {
  x = 0;
  y = 0;
  z = 0;
  w = 1;

  setFromEuler() {
    return this;
  }

  clone() {
    const q = new Quaternion();
    q.x = this.x;
    q.y = this.y;
    q.z = this.z;
    q.w = this.w;
    return q;
  }
}

export class Euler {
  x = 0;
  y = 0;
  z = 0;
  order = 'XYZ';

  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
  }

  setFromQuaternion() {
    return this;
  }

  clone() {
    return new Euler(this.x, this.y, this.z, this.order);
  }
}

export class Box3 {
  min = new Vector3();
  max = new Vector3();

  setFromObject() {
    return this;
  }

  getCenter(target: Vector3) {
    return target.set(0, 0, 0);
  }

  getSize(target: Vector3) {
    return target.set(100, 100, 100);
  }
}

export class Object3D {
  position = new Vector3();
  rotation = new Euler();
  quaternion = new Quaternion();
  scale = new Vector3(1, 1, 1);
  children: Object3D[] = [];
  parent: Object3D | null = null;

  add(child: Object3D) {
    this.children.push(child);
    child.parent = this;
    return this;
  }

  remove(child: Object3D) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
    return this;
  }

  traverse(callback: (obj: Object3D) => void) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  updateMatrixWorld() {}
}

export class Mesh extends Object3D {
  geometry: any = null;
  material: any = null;
}

export class Group extends Object3D {}

export class Scene extends Object3D {}

export class Shape {
  moveTo() { return this; }
  lineTo() { return this; }
  closePath() { return this; }
}

export class ExtrudeGeometry {
  translate() { return this; }
  dispose() {}
}

export class BufferGeometry {
  dispose() {}
  translate() { return this; }
}

export class BoxGeometry extends BufferGeometry {}

export class MeshStandardMaterial {
  dispose() {}
}

export class Color {
  r = 1;
  g = 1;
  b = 1;

  constructor(color?: string | number) {
    if (typeof color === 'string') {
      // Parse hex color
      this.setHex(parseInt(color.replace('#', ''), 16));
    } else if (typeof color === 'number') {
      this.setHex(color);
    }
  }

  setHex(hex: number) {
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }
}

export class TextureLoader {
  load() {
    return {};
  }
}

export const RepeatWrapping = 1000;
export const SRGBColorSpace = 'srgb';
