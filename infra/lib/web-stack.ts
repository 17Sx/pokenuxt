import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from 'aws-cdk-lib'
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HttpVersion,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { Policy, PolicyStatement, User } from 'aws-cdk-lib/aws-iam'
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import type { Construct } from 'constructs'

export interface WebStackProps extends StackProps {
  /** The IAM user CI deploys with: it uploads the site and invalidates the cache. */
  ciUserName: string
}

/** The generated front: a private S3 bucket served by CloudFront. */
export class WebStack extends Stack {
  readonly url: string

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props)

    // Only CloudFront reads it, through origin access control.
    const bucket = new Bucket(this, 'Site', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // nuxt generate writes /pokemon/pikachu/index.html: S3 doesn't add the
    // index.html on its own, so this does, before CloudFront asks S3.
    const indexes = new Function(this, 'DirectoryIndex', {
      runtime: FunctionRuntime.JS_2_0,
      code: FunctionCode.fromInline(`
function handler(event) {
  var request = event.request
  var uri = request.uri
  if (uri.endsWith('/')) request.uri = uri + 'index.html'
  else if (!uri.split('/').pop().includes('.')) request.uri = uri + '/index.html'
  return request
}`),
    })

    const distribution = new Distribution(this, 'Distribution', {
      comment: 'PokéNuxt',
      defaultRootObject: 'index.html',
      httpVersion: HttpVersion.HTTP2_AND_3,
      // North America and Europe only: the cheapest edge locations.
      priceClass: PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [
          { function: indexes, eventType: FunctionEventType.VIEWER_REQUEST },
        ],
      },
      // S3 answers 403 for a missing key, since CloudFront can't list the
      // bucket. Both go to Nuxt's 404 page, which also starts the app, so
      // client-side routes like /pokemon/25 still work.
      errorResponses: [403, 404].map((httpStatus) => ({
        httpStatus,
        responseHttpStatus: 404,
        responsePagePath: '/404.html',
        ttl: Duration.minutes(1),
      })),
    })

    this.url = `https://${distribution.distributionDomainName}`

    // What CI needs to publish a new version, and nothing more.
    new Policy(this, 'CiPublish', {
      users: [User.fromUserName(this, 'CiUser', props.ciUserName)],
      statements: [
        new PolicyStatement({
          actions: ['s3:ListBucket'],
          resources: [bucket.bucketArn],
        }),
        new PolicyStatement({
          actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
          resources: [bucket.arnForObjects('*')],
        }),
        new PolicyStatement({
          actions: [
            'cloudfront:CreateInvalidation',
            'cloudfront:GetInvalidation',
          ],
          resources: [
            `arn:${this.partition}:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
          ],
        }),
      ],
    })

    new CfnOutput(this, 'BucketName', { value: bucket.bucketName })
    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    })
    new CfnOutput(this, 'SiteUrl', { value: this.url })
  }
}
