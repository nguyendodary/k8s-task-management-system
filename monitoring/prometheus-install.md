# Prometheus Installation Guide

## Install Prometheus using Helm

### 1. Add Prometheus Helm repository

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 2. Install Prometheus

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Install Prometheus with default configuration
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --set server.persistentVolume.size=10Gi \
  --set server.retention=30d

# Or install with custom values file
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  -f prometheus-values.yaml
```

### 3. Access Prometheus

```bash
# Port forward to access Prometheus UI
kubectl port-forward svc/prometheus-server 9090:80 -n monitoring

# Open http://localhost:9090 in your browser
```

### 4. Verify targets

Navigate to **Status > Targets** to verify all endpoints are being scraped.

---

## ServiceMonitor for Application Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: task-management-metrics
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: backend
  namespaceSelector:
    matchNames:
    - task-management
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

---

## Prometheus Values (prometheus-values.yaml)

```yaml
server:
  persistentVolume:
    enabled: true
    size: 10Gi
  retention: "30d"
  resources:
    requests:
      memory: "512Mi"
      cpu: "200m"
    limits:
      memory: "1Gi"
      cpu: "500m"

alertmanager:
  enabled: true
  persistentVolume:
    enabled: true
    size: 5Gi

nodeExporter:
  enabled: true

kubeStateMetrics:
  enabled: true

pushgateway:
  enabled: false
```
