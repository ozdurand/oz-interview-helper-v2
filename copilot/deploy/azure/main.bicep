// Copilot API on Azure Container Apps (consumption, scales to zero).
//
// Creates, in the resource group it is deployed to:
//   <name>-logs   Log Analytics workspace (30-day retention, 1 GB/day cap) for the app's logs
//   <storage>     Storage account + "copilot-data" file share, mounted at /data — keeps the
//                 latest export the site sent, and the embedding cache, across restarts
//   <name>-env    Container Apps environment (Consumption workload profile)
//   <name>        the container app: HTTPS ingress, sign-in token kept as a secret,
//                 0–1 replicas (one replica on purpose: the index lives in memory, and
//                 /ingest must rebuild the same copy that answers /search)
//
// deploy.sh (same folder) runs this for you; see copilot/README.md.

@description('Container app name; the other resources are named after it.')
@minLength(2)
@maxLength(32)
param name string = 'oz-copilot'

@description('Azure region. Defaults to the resource group\'s region.')
param location string = resourceGroup().location

@description('Container image. deploy.sh passes the exact digest of the latest GitHub build.')
param image string = 'ghcr.io/ozdurand/oz-copilot:latest'

@description('Sign-in token for the API (AUTH_MODE=token). 24+ characters.')
@secure()
@minLength(24)
param copilotToken string

@description('Comma list of web origins allowed to call the API from a browser.')
param allowedOrigins string = 'https://ozdurand.github.io'

@description('0 = scale to zero when idle (free tier friendly; first request after idle waits a few seconds). 1 = always warm.')
@minValue(0)
@maxValue(1)
param minReplicas int = 0

@description('Dense retrieval: none, azure (Azure OpenAI) or openai.')
@allowed(['none', 'azure', 'openai'])
param embeddings string = 'none'

@description('Azure OpenAI endpoint, e.g. https://my-resource.openai.azure.com (embeddings = azure).')
param azureOpenAiEndpoint string = ''

@description('Azure OpenAI embeddings deployment name (embeddings = azure).')
param azureOpenAiDeployment string = ''

@description('OpenAI embeddings model (embeddings = openai).')
param openAiModel string = 'text-embedding-3-large'

@description('API key for the embeddings provider. Stored as a container app secret.')
@secure()
param embeddingsKey string = ''

@description('Only if the image is private: registry user name (e.g. your GitHub user name).')
param registryUsername string = ''

@description('Only if the image is private: a token that can read it (GitHub: a classic PAT with read:packages).')
@secure()
param registryPassword string = ''

var tags = { app: 'oz-copilot' }
var storageName = take('${toLower(replace(name, '-', ''))}${uniqueString(resourceGroup().id, name)}', 24)
var registryServer = split(image, '/')[0]
var useEmbeddings = embeddings != 'none' && !empty(embeddingsKey)

var baseSecrets = [
  { name: 'copilot-token', value: copilotToken }
]
var embeddingSecrets = useEmbeddings ? [{ name: 'embeddings-key', value: embeddingsKey }] : []
var registrySecrets = empty(registryPassword) ? [] : [{ name: 'registry-password', value: registryPassword }]

var baseEnv = [
  { name: 'AUTH_MODE', value: 'token' }
  { name: 'COPILOT_TOKEN', secretRef: 'copilot-token' }
  { name: 'ALLOWED_ORIGINS', value: allowedOrigins }
  { name: 'DATA_DIR', value: '/data' }
]
var azureEnv = [
  { name: 'EMBEDDINGS', value: 'azure' }
  { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAiEndpoint }
  { name: 'AZURE_OPENAI_EMBED_DEPLOYMENT', value: azureOpenAiDeployment }
  { name: 'AZURE_OPENAI_API_KEY', secretRef: 'embeddings-key' }
]
var openAiEnv = [
  { name: 'EMBEDDINGS', value: 'openai' }
  { name: 'OPENAI_EMBED_MODEL', value: openAiModel }
  { name: 'OPENAI_API_KEY', secretRef: 'embeddings-key' }
]
var embeddingEnv = !useEmbeddings ? [] : (embeddings == 'azure' ? azureEnv : openAiEnv)

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${name}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 }
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true // Container Apps mounts Azure Files (SMB) with the account key
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource share 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  parent: fileService
  name: 'copilot-data'
  properties: {
    shareQuota: 1 // GiB; the export is a few hundred KB, the embedding cache a few MB
    accessTier: 'TransactionOptimized'
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${name}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
    workloadProfiles: [
      { name: 'Consumption', workloadProfileType: 'Consumption' }
    ]
  }
}

resource envStorage 'Microsoft.App/managedEnvironments/storages@2024-03-01' = {
  parent: env
  name: 'copilotdata'
  properties: {
    azureFile: {
      accountName: storage.name
      accountKey: storage.listKeys().keys[0].value
      shareName: share.name
      accessMode: 'ReadWrite'
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    environmentId: env.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
      }
      secrets: concat(baseSecrets, embeddingSecrets, registrySecrets)
      registries: empty(registryPassword) ? [] : [
        { server: registryServer, username: registryUsername, passwordSecretRef: 'registry-password' }
      ]
    }
    template: {
      containers: [
        {
          name: 'copilot'
          image: image
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: concat(baseEnv, embeddingEnv)
          volumeMounts: [
            { volumeName: 'data', mountPath: '/data' }
          ]
          probes: [
            {
              // first start can embed every entry when embeddings are on: allow ~2 minutes
              type: 'Startup'
              httpGet: { path: '/health', port: 8000 }
              initialDelaySeconds: 2
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 10
            }
            {
              type: 'Liveness'
              httpGet: { path: '/health', port: 8000 }
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      volumes: [
        {
          name: 'data'
          storageType: 'AzureFile'
          storageName: envStorage.name
          // the image runs as uid/gid 1000 (see the Dockerfile)
          mountOptions: 'uid=1000,gid=1000,dir_mode=0750,file_mode=0640,nobrl'
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: 1
        rules: [
          { name: 'http', http: { metadata: { concurrentRequests: '30' } } }
        ]
      }
    }
  }
}

@description('The API address to paste into the site\'s "Send to copilot".')
output url string = 'https://${app.properties.configuration.ingress.fqdn}'
output appName string = app.name
output storageAccount string = storage.name
