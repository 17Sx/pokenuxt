import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib'
import { PolicyStatement, User } from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'

/**
 * The IAM user GitHub Actions deploys with. Projects in the new AWS
 * experience can't create OIDC providers, so CI uses this user's access key.
 * It can only assume the CDK bootstrap roles of this account and Region, and
 * those do the actual deploying.
 */
export class CiUserStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props)

    const user = new User(this, 'GithubDeploy', {
      userName: 'pokenuxt-github-deploy',
    })
    user.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-*-role-${this.account}-${this.region}`,
        ],
      }),
    )

    new CfnOutput(this, 'UserName', { value: user.userName })
  }
}
