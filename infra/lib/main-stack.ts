import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { RustOtelFunctionConstruct } from './functions/rust-otel-api'

export class MainStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props)
        const version = new Date().toISOString()
        new RustOtelFunctionConstruct(this, 'RustOtelFunctionConstruct', {
            version: version,
        })
    }
}
