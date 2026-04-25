# Grafana Installation Guide

## Install Grafana using Helm

### 1. Add Grafana Helm repository

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### 2. Install Grafana

```bash
# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.enabled=true \
  --set persistence.size=5Gi \
  --set adminPassword='admin123' \
  --set datasources."datasources.yaml".apiVersion=1 \
  --set datasources."datasources.yaml".datasources[0].name=Prometheus \
  --set datasources."datasources.yaml".datasources[0].type=prometheus \
  --set datasources."datasources.yaml".datasources[0].url=http://prometheus-server.monitoring.svc.cluster.local \
  --set datasources."datasources.yaml".datasources[0].access=proxy \
  --set datasources."datasources.yaml".datasources[0].isDefault=true
```

### 3. Access Grafana

```bash
# Get admin password (if auto-generated)
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward to access Grafana UI
kubectl port-forward svc/grafana 3000:80 -n monitoring

# Open http://localhost:3000 in your browser
# Default login: admin / admin123 (or the password you set)
```

---

## Import Dashboards

### Kubernetes Dashboard (ID: 315)

1. Go to **Dashboards > Import**
2. Enter dashboard ID: `315`
3. Select Prometheus datasource
4. Click **Import**

### Node Exporter Dashboard (ID: 1860)

1. Go to **Dashboards > Import**
2. Enter dashboard ID: `1860`
3. Select Prometheus datasource
4. Click **Import**

---

## Custom Application Dashboard

See `grafana-dashboard.json` for a custom dashboard that monitors:
- Request rate and latency
- Error rates
- Pod resource usage
- Database connection pool
- Redis cache hit/miss ratio
