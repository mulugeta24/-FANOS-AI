FROM jasonish/suricata:7.0.10

USER root

COPY config/suricata.yaml /etc/suricata/suricata.yaml
COPY config/classification.config /etc/suricata/classification.config
COPY rules/local.rules /var/lib/suricata/rules/local.rules

ENTRYPOINT ["suricata"]
