# Changelog

All notable changes to the Go Memory Layout Visualizer extension will be documented in this file.

## [0.1.0] - 2025-11-21

### Added
- Initial release
- Real-time memory layout visualization for Go structs
- Inline annotations showing byte offsets, sizes, and padding
- Multi-architecture support (amd64, arm64, 386)
- Hover provider with detailed field information
- CodeLens provider for one-click struct optimization
- Automatic field reordering to minimize memory usage
- Padding detection and highlighting
- Commands:
  - `Go: Optimize Struct Memory Layout`
  - `Go: Show Memory Layout`
  - `Go: Toggle Architecture`
- Configuration options:
  - Default architecture selection
  - Toggle inline annotations
  - Padding warning threshold
  - Cache line warnings

### Features
- Supports all Go primitive types (bool, int8-64, uint8-64, float32/64, complex64/128)
- Handles pointers, slices, arrays, maps, channels, interfaces
- Smart field ordering by alignment and size
- Visual padding warnings with configurable thresholds
- Side-by-side memory layout comparison panel
- Comprehensive test coverage for calculator, parser, and optimizer

### Technical Details
- Built with TypeScript
- Zero external runtime dependencies
- Full test suite with 30+ test cases
- Follows Go's memory layout rules precisely
- Accurate padding calculation
- Support for embedded fields and complex types
