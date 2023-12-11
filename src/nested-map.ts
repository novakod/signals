type MapKey = string | number | symbol;

class CustomMap<Key, Value> extends Map<Key, Value> {
  readonly map = new Map();
}

export class NestedMap<Value> {
  readonly map: CustomMap<MapKey, CustomMap<MapKey, Value> | Value> = new CustomMap();

  private getMap(path: MapKey[]) {
    return path.reduce<CustomMap<MapKey, any> | undefined>((map, key) => {
      if (map instanceof CustomMap) return map.get(key);

      return undefined;
    }, this.map);
  }

  set(path: [MapKey, ...MapKey[]], value: Value): ThisType<NestedMap<Value>> {
    const lastMap = path.slice(0, -1).reduce((map, key) => {
      if (!map.has(key)) {
        const newMap = new CustomMap<MapKey, Value>();
        map.set(key, newMap);
        return newMap;
      }

      return map.get(key) as typeof this.map;
    }, this.map);

    const lastKey = path[path.length - 1];

    if (lastKey !== undefined && lastMap instanceof CustomMap) {
      lastMap.map.set(lastKey, value);
    }

    return this;
  }

  get(path: MapKey[]): Value | undefined {
    const lastMap = this.getMap(path.slice(0, -1));

    const lastKey = path[path.length - 1];

    if (lastKey !== undefined && lastMap instanceof CustomMap) {
      return lastMap?.map.get(path[path.length - 1]);
    }
  }

  has(path: [MapKey, ...MapKey[]]): boolean {
    const lastMap = this.getMap(path.slice(0, -1));

    const lastKey = path[path.length - 1];

    if (lastKey !== undefined && lastMap instanceof CustomMap) {
      return lastMap?.map.has(path[path.length - 1]);
    }

    return false;
  }

  delete(path: [MapKey, ...MapKey[]]): boolean {
    const lastMap = this.getMap(path.slice(0, -1));

    const lastKey = path[path.length - 1];

    if (lastKey !== undefined && lastMap instanceof CustomMap) {
      return lastMap?.map.delete(path[path.length - 1]);
    }

    return false;
  }
}
