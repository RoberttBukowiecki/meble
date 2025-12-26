/**
 * Mock for Three.js in test environment
 */

export class Matrix4 {
  elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  identity() {
    this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    return this;
  }

  compose() {
    return this;
  }

  makeRotationFromEuler() {
    return this;
  }

  setPosition() {
    return this;
  }
}

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

  applyMatrix4(_matrix: Matrix4) {
    // Simplified - just return this without transformation
    return this;
  }

  applyQuaternion(_q: Quaternion) {
    // Simplified - just return this without transformation
    return this;
  }

  crossVectors(a: Vector3, b: Vector3) {
    this.x = a.y * b.z - a.z * b.y;
    this.y = a.z * b.x - a.x * b.z;
    this.z = a.x * b.y - a.y * b.x;
    return this;
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }

  dot(v: Vector3) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  fromArray(arr: number[]) {
    this.x = arr[0] || 0;
    this.y = arr[1] || 0;
    this.z = arr[2] || 0;
    return this;
  }

  divideScalar(s: number) {
    this.x /= s;
    this.y /= s;
    this.z /= s;
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

  setFromEuler(euler: Euler) {
    // XYZ order Euler to Quaternion conversion (matching Three.js)
    const x = euler.x,
      y = euler.y,
      z = euler.z;
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    // XYZ order
    this.x = s1 * c2 * c3 + c1 * s2 * s3;
    this.y = c1 * s2 * c3 - s1 * c2 * s3;
    this.z = c1 * c2 * s3 + s1 * s2 * c3;
    this.w = c1 * c2 * c3 - s1 * s2 * s3;
    return this;
  }

  multiply(q: Quaternion) {
    const ax = this.x,
      ay = this.y,
      az = this.z,
      aw = this.w;
    const bx = q.x,
      by = q.y,
      bz = q.z,
      bw = q.w;

    this.x = ax * bw + aw * bx + ay * bz - az * by;
    this.y = ay * bw + aw * by + az * bx - ax * bz;
    this.z = az * bw + aw * bz + ax * by - ay * bx;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
  }

  invert() {
    // Conjugate for unit quaternion
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
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
  order = "XYZ";

  constructor(x = 0, y = 0, z = 0, order = "XYZ") {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
  }

  set(x: number, y: number, z: number, order?: string) {
    this.x = x;
    this.y = y;
    this.z = z;
    if (order) this.order = order;
    return this;
  }

  fromArray(arr: number[]) {
    this.x = arr[0] || 0;
    this.y = arr[1] || 0;
    this.z = arr[2] || 0;
    return this;
  }

  setFromQuaternion(q: Quaternion) {
    // Quaternion to Euler conversion (XYZ order, matching Three.js)
    const matrix = [
      1 - 2 * (q.y * q.y + q.z * q.z),
      2 * (q.x * q.y + q.w * q.z),
      2 * (q.x * q.z - q.w * q.y),
      2 * (q.x * q.y - q.w * q.z),
      1 - 2 * (q.x * q.x + q.z * q.z),
      2 * (q.y * q.z + q.w * q.x),
      2 * (q.x * q.z + q.w * q.y),
      2 * (q.y * q.z - q.w * q.x),
      1 - 2 * (q.x * q.x + q.y * q.y),
    ];
    // m11, m12, m13, m21, m22, m23, m31, m32, m33

    // XYZ order
    this.y = Math.asin(Math.max(-1, Math.min(1, matrix[6])));
    if (Math.abs(matrix[6]) < 0.9999999) {
      this.x = Math.atan2(-matrix[7], matrix[8]);
      this.z = Math.atan2(-matrix[3], matrix[0]);
    } else {
      this.x = Math.atan2(matrix[5], matrix[4]);
      this.z = 0;
    }
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

  setFromCenterAndSize(center: Vector3, size: Vector3) {
    const halfSize = size.clone().multiplyScalar(0.5);
    this.min.set(center.x - halfSize.x, center.y - halfSize.y, center.z - halfSize.z);
    this.max.set(center.x + halfSize.x, center.y + halfSize.y, center.z + halfSize.z);
    return this;
  }

  setFromPoints(points: Vector3[]) {
    this.min.set(Infinity, Infinity, Infinity);
    this.max.set(-Infinity, -Infinity, -Infinity);
    for (const point of points) {
      this.min.x = Math.min(this.min.x, point.x);
      this.min.y = Math.min(this.min.y, point.y);
      this.min.z = Math.min(this.min.z, point.z);
      this.max.x = Math.max(this.max.x, point.x);
      this.max.y = Math.max(this.max.y, point.y);
      this.max.z = Math.max(this.max.z, point.z);
    }
    return this;
  }

  applyMatrix4() {
    return this;
  }

  intersectsBox(box: Box3) {
    return !(
      box.max.x < this.min.x ||
      box.min.x > this.max.x ||
      box.max.y < this.min.y ||
      box.min.y > this.max.y ||
      box.max.z < this.min.z ||
      box.min.z > this.max.z
    );
  }

  getCenter(target: Vector3) {
    return target.set(
      (this.min.x + this.max.x) / 2,
      (this.min.y + this.max.y) / 2,
      (this.min.z + this.max.z) / 2
    );
  }

  getSize(target: Vector3) {
    return target.set(this.max.x - this.min.x, this.max.y - this.min.y, this.max.z - this.min.z);
  }
}

export class Object3D {
  position = new Vector3();
  rotation = new Euler();
  quaternion = new Quaternion();
  scale = new Vector3(1, 1, 1);
  children: Object3D[] = [];
  parent: Object3D | null = null;
  matrixWorld = new Matrix4();
  matrix = new Matrix4();

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
  moveTo() {
    return this;
  }
  lineTo() {
    return this;
  }
  closePath() {
    return this;
  }
}

export class ExtrudeGeometry {
  translate() {
    return this;
  }
  dispose() {}
}

export class BufferGeometry {
  dispose() {}
  translate() {
    return this;
  }
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
    if (typeof color === "string") {
      // Parse hex color
      this.setHex(parseInt(color.replace("#", ""), 16));
    } else if (typeof color === "number") {
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
export const SRGBColorSpace = "srgb";
