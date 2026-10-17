"""
Enterprise Web Security Scanner Module
Supports imports via both 'scanner.*' and 'app.services.scanner.*'.
"""
import os
import sys

_scanner_dir = os.path.dirname(os.path.abspath(__file__))
if _scanner_dir not in sys.path:
    sys.path.insert(0, _scanner_dir)
_services_dir = os.path.dirname(_scanner_dir)
if _services_dir not in sys.path:
    sys.path.insert(0, _services_dir)
