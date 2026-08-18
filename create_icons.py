#!/usr/bin/env python3

import struct
import zlib

def create_png(width, height, filename):
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    # Create image data
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter byte
        for x in range(width):
            # Create gradient
            r = int(102 + (118 - 102) * x / width)
            g = int(126 + (75 - 126) * x / width)
            b = int(234 + (162 - 234) * x / width)
            
            # Add text area in center
            cx, cy = width // 2, height // 2
            if abs(x - cx) < width // 4 and abs(y - cy) < height // 4:
                r, g, b = 255, 255, 255
            
            raw_data += struct.pack('BBB', r, g, b)

    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk
    compressed_data = zlib.compress(raw_data)
    idat = chunk(b'IDAT', compressed_data)
    
    # IEND chunk
    iend = chunk(b'IEND', b'')
    
    # Write PNG file
    with open(filename, 'wb') as f:
        f.write(signature + ihdr + idat + iend)
    
    print(f"Created {filename}")

if __name__ == '__main__':
    create_png(16, 16, 'icon16.png')
    create_png(48, 48, 'icon48.png')
    create_png(128, 128, 'icon128.png')
