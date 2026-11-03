import { App } from 'aws-cdk-lib'
import { ApiStack } from '../lib/api-stack'
import { CI_USER_NAME, CiUserStack } from '../lib/ci-user-stack'
import { WebStack } from '../lib/web-stack'

const app = new App()

// A project in the new AWS experience can only create resources in its own
// Region. CloudFront is global, and its API lives in us-east-1, which the
// project allows for it.
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'eu-north-1' }

// Deployed once by hand.
new CiUserStack(app, 'PokenuxtCiUser', { env })

// The generated front, on S3 and CloudFront.
const web = new WebStack(app, 'PokenuxtWeb', { env, ciUserName: CI_USER_NAME })

// Sites allowed to call the API from the browser: the local front, the
// CloudFront one, and another origin if one is passed as -c webOrigin=https://….
const webOrigin = app.node.tryGetContext('webOrigin') as string | undefined

new ApiStack(app, 'PokenuxtApi', {
  env,
  allowedOrigins: [
    'http://localhost:3000',
    web.url,
    ...(webOrigin ? [webOrigin.replace(/\/+$/, '')] : []),
  ],
  databaseUrlParameter: '/pokenuxt/database-url',
})
