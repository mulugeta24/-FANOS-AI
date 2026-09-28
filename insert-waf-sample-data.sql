INSERT INTO security_events (severity, attack_type, source_ip, target, ai_confidence, risk_score, status, sensor_source, raw_payload, created_at)
VALUES
('CRITICAL', 'SQL Injection', '203.0.113.42', 'example.com/search', 85.5, 95, 'BLOCKED', 'waf', '{"rule_id": "942100", "msg": "SQL Injection Attack Detected"}', NOW() - INTERVAL '5 minutes'),
('HIGH', 'XSS', '192.0.2.15', 'example.com/login', 80.2, 85, 'BLOCKED', 'waf', '{"rule_id": "941100", "msg": "XSS Attack Detected"}', NOW() - INTERVAL '10 minutes'),
('HIGH', 'Command Injection', '198.51.100.23', 'example.com/admin.php', 82.7, 88, 'BLOCKED', 'waf', '{"rule_id": "933150", "msg": "PHP Injection Attack"}', NOW() - INTERVAL '15 minutes'),
('CRITICAL', 'Path Traversal', '203.0.113.87', 'example.com/etc/passwd', 90.1, 92, 'BLOCKED', 'waf', '{"rule_id": "930110", "msg": "Path Traversal Attack"}', NOW() - INTERVAL '20 minutes'),
('CRITICAL', 'SQL Injection', '198.51.100.91', 'example.com/search', 88.3, 93, 'BLOCKED', 'waf', '{"rule_id": "9500001", "msg": "FANOS Custom SQL Injection"}', NOW() - INTERVAL '25 minutes'),
('HIGH', 'XSS', '192.0.2.44', 'example.com/search', 81.5, 86, 'BLOCKED', 'waf', '{"rule_id": "941110", "msg": "XSS Filter - Script Tag"}', NOW() - INTERVAL '30 minutes'),
('MEDIUM', 'Protocol Violation', '203.0.113.100', 'example.com/api/users', 65.0, 60, 'MONITORED', 'waf', '{"rule_id": "920100", "msg": "Invalid HTTP Request"}', NOW() - INTERVAL '35 minutes'),
('CRITICAL', 'Command Injection', '198.51.100.200', 'example.com/upload', 89.8, 94, 'BLOCKED', 'waf', '{"rule_id": "933140", "msg": "Remote Command Execution"}', NOW() - INTERVAL '40 minutes'),
('HIGH', 'SQL Injection', '192.0.2.99', 'example.com/api/data', 83.2, 87, 'BLOCKED', 'waf', '{"rule_id": "942190", "msg": "UNION SELECT injection"}', NOW() - INTERVAL '45 minutes'),
('MEDIUM', 'Rate Limiting', '198.51.100.150', 'example.com/api/login', 70.0, 65, 'MONITORED', 'waf', '{"rule_id": "920430", "msg": "Content-Length Anomaly"}', NOW() - INTERVAL '50 minutes');
