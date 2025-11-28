package main

// Large struct that spans multiple cache lines (64 bytes each)
type LargeStruct struct {
	A  uint64   // 0-7   (cache line 0)
	B  uint64   // 8-15  (cache line 0)
	C  uint64   // 16-23 (cache line 0)
	D  uint64   // 24-31 (cache line 0)
	E  uint64   // 32-39 (cache line 0)
	F  uint64   // 40-47 (cache line 0)
	G  uint64   // 48-55 (cache line 0)
	H  uint64   // 56-63 (cache line 0) - exactly fills line 0
	I  uint64   // 64-71 (cache line 1)
	J  uint64   // 72-79 (cache line 1)
}

// Struct with a field that crosses cache line boundary
type CacheLineCrosser struct {
	Padding [60]byte  // 0-59 (cache line 0)
	Big     [16]byte  // 60-75 - CROSSES cache line 0→1!
	After   uint64    // 80-87 (cache line 1)
}

// False sharing example - commonly accessed together but on different lines
type FalseSharingRisk struct {
	Counter1 uint64   // 0-7 (cache line 0) - hot field
	Padding  [56]byte // 8-63 (fills cache line 0)
	Counter2 uint64   // 64-71 (cache line 1) - hot field
}

// Well-aligned for concurrent access
type CacheAligned struct {
	Counter1 uint64   // cache line 0
	_pad1    [56]byte // explicit padding to fill line
	Counter2 uint64   // cache line 1
	_pad2    [56]byte // explicit padding to fill line
}

// Typical struct that may cross cache lines unintentionally
type HTTPRequest struct {
	Method      string    // 0-15 (16 bytes)
	URL         string    // 16-31 (16 bytes)
	Headers     []byte    // 32-55 (24 bytes slice header)
	Body        []byte    // 56-79 - CROSSES cache line!
	ContentLen  int64     // 80-87
	StatusCode  int32     // 88-91
	IsSecure    bool      // 92
	KeepAlive   bool      // 93
}
