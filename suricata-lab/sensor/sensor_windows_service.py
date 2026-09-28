"""Windows Service Control Manager host for the FANOS Sensor Service."""
from __future__ import annotations

import logging
import threading

import servicemanager
import win32event
import win32service
import win32serviceutil

from sensor_service import (
    DEFAULT_CONFIG_PATH,
    DEFAULT_LOG_PATH,
    SensorServiceWorker,
    configure_logging,
    load_service_environment,
)


class FANOSSensorService(win32serviceutil.ServiceFramework):
    _svc_name_ = "FANOSSensorService"
    _svc_display_name_ = "FANOS Sensor Service"
    _svc_description_ = (
        "FANOS AI background sensor service for Suricata monitoring, event "
        "collection, backend communication, and sensor lifecycle control."
    )

    def __init__(self, args):
        super().__init__(args)
        self.stop_handle = win32event.CreateEvent(None, 0, 0, None)
        self.stop_event = threading.Event()
        self.worker = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.stop_event.set()
        win32event.SetEvent(self.stop_handle)

    def SvcDoRun(self):
        load_service_environment(DEFAULT_CONFIG_PATH)
        configure_logging(DEFAULT_LOG_PATH)
        servicemanager.LogInfoMsg("FANOS Sensor Service started")
        self.worker = SensorServiceWorker(self.stop_event)
        try:
            self.worker.run()
        except Exception:
            logging.getLogger("fanos.sensor_service").exception(
                "FANOS Sensor Service stopped unexpectedly"
            )
            raise
        finally:
            servicemanager.LogInfoMsg("FANOS Sensor Service stopped")


if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(FANOSSensorService)
