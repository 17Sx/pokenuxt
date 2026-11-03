import { App } from 'aws-cdk-lib'
import { ApiStack } from '../lib/api-stack'
import { CiUserStack } from '../lib/ci-user-stack'

const app = new App()

// Sites allowed to call the API from the browser: the local front, plus the
// production front's origin, passed by CI as -c webOrigin=https://….
const webOrigin = app.node.tryGetContext('webOrigin') as string | undefined
const allowedOrigins = [
  'http://localhost:3000',
  ...(webOrigin ? [webOrigin.replace(/\/+$/, '')] : []),
]

// A project in the new AWS experience can only create resources in its own
// Region.
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'eu-north-1' }

new ApiStack(app, 'PokenuxtApi', {
  env,
  allowedOrigins,
  databaseUrlParameter: '/pokenuxt/database-url',
})

// Deployed once by hand: CI deploys PokenuxtApi only.
new CiUserStack(app, 'PokenuxtCiUser', { env })
