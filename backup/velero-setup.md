# Velero Backup Setup Guide

## Prerequisites

- Kubernetes cluster (1.18+)
- `kubectl` configured
- S3-compatible storage (AWS S3, MinIO, etc.)
- Velero CLI installed

## 1. Install Velero CLI

### macOS
```bash
brew install velero
```

### Linux
```bash
wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
tar -xzf velero-v1.12.0-linux-amd64.tar.gz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/
```

### Windows
```powershell
# Download from GitHub releases
# https://github.com/vmware-tanzu/velero/releases
```

## 2. Create S3 Bucket and Credentials

### AWS S3
```bash
# Create bucket
aws s3 mb s3://task-management-backups --region us-east-1

# Create IAM user for Velero
aws iam create-user --user-name velero

# Create policy file
cat > velero-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:AbortMultipartUpload"
            ],
            "Resource": [
                "arn:aws:s3:::task-management-backups",
                "arn:aws:s3:::task-management-backups/*"
            ]
        }
    ]
}
EOF

# Attach policy
aws iam put-user-policy \
  --user-name velero \
  --policy-name velero-s3-access \
  --policy-document file://velero-policy.json

# Create access keys
aws iam create-access-key --user-name velero
```

## 3. Install Velero Server

```bash
# Create credentials file
cat > credentials-velero <<EOF
[default]
aws_access_key_id=<AWS_ACCESS_KEY_ID>
aws_secret_access_key=<AWS_SECRET_ACCESS_KEY>
EOF

# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket task-management-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero \
  --use-volume-snapshots=false \
  --use-node-agent
```

## 4. Verify Installation

```bash
# Check Velero pods
kubectl get pods -n velero

# Check backup storage location
velero backup-location get
```

## 5. Create Backup Schedule

```bash
# Daily backup at 2 AM
velero schedule create task-management-daily \
  --schedule="0 2 * * *" \
  --include-namespaces task-management \
  --ttl 720h0m0s \
  --storage-location default

# Weekly backup every Sunday at 3 AM
velero schedule create task-management-weekly \
  --schedule="0 3 * * 0" \
  --include-namespaces task-management \
  --ttl 2160h0m0s \
  --storage-location default
```

## 6. Example Backup Commands

### Manual Backup (On-Demand)
```bash
# Backup entire namespace
velero backup create task-management-manual-$(date +%Y%m%d-%H%M%S) \
  --include-namespaces task-management \
  --wait

# Backup with specific label selector
velero backup create task-management-labeled \
  --selector app=postgres \
  --include-namespaces task-management \
  --wait

# Backup with hooks (pre/post backup commands)
velero backup create task-management-with-hooks \
  --include-namespaces task-management \
  --hooks-enabled
```

### Describe Backup
```bash
velero backup describe task-management-manual-20240115-120000
```

### View Backup Logs
```bash
velero backup logs task-management-manual-20240115-120000
```

### List Backups
```bash
velero backup get
```

## 7. Restore from Backup

```bash
# List available backups
velero backup get

# Restore from backup
velero restore create --from-backup task-management-manual-20240115-120000 \
  --include-namespaces task-management \
  --wait

# Restore to different namespace
velero restore create --from-backup task-management-manual-20240115-120000 \
  --namespace-mappings task-management:task-management-restore
```

## 8. Backup with PV Snapshots (AWS EBS)

```bash
# Enable volume snapshots
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket task-management-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero \
  --use-volume-snapshots=true

# Create backup with PV snapshots
velero backup create task-management-with-pv \
  --include-namespaces task-management \
  --snapshot-volumes \
  --wait
```

## 9. Backup Resource YAML

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: task-management-backup
  namespace: velero
spec:
  includedNamespaces:
    - task-management
  includedResources:
    - deployments
    - services
    - configmaps
    - secrets
    - statefulsets
    - persistentvolumeclaims
    - ingresses
  excludedResources:
    - events
    - pods
  labelSelector:
    matchLabels:
      backup: "true"
  snapshotVolumes: true
  storageLocation: default
  ttl: 720h0m0s
  volumeSnapshotLocations:
    - aws-default
```

## 10. Schedule Resource YAML

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: task-management-daily
  namespace: velero
spec:
  schedule: 0 2 * * *
  template:
    includedNamespaces:
      - task-management
    snapshotVolumes: true
    ttl: 720h0m0s
    storageLocation: default
```

## 11. Cleanup Old Backups

```bash
# Delete specific backup
velero backup delete task-management-manual-20240115-120000 --confirm

# Delete expired backups
velero backup delete --all --confirm
```

## 12. Monitoring Backups

```bash
# Get backup status
kubectl get backups -n velero

# Check for backup failures
velero backup get | grep Failed

# View backup details
velero backup describe task-management-daily-20240115020000 --details
```

## Troubleshooting

### Common Issues

1. **Backup stuck in "InProgress"**
   ```bash
   # Check Velero logs
   kubectl logs -n velero deployment/velero
   ```

2. **Volume snapshot errors**
   ```bash
   # Verify volume snapshot class exists
   kubectl get volumesnapshotclass
   ```

3. **Restic backup errors**
   ```bash
   # Check Restic pods
   kubectl get pods -n velero -l name=restic
   ```
