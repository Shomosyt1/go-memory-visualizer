import { Architecture } from './types';

interface TypeSizeInfo {
  size: number;
  alignment: number;
}

export class MemoryCalculator {
  private arch: Architecture;

  constructor(architecture: Architecture = 'amd64') {
    this.arch = architecture;
  }

  setArchitecture(arch: Architecture): void {
    this.arch = arch;
  }

  getArchitecture(): Architecture {
    return this.arch;
  }

  getTypeInfo(typeName: string): TypeSizeInfo {
    const ptrSize = this.getPointerSize();
    
    // Basic Go types with their sizes
    switch (typeName) {
      case 'bool':
      case 'int8':
      case 'uint8':
      case 'byte':
        return { size: 1, alignment: 1 };
      
      case 'int16':
      case 'uint16':
        return { size: 2, alignment: 2 };
      
      case 'int32':
      case 'uint32':
      case 'float32':
      case 'rune':
        return { size: 4, alignment: 4 };
      
      case 'int64':
      case 'uint64':
      case 'float64':
      case 'complex64':
        return { size: 8, alignment: 8 };
      
      case 'complex128':
        return { size: 16, alignment: 8 };
      
      case 'int':
      case 'uint':
      case 'uintptr':
        return { size: ptrSize, alignment: ptrSize };
      
      case 'string':
        return { size: ptrSize * 2, alignment: ptrSize };
      
      default:
        // Handle pointers, slices, maps, channels, interfaces
        if (typeName.startsWith('*') || typeName.startsWith('[]')) {
          return { size: ptrSize, alignment: ptrSize };
        }
        if (typeName.startsWith('[') && typeName.includes(']')) {
          // Array type [N]T
          const match = typeName.match(/\[(\d+)\](.+)/);
          if (match) {
            const count = parseInt(match[1], 10);
            const elemType = match[2];
            const elemInfo = this.getTypeInfo(elemType);
            return {
              size: count * elemInfo.size,
              alignment: elemInfo.alignment
            };
          }
        }
        if (typeName.startsWith('map[') || typeName.startsWith('chan ')) {
          return { size: ptrSize, alignment: ptrSize };
        }
        if (typeName === 'interface{}' || typeName === 'any') {
          return { size: ptrSize * 2, alignment: ptrSize };
        }
        
        // Default for unknown types (custom structs, etc.)
        return { size: ptrSize, alignment: ptrSize };
    }
  }

  private getPointerSize(): number {
    switch (this.arch) {
      case 'amd64':
      case 'arm64':
        return 8;
      case '386':
        return 4;
      default:
        return 8;
    }
  }

  alignOffset(offset: number, alignment: number): number {
    const remainder = offset % alignment;
    if (remainder === 0) {
      return offset;
    }
    return offset + (alignment - remainder);
  }

  calculateStructSize(fields: Array<{ typeName: string }>): { size: number; alignment: number; fieldOffsets: number[]; paddings: number[] } {
    if (fields.length === 0) {
      return { size: 0, alignment: 1, fieldOffsets: [], paddings: [] };
    }

    let currentOffset = 0;
    let maxAlignment = 1;
    const fieldOffsets: number[] = [];
    const paddings: number[] = [];

    for (const field of fields) {
      const typeInfo = this.getTypeInfo(field.typeName);
      maxAlignment = Math.max(maxAlignment, typeInfo.alignment);
      
      // Align the field
      const alignedOffset = this.alignOffset(currentOffset, typeInfo.alignment);
      const paddingBefore = alignedOffset - currentOffset;
      
      fieldOffsets.push(alignedOffset);
      currentOffset = alignedOffset + typeInfo.size;
      paddings.push(paddingBefore);
    }

    // Align the total struct size to its alignment
    const totalSize = this.alignOffset(currentOffset, maxAlignment);
    const finalPadding = totalSize - currentOffset;

    return {
      size: totalSize,
      alignment: maxAlignment,
      fieldOffsets,
      paddings: [...paddings, finalPadding]
    };
  }
}
