"""
Generate a standard PCAP file containing a genuine TCP/HTTP conversation:
SYN -> SYN-ACK -> ACK -> HTTP GET /fanos-suricata-test
This allows Suricata's real protocol decoder, TCP stream reassembly,
and HTTP detection engine to process authentic network frames and emit
a genuine EVE JSON alert for SID 1000001.
"""
import struct
import time
from pathlib import Path

def checksum(data: bytes) -> int:
    if len(data) % 2 == 1:
        data += b'\x00'
    s = sum(struct.unpack(f"!{len(data)//2}H", data))
    s = (s >> 16) + (s & 0xffff)
    s += (s >> 16)
    return (~s) & 0xffff

def ip_checksum(header: bytes) -> int:
    return checksum(header)

def tcp_checksum(src_ip: bytes, dst_ip: bytes, tcp_hdr: bytes, payload: bytes) -> int:
    pseudo_hdr = struct.pack("!4s4sBBH", src_ip, dst_ip, 0, 6, len(tcp_hdr) + len(payload))
    return checksum(pseudo_hdr + tcp_hdr + payload)

def build_packet(src_mac, dst_mac, src_ip_str, dst_ip_str, src_port, dst_port, seq, ack, flags, payload=b""):
    src_ip = bytes(map(int, src_ip_str.split('.')))
    dst_ip = bytes(map(int, dst_ip_str.split('.')))
    
    # TCP Header (without checksum first)
    tcp_hdr_partial = struct.pack("!HHIIBBHHH", src_port, dst_port, seq, ack, (5 << 4), flags, 65535, 0, 0)
    tcp_csum = tcp_checksum(src_ip, dst_ip, tcp_hdr_partial, payload)
    tcp_hdr = struct.pack("!HHIIBBHHH", src_port, dst_port, seq, ack, (5 << 4), flags, 65535, tcp_csum, 0)
    
    # IPv4 Header
    ip_total_len = 20 + len(tcp_hdr) + len(payload)
    ip_hdr_partial = struct.pack("!BBHHHBBH4s4s", 0x45, 0, ip_total_len, 54321, 0x4000, 64, 6, 0, src_ip, dst_ip)
    ip_csum = ip_checksum(ip_hdr_partial)
    ip_hdr = struct.pack("!BBHHHBBH4s4s", 0x45, 0, ip_total_len, 54321, 0x4000, 64, 6, ip_csum, src_ip, dst_ip)
    
    # Ethernet Header
    eth_hdr = dst_mac + src_mac + struct.pack("!H", 0x0800)
    
    return eth_hdr + ip_hdr + tcp_hdr + payload

def create_pcap(filepath: Path, uri: str = "/fanos-suricata-test"):
    src_mac = bytes.fromhex("08002717FF9A")
    dst_mac = bytes.fromhex("0A0027000000")
    src_ip = "192.168.56.103"
    dst_ip = "192.168.56.1"
    src_port = 45708
    dst_port = 8080
    
    now = time.time()
    ts_sec = int(now)
    ts_usec = int((now - ts_sec) * 1_000_000)
    
    packets = []
    
    # 1. Client SYN
    p1 = build_packet(src_mac, dst_mac, src_ip, dst_ip, src_port, dst_port, seq=1000, ack=0, flags=0x02)
    packets.append((ts_sec, ts_usec, p1))
    
    # 2. Server SYN-ACK
    p2 = build_packet(dst_mac, src_mac, dst_ip, src_ip, dst_port, src_port, seq=2000, ack=1001, flags=0x12)
    packets.append((ts_sec, ts_usec + 1000, p2))
    
    # 3. Client ACK
    p3 = build_packet(src_mac, dst_mac, src_ip, dst_ip, src_port, dst_port, seq=1001, ack=2001, flags=0x10)
    packets.append((ts_sec, ts_usec + 2000, p3))
    
    # 4. Client HTTP Request
    http_payload = f"GET {uri} HTTP/1.1\r\nHost: {dst_ip}:{dst_port}\r\nUser-Agent: curl/8.20.0\r\nAccept: */*\r\n\r\n".encode("utf-8")
    p4 = build_packet(src_mac, dst_mac, src_ip, dst_ip, src_port, dst_port, seq=1001, ack=2001, flags=0x18, payload=http_payload)
    packets.append((ts_sec, ts_usec + 3000, p4))
    
    # 5. Server Response (404)
    resp_payload = b"HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\nContent-Length: 13\r\n\r\n404 Not Found"
    p5 = build_packet(dst_mac, src_mac, dst_ip, src_ip, dst_port, src_port, seq=2001, ack=1001 + len(http_payload), flags=0x18, payload=resp_payload)
    packets.append((ts_sec, ts_usec + 4000, p5))
    
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "wb") as f:
        # PCAP Global Header: magic 0xa1b2c3d4, v2.4, thiszone 0, sigfigs 0, snaplen 65535, network 1 (Ethernet)
        f.write(struct.pack("!IHHiIII", 0xa1b2c3d4, 2, 4, 0, 0, 65535, 1))
        for sec, usec, pkt in packets:
            # Packet Header: ts_sec, ts_usec, incl_len, orig_len
            f.write(struct.pack("!IIII", sec, usec, len(pkt), len(pkt)))
            f.write(pkt)
            
    print(f"Created PCAP at {filepath} ({len(packets)} packets, HTTP {uri})")

if __name__ == "__main__":
    pcap_path = Path(r"c:\Fanos Aii\suricata-lab\pcaps\http_test.pcap")
    create_pcap(pcap_path)
