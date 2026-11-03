import { fileURLToPath } from 'node:url'
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from 'aws-cdk-lib'
import {
  CorsHttpMethod,
  HttpApi,
  HttpStage,
} from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))

export interface ApiStackProps extends StackProps {
  /** Sites whose pages call the API from the browser. */
  allowedOrigins: string[]
  /** SSM SecureString holding Supabase's transaction pooler URL. */
  databaseUrlParameter: string
}

/** The Hono API in api/ on Lambda, behind an API Gateway HTTP API. */
export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const databaseUrl = StringParameter.fromSecureStringParameterAttributes(
      this,
      'DatabaseUrl',
      { parameterName: props.databaseUrlParameter },
    )

    const fn = new NodejsFunction(this, 'Function', {
      entry: `${ROOT}api/src/lambda.ts`,
      projectRoot: ROOT,
      depsLockFilePath: `${ROOT}bun.lock`,
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      // Dithering is CPU-bound, and Lambda gives CPU in proportion to memory.
      memorySize: 1024,
      timeout: Duration.seconds(15),
      logGroup: new LogGroup(this, 'Logs', {
        retention: RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--enable-source-maps',
        DATABASE_URL_PARAMETER: props.databaseUrlParameter,
        CORS_ORIGINS: props.allowedOrigins.join(','),
      },
      bundling: {
        format: OutputFormat.ESM,
        target: 'node22',
        minify: true,
        sourceMap: true,
        // The Lambda runtime provides the AWS SDK.
        externalModules: ['@aws-sdk/*'],
        // pngjs is CommonJS and requires Node built-ins.
        banner:
          "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
      },
    })
    databaseUrl.grantRead(fn)

    const api = new HttpApi(this, 'HttpApi', {
      apiName: 'pokenuxt-api',
      description: 'PokéNuxt: PokéAPI proxy, dithered sprites and the wishlist',
      createDefaultStage: false,
      defaultIntegration: new HttpLambdaIntegration('Lambda', fn),
      // The browser calls the API directly: only the front's origins, and no
      // credentials since the API uses no cookies.
      corsPreflight: {
        allowOrigins: props.allowedOrigins,
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.DELETE,
        ],
        allowHeaders: ['content-type', 'accept-language'],
        maxAge: Duration.hours(1),
      },
    })

    // Caps the request rate, so a flood of calls can't run up the bill.
    new HttpStage(this, 'DefaultStage', {
      httpApi: api,
      stageName: '$default',
      autoDeploy: true,
      throttle: { rateLimit: 25, burstLimit: 50 },
    })

    new CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint })
    new CfnOutput(this, 'FunctionName', { value: fn.functionName })
  }
}
