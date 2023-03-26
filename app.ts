import express from 'express';
import * as minio from 'minio';

const app = express();

const bucketName = 'example-bucket'

let minioClient: minio.Client;

const init = async () => {

  // STORAGE_ENDPOINT, STORAGE_PORT, STORAGE_USER, STORAGE_PASSWORD, STORAGE_USE_SSL are set by Zeabur
  // Once you deploy a MinIO service in the same project with this app,
  // Zeabur will automatically set these environment variables for you.

  let endPoint = process.env.STORAGE_ENDPOINT
  if (!endPoint) {
    console.info('STORAGE_ENDPOINT is not set. Did you deploy a MinIO service?')
    console.info('If you are running this app locally, you can get the endpoint from the "domain" tab of MinIO service in the Zeabur dashboard.')
    process.exit(1)
  }

  let portStr = process.env.STORAGE_PORT
  if (!portStr) {
    console.info('STORAGE_PORT is not set. Did you deploy a MinIO service?')
    console.info('If you are running this app locally, you can get the port from the "domain" tab of MinIO service in the Zeabur dashboard.')
    process.exit(1)
  }
  const port = parseInt(portStr)

  const accessKey = process.env.STORAGE_USER
  if (!accessKey) {
    console.info('STORAGE_USER is not set. Did you deploy a MinIO service?')
    console.info('If you are running this app locally, you can get the access key from the "connect" tab of MinIO service in the Zeabur dashboard.')
    process.exit(1)
  }

  const secretKey = process.env.STORAGE_PASSWORD
  if (!secretKey) {
    console.info('STORAGE_PASSWORD is not set. Did you deploy a MinIO service?')
    console.info('If you are running this app locally, you can get the secret key from the "connect" tab of MinIO service in the Zeabur dashboard.')
    process.exit(1)
  }

  const useSSLStr = process.env.STORAGE_USE_SSL
  if(useSSLStr === undefined) {
    console.info('STORAGE_USE_SSL is not set. Did you deploy a MinIO service?')
    console.info('If you are running this app locally, you can get the useSSL value from the "connect" tab of MinIO service in the Zeabur dashboard.')
    process.exit(1)
  }
  const useSSL = useSSLStr === 'true'

  // create a MinIO client with credentials from Zeabur
  console.info('Connecting to MinIO storage...')
  minioClient = new minio.Client({endPoint, accessKey, secretKey, port, useSSL})
  console.info('Connected!')

  // check if the bucket exists, if not, create it
  console.info('Checking if bucket exists...')
  const bucketExists = await minioClient.bucketExists(bucketName)
  if (!bucketExists) {
    console.info('Bucket does not exist, creating...')
    await minioClient.makeBucket(bucketName)
    console.info('Bucket created!')
    console.info('Setting bucket policy to allow all read...')
    const policyAllowAllRead = {
      Version: '2012-10-17',
      Id: 'allow-all-read',
      Statement: [
        {
          Action: ['s3:GetObject'],
          Effect: 'Allow',
          Principal: {
            AWS: ['*'],
          },
          Resource: ['arn:aws:s3:::' + bucketName +'/*'],
        },
      ],
    };
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policyAllowAllRead))
    console.info('Policy set!')
  } else {
    console.info('Bucket exists!')
  }
}

app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(`
  <html lang="en-US">
    <head>
      <title>Express MinIO example</title>
    </head>
    <body>
      <h1>Express MinIO example</h1>
      <p>Run following bash command to create a text file:</p>
      <pre>echo "Hello World" > hello.txt</pre>
      <p>Then, run following curl command to upload the file to MinIO storage.</p>
      <pre>curl -X POST -T test.txt https://minio-express-example.zeabur.app/upload</pre> 
    </body>
  </html>
  `)
})

app.post('/upload', async (req, res) => {
  const randomFileName = Math.random().toString(36).substring(7)
  await minioClient.putObject(bucketName, randomFileName, req)
  res.end('https://minio-example.zeabur.app/' + bucketName + '/' + randomFileName)
})


const main = async () => {
  await init();
  app.listen(process.env.PORT || 3000 , async () => {
    console.log('Server started on port ' + (process.env.PORT || 3000))
  });
}

main();
