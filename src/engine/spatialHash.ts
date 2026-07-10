// src/engine/spatialHash.ts

import { BaseEntity, Vector2, SpatialHashGrid } from './types';

export class SpatialHashGridImpl implements SpatialHashGrid {
  cellSize: number;
  cells: Map<string, Set<string>>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  private getCellKey(pos: Vector2): string {
    const cx = Math.floor(pos.x / this.cellSize);
    const cy = Math.floor(pos.y / this.cellSize);
    return `${cx},${cy}`;
  }

  insert(entity: BaseEntity): void {
    const key = this.getCellKey(entity.position);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Set();
      this.cells.set(key, cell);
    }
    cell.add(entity.id);
  }

  remove(entity: BaseEntity): void {
    const key = this.getCellKey(entity.position);
    const cell = this.cells.get(key);
    if (cell) {
      cell.delete(entity.id);
      if (cell.size === 0) {
        this.cells.delete(key);
      }
    }
  }

  update(entity: BaseEntity, prevPos: Vector2): void {
    const oldKey = this.getCellKey(prevPos);
    const newKey = this.getCellKey(entity.position);
    if (oldKey !== newKey) {
      const oldCell = this.cells.get(oldKey);
      if (oldCell) {
        oldCell.delete(entity.id);
        if (oldCell.size === 0) {
          this.cells.delete(oldKey);
        }
      }
      let newCell = this.cells.get(newKey);
      if (!newCell) {
        newCell = new Set();
        this.cells.set(newKey, newCell);
      }
      newCell.add(entity.id);
    }
  }

  queryNearby(position: Vector2, radius: number): string[] {
    const results: string[] = [];
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minY = Math.floor((position.y - radius) / this.cellSize);
    const maxY = Math.floor((position.y + radius) / this.cellSize);

    // We query the bounding box overlapping cells
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const id of cell) {
            results.push(id);
          }
        }
      }
    }
    return results;
  }

  clear(): void {
    this.cells.clear();
  }
}
