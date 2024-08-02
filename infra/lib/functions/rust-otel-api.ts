import { Duration, Tags } from 'aws-cdk-lib'
import {
    IFunction,
    Architecture,
    FunctionUrlAuthType,
    LayerVersion,
} from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import { FuncProps } from '../../config/infra-options'
import { RustFunction } from 'cargo-lambda-cdk'
import { CfnOutput } from 'aws-cdk-lib'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'

export class RustOtelFunctionConstruct extends Construct {
    private _webHandler: IFunction

    get WebHandlerFunc(): IFunction {
        return this._webHandler
    }

    constructor(scope: Construct, id: string, props: FuncProps) {
        super(scope, id)
        const layer = LayerVersion.fromLayerVersionArn(
            scope,
            'DatadogExtension',
            'arn:aws:lambda:us-west-2:464622532012:layer:Datadog-Extension-ARM:62'
        )

        const parameter = StringParameter.fromStringParameterName(
            scope,
            'DDApiKey',
            '/core-infra/dd-api-key'
        )

        this._webHandler = new RustFunction(scope, `CorsLambdaFunction`, {
            manifestPath: './web-handler',
            functionName: `rust-otel-datadog`,
            timeout: Duration.seconds(10),
            memorySize: 256,
            architecture: Architecture.ARM_64,
            environment: {
                DD_ENV: 'demo',
                DD_EXTENSION_VERSION: 'next',
                DD_SITE: process.env.DD_SITE!,
                DD_API_KEY: parameter.stringValue,
                RUST_LOG: 'info',
            },
            layers: [layer],
        })

        Tags.of(this._webHandler).add('version', props.version)

        const fnUrl = this._webHandler.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
        })

        new CfnOutput(this, 'TheUrl', {
            value: fnUrl.url,
        })
    }
}
