package main

// EXAMPLE 1: Badly Optimized Struct (29% waste)
// This struct wastes 14 bytes due to poor field ordering
type UserProfile struct {
	Active  bool    // offset: 0  | size: 1  | align: 1 | padding: 7 [!]
	UserID  uint64  // offset: 8  | size: 8  | align: 8 | padding: 0
	Name    string  // offset: 16 | size: 16 | align: 8 | padding: 0
	Age     uint8   // offset: 32 | size: 1  | align: 1 | padding: 7 [!]
	Balance float64 // offset: 40 | size: 8  | align: 8 | padding: 0
}

// Total: 48 bytes | Padding: 14 bytes (29.2% waste)
// The extension would show: Optimize struct - save 14 bytes (29% reduction)

// EXAMPLE 2: Optimized Version (15% waste)
// Same struct but with fields reordered by alignment/size
type UserProfileOptimized struct {
	UserID  uint64  // offset: 0  | size: 8  | align: 8 | padding: 0
	Balance float64 // offset: 8  | size: 8  | align: 8 | padding: 0
	Name    string  // offset: 16 | size: 16 | align: 8 | padding: 0
	Active  bool    // offset: 32 | size: 1  | align: 1 | padding: 0
	Age     uint8   // offset: 33 | size: 1  | align: 1 | padding: 6 (final)
}

// Total: 40 bytes | Padding: 6 bytes (15% waste)
// Saved: 8 bytes = 16.7% reduction!

// EXAMPLE 3: API Response (21.4% waste)
type APIResponse struct {
	Success   bool   // offset: 0  | size: 1  | padding: 7 [!]
	Timestamp int64  // offset: 8  | size: 8  | padding: 0
	Message   string // offset: 16 | size: 16 | padding: 0
	Code      int32  // offset: 32 | size: 4  | padding: 4 [!]
	RequestID string // offset: 40 | size: 16 | padding: 0
}

// Total: 56 bytes | Padding: 11 bytes (19.6% waste)

// EXAMPLE 4: API Response Optimized (6.3% waste)
type APIResponseOptimized struct {
	Timestamp int64  // offset: 0  | size: 8  | padding: 0
	Message   string // offset: 8  | size: 16 | padding: 0
	RequestID string // offset: 24 | size: 16 | padding: 0
	Code      int32  // offset: 40 | size: 4  | padding: 0
	Success   bool   // offset: 44 | size: 1  | padding: 3 (final)
}

// Total: 48 bytes | Padding: 3 bytes (6.3% waste)
// Saved: 8 bytes = 14.3% reduction!
// Impact: 1 million responses = 8 MB saved!

// EXAMPLE 5: Cache Line Crossing (Performance Issue!)
// This struct crosses CPU cache line boundary (64 bytes)
type LargeDataStruct struct {
	Header    [56]byte  // offset: 0  | size: 56 | padding: 0
	Timestamp int64     // offset: 56 | size: 8  | padding: 0 [CROSSES CACHE LINE!]
	Data      [100]byte // offset: 64 | size: 100 | padding: 0
}

// Total: 164 bytes
// Warning: The 'Timestamp' field crosses the 64-byte cache line boundary
// This can cause performance issues in hot paths!

// EXAMPLE 6: Already Optimal (0% waste)
// This struct is perfectly packed with zero padding
type OptimalStruct struct {
	A uint64 // offset: 0  | size: 8 | padding: 0
	B uint64 // offset: 8  | size: 8 | padding: 0
	C uint32 // offset: 16 | size: 4 | padding: 0
	D uint32 // offset: 20 | size: 4 | padding: 0
	E uint16 // offset: 24 | size: 2 | padding: 0
	F uint16 // offset: 26 | size: 2 | padding: 0
	G uint8  // offset: 28 | size: 1 | padding: 0
	H uint8  // offset: 29 | size: 1 | padding: 0
	I uint8  // offset: 30 | size: 1 | padding: 0
	J uint8  // offset: 31 | size: 1 | padding: 0
}

// Total: 32 bytes | Padding: 0 bytes (0% waste)
// No optimization needed!

// EXAMPLE 7: Database Model (Before Optimization)
type User struct {
	IsAdmin   bool   // offset: 0  | size: 1  | padding: 7 [!]
	ID        uint64 // offset: 8  | size: 8  | padding: 0
	Email     string // offset: 16 | size: 16 | padding: 0
	Active    bool   // offset: 32 | size: 1  | padding: 7 [!]
	CreatedAt int64  // offset: 40 | size: 8  | padding: 0
	Username  string // offset: 48 | size: 16 | padding: 0
}

// Total: 64 bytes | Padding: 14 bytes (21.9% waste)

// EXAMPLE 8: Database Model (After Optimization)
type UserOptimized struct {
	ID        uint64 // offset: 0  | size: 8  | padding: 0
	CreatedAt int64  // offset: 8  | size: 8  | padding: 0
	Email     string // offset: 16 | size: 16 | padding: 0
	Username  string // offset: 32 | size: 16 | padding: 0
	IsAdmin   bool   // offset: 48 | size: 1  | padding: 0
	Active    bool   // offset: 49 | size: 1  | padding: 6 (final)
}

// Total: 56 bytes | Padding: 6 bytes (10.7% waste)
// Saved: 8 bytes = 12.5% reduction!
// Impact: 100k users = 800 KB saved!

// EXAMPLE 9: Network Protocol Header (Before)
type PacketHeader struct {
	Version  uint8  // offset: 0  | size: 1 | padding: 1 [!]
	Length   uint16 // offset: 2  | size: 2 | padding: 4 [!]
	Sequence uint64 // offset: 8  | size: 8 | padding: 0
	Type     uint8  // offset: 16 | size: 1 | padding: 7 [!]
	Checksum uint64 // offset: 24 | size: 8 | padding: 0
}

// Total: 32 bytes | Padding: 12 bytes (37.5% waste)

// EXAMPLE 10: Network Protocol Header (After)
type PacketHeaderOptimized struct {
	Sequence uint64 // offset: 0  | size: 8 | padding: 0
	Checksum uint64 // offset: 8  | size: 8 | padding: 0
	Length   uint16 // offset: 16 | size: 2 | padding: 0
	Version  uint8  // offset: 18 | size: 1 | padding: 0
	Type     uint8  // offset: 19 | size: 1 | padding: 4 (final)
}

// Total: 24 bytes | Padding: 4 bytes (16.7% waste)
// Saved: 8 bytes = 25% reduction!
// Impact on network: Sending 1M packets saves 8 MB bandwidth!

func main() {
	// When you open this file in VS Code with the extension enabled:
	//
	// 1. You'll see inline annotations above each struct field showing:
	//    - Byte offset where the field starts
	//    - Field size in bytes
	//    - Alignment requirement
	//    - Padding bytes after the field
	//
	// 2. Fields with excessive padding (>8 bytes default) are highlighted in yellow/orange
	//
	// 3. Above each unoptimized struct, you'll see a CodeLens button:
	//    "Optimize struct - save X bytes (Y% reduction)"
	//
	// 4. Hovering over any field shows detailed tooltip:
	//    - All memory layout details
	//    - Optimization suggestions
	//    - Impact on struct size
	//
	// 5. Use Command Palette (Ctrl+Shift+P):
	//    - "Go: Show Memory Layout" - Full report
	//    - "Go: Optimize Struct Memory Layout" - Reorder fields
	//    - "Go: Toggle Architecture" - Switch amd64/arm64/386
	//
	// Try it yourself!
}
