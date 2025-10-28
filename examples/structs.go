package main

import (
	"fmt"
	"unsafe"
)

// Example of a poorly optimized struct with lots of padding
type BadStruct struct {
	A bool   // 1 byte, 7 bytes padding
	B uint64 // 8 bytes
	C bool   // 1 byte, 7 bytes padding
	D uint64 // 8 bytes
	E uint16 // 2 bytes, 6 bytes padding
	F uint64 // 8 bytes
}

// Example of a better optimized struct
type GoodStruct struct {
	B uint64 // 8 bytes
	D uint64 // 8 bytes
	F uint64 // 8 bytes
	E uint16 // 2 bytes
	A bool   // 1 byte
	C bool   // 1 byte, 4 bytes padding
}

// Classic example from documentation
type User struct {
	ID     uint64 // 8 bytes
	Active bool   // 1 byte, 7 bytes padding
	Name   string // 16 bytes
}

// Already optimal
type Optimal struct {
	ID       uint64
	Name     string
	Email    string
	Age      uint32
	IsActive bool
}

// Complex nested types
type Server struct {
	Port     uint16
	Running  bool
	Hostname string
	Requests uint64
	Data     []byte
	Config   map[string]string
}

func main() {
	bad := BadStruct{}
	good := GoodStruct{}
	user := User{}

	fmt.Printf("BadStruct size: %d bytes\n", unsafe.Sizeof(bad))
	fmt.Printf("GoodStruct size: %d bytes\n", unsafe.Sizeof(good))
	fmt.Printf("User size: %d bytes\n", unsafe.Sizeof(user))
}
